import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'vscode';
import { Logger } from '../system/logger';
import { configuration } from '../system/configuration';
import { executeCommand } from '../system/command';
import type { Disposable, Event } from 'vscode';
import type { IMcpProvider, McpServerInfo } from './types';
import type { Container } from '../container';

export interface CliMcpServerInfo {
  process: ChildProcess;
  host: string;
  port: number;
  url: string;
  mcpUrl: string;
  sseUrl: string;
}

export class CliMcpProvider implements IMcpProvider {
  private _serverProcess: ChildProcess | undefined;
  private _serverInfo: CliMcpServerInfo | undefined;
  private _disposables: Disposable[] = [];
  private _onDidChangeHttpServerState = new EventEmitter<void>();
  private _healthCheckInterval: NodeJS.Timeout | undefined;
  private _restartAttempts = 0;
  private _maxRestartAttempts = 3;
  private _isRestarting = false;

  get onDidChangeHttpServerState(): Event<void> {
    return this._onDidChangeHttpServerState.event;
  }

  constructor(
    private readonly _workspaceRoot: string,
    private readonly _container?: Container,
  ) {
    this._disposables.push(
      this._onDidChangeHttpServerState,
      configuration.onDidChange(async e => {
        if (e.affectsConfiguration('mcp.port') || e.affectsConfiguration('mcp.host')) {
          if (this._serverInfo) {
            const currentPort = configuration.get('mcp.port');
            const currentHost = configuration.get('mcp.host');

            if (this._serverInfo.port === currentPort && this._serverInfo.host === currentHost) {
              return; // No change needed
            }

            await this.stop();
          }

          void this.start(true);
        }
      }),
    );

    // Auto-start the server like the built-in provider
    if (this._container) {
      const firstMcpStart = this._container.storage.get('firstMcpStartRan') ?? false;
      void this.start(firstMcpStart).then(() => {
        if (!firstMcpStart) {
          void this._container!.storage.store('firstMcpStartRan', true);
        }
      });
    }
  }

  async start(silent = false): Promise<boolean> {
    if (this._serverProcess) {
      return true; // Already running
    }

    Logger.log('Starting MCP server using CLI...');

    // Get configuration from VS Code settings
    const config = vscode.workspace.getConfiguration('wcai');
    const host = config.get<string>('mcp.host', '127.0.0.1');
    const port = config.get<number>('mcp.port', 0);
    const logLevel = config.get<string>('outputLevel', 'warn');

    // Build CLI arguments
    const args = [
      'start',
      '--host',
      host,
      '--port',
      port.toString(),
      '--transport',
      'http',
      '--log-level',
      logLevel,
      '--working-dir',
      this._workspaceRoot,
    ];

    Logger.debug(`Spawning CLI process: wcai ${args.join(' ')}`);

    // Spawn the CLI process
    this._serverProcess = spawn('wcai', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: this._workspaceRoot,
      env: {
        ...process.env,
        WCAI_LOG_LEVEL: logLevel,
      },
    });

    // Set up process event handlers
    this._serverProcess.on('error', error => {
      Logger.error(error, 'CLI process error');
      this.cleanup();
    });

    this._serverProcess.on('exit', (code, signal) => {
      Logger.log(`CLI process exited with code ${code}, signal ${signal}`);
      this.cleanup();
    });

    // Capture stdout for server info
    let stdoutData = '';
    this._serverProcess.stdout?.on('data', data => {
      const output = data.toString();
      stdoutData += output;
      Logger.debug('CLI stdout:', output.trim());
    });

    // Capture stderr for errors
    this._serverProcess.stderr?.on('data', data => {
      const output = data.toString();
      Logger.warn('CLI stderr:', output.trim());
    });

    try {
      // Wait for server to start and extract connection info
      const serverInfo = await this.waitForServerStart(stdoutData);
      this._serverInfo = serverInfo;

      Logger.log(`MCP server started successfully at ${serverInfo.mcpUrl}`);

      // Store host and port configuration if enabled
      if (configuration.get('mcp.storeHostAndPortOnStart')) {
        const configPort = configuration.get('mcp.port');
        const configHost = configuration.get('mcp.host');

        if (serverInfo.port !== configPort) {
          configuration.updateEffective('mcp.port', serverInfo.port);
        }
        if (serverInfo.host !== configHost) {
          configuration.updateEffective('mcp.host', serverInfo.host);
        }
      }

      if (!silent) {
        void executeCommand('wcai.mcp.showInformation');
      }

      // Fire the state change event
      this._onDidChangeHttpServerState.fire();

      // Start health monitoring
      this.startHealthMonitoring();

      // Reset restart attempts on successful start
      this._restartAttempts = 0;

      return true;
    } catch (error) {
      Logger.error(error, 'Failed to start CLI MCP server');
      this.cleanup();
      return false;
    }
  }

  async stop(): Promise<void> {
    if (!this._serverProcess) {
      return;
    }

    Logger.log('Stopping MCP server...');

    // Stop health monitoring first
    this.stopHealthMonitoring();

    // Try graceful shutdown first
    this._serverProcess.kill('SIGTERM');

    // Wait for process to exit
    await new Promise<void>(resolve => {
      if (!this._serverProcess) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        // Force kill if graceful shutdown takes too long
        if (this._serverProcess && !this._serverProcess.killed) {
          Logger.warn('Force killing MCP server process');
          this._serverProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      this._serverProcess.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    this.cleanup();
    this._onDidChangeHttpServerState.fire();
    Logger.log('MCP server stopped');
  }

  getServerInfo(): McpServerInfo | undefined {
    if (!this._serverInfo) return undefined;

    return {
      hostName: this._serverInfo.host,
      port: this._serverInfo.port,
      url: this._serverInfo.url,
      mcpUrl: this._serverInfo.mcpUrl,
      sseUrl: this._serverInfo.sseUrl,
    };
  }

  isRunning(): boolean {
    return this._serverProcess !== undefined && !this._serverProcess.killed;
  }

  private async waitForServerStart(initialOutput: string): Promise<CliMcpServerInfo> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for MCP server to start'));
      }, 30000); // 30 second timeout

      let output = initialOutput;

      const checkOutput = () => {
        // Look for server startup messages in the output
        const httpMatch = output.match(/HTTP endpoint: (http:\/\/[^:]+:(\d+)\/mcp)/);
        const sseMatch = output.match(/SSE endpoint: (http:\/\/[^:]+:\d+\/sse)/);

        if (httpMatch && sseMatch) {
          clearTimeout(timeout);

          const mcpUrl = httpMatch[1];
          const port = parseInt(httpMatch[2], 10);
          const host = mcpUrl.split('://')[1].split(':')[0];
          const baseUrl = `http://${host}:${port}`;
          const sseUrl = sseMatch[1];

          resolve({
            process: this._serverProcess!,
            host,
            port,
            url: baseUrl,
            mcpUrl,
            sseUrl,
          });
        }
      };

      // Check initial output
      checkOutput();

      // Continue monitoring stdout
      if (this._serverProcess?.stdout) {
        this._serverProcess.stdout.on('data', data => {
          output += data.toString();
          checkOutput();
        });
      }

      // Handle process errors
      this._serverProcess?.on('error', error => {
        clearTimeout(timeout);
        reject(error);
      });

      this._serverProcess?.on('exit', code => {
        clearTimeout(timeout);
        reject(new Error(`CLI process exited with code ${code} before server started`));
      });
    });
  }

  private cleanup(): void {
    this.stopHealthMonitoring();
    this._serverProcess = undefined;
    this._serverInfo = undefined;
    this._onDidChangeHttpServerState.fire();
  }

  private startHealthMonitoring(): void {
    this.stopHealthMonitoring();

    // Check server health every 30 seconds
    this._healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  private stopHealthMonitoring(): void {
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = undefined;
    }
  }

  private async performHealthCheck(): Promise<void> {
    if (!this._serverProcess || !this._serverInfo) {
      return;
    }

    // Check if process is still running
    if (this._serverProcess.killed || this._serverProcess.exitCode !== null) {
      Logger.warn('CLI process has died, attempting restart');
      await this.handleProcessFailure();
      return;
    }

    // TODO: Add HTTP health check to verify server is responding
    // For now, just check process status
  }

  private async handleProcessFailure(): Promise<void> {
    if (this._isRestarting) {
      return; // Already handling restart
    }

    this._isRestarting = true;
    this._restartAttempts++;

    if (this._restartAttempts > this._maxRestartAttempts) {
      Logger.error(new Error('Max restart attempts reached'), 'CLI MCP server failed to restart');

      if (this._container) {
        // Show error notification to user
        vscode.window
          .showErrorMessage(
            'WCAI CLI MCP server has failed and cannot be restarted. Consider switching to the built-in server.',
            'Switch to Built-in',
            'Retry',
          )
          .then(action => {
            if (action === 'Switch to Built-in') {
              void configuration.updateEffective('mcp.useCliServer', false);
              vscode.window.showInformationMessage(
                'Switched to built-in MCP server. Restart the extension to apply changes.',
              );
            } else if (action === 'Retry') {
              this._restartAttempts = 0;
              void this.start();
            }
          });
      }

      this._isRestarting = false;
      return;
    }

    Logger.log(`Attempting to restart CLI MCP server (attempt ${this._restartAttempts}/${this._maxRestartAttempts})`);

    try {
      await this.stop();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      await this.start(true); // Silent restart
      Logger.log('CLI MCP server restarted successfully');
    } catch (error) {
      Logger.error(error, 'Failed to restart CLI MCP server');
    }

    this._isRestarting = false;
  }

  dispose(): void {
    void this.stop();
    this._disposables.forEach(d => d.dispose());
  }
}

/**
 * Check if the CLI is available in the system PATH
 */
export async function checkCliAvailability(): Promise<boolean> {
  return new Promise(resolve => {
    const process = spawn('wcai', ['--version'], { stdio: 'pipe' });

    process.on('error', () => {
      resolve(false);
    });

    process.on('exit', code => {
      resolve(code === 0);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      process.kill();
      resolve(false);
    }, 5000);
  });
}

/**
 * Get the CLI version if available
 */
export async function getCliVersion(): Promise<string | undefined> {
  return new Promise(resolve => {
    const process = spawn('wcai', ['--version'], { stdio: 'pipe' });

    let output = '';
    process.stdout?.on('data', data => {
      output += data.toString();
    });

    process.on('error', () => {
      resolve(undefined);
    });

    process.on('exit', code => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        resolve(undefined);
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      process.kill();
      resolve(undefined);
    }, 5000);
  });
}
