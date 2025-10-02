import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { Logger } from '../system/logger';
import type { Disposable } from '../system/disposable';

export interface CliMcpServerInfo {
  process: ChildProcess;
  host: string;
  port: number;
  url: string;
  mcpUrl: string;
  sseUrl: string;
}

export class CliMcpProvider implements Disposable {
  private _serverProcess: ChildProcess | undefined;
  private _serverInfo: CliMcpServerInfo | undefined;
  private _disposables: Disposable[] = [];

  constructor(private readonly _workspaceRoot: string) {}

  async start(): Promise<CliMcpServerInfo> {
    if (this._serverProcess) {
      throw new Error('MCP server is already running');
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
      '--host', host,
      '--port', port.toString(),
      '--transport', 'http',
      '--log-level', logLevel,
      '--working-dir', this._workspaceRoot
    ];

    Logger.debug(`Spawning CLI process: wcai ${args.join(' ')}`);

    // Spawn the CLI process
    this._serverProcess = spawn('wcai', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: this._workspaceRoot,
      env: {
        ...process.env,
        WCAI_LOG_LEVEL: logLevel,
      }
    });

    // Set up process event handlers
    this._serverProcess.on('error', (error) => {
      Logger.error('CLI process error:', error);
      this.cleanup();
    });

    this._serverProcess.on('exit', (code, signal) => {
      Logger.log(`CLI process exited with code ${code}, signal ${signal}`);
      this.cleanup();
    });

    // Capture stdout for server info
    let stdoutData = '';
    this._serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      Logger.debug('CLI stdout:', output.trim());
    });

    // Capture stderr for errors
    this._serverProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      Logger.warn('CLI stderr:', output.trim());
    });

    // Wait for server to start and extract connection info
    const serverInfo = await this.waitForServerStart(stdoutData);
    this._serverInfo = serverInfo;

    Logger.log(`MCP server started successfully at ${serverInfo.mcpUrl}`);
    return serverInfo;
  }

  async stop(): Promise<void> {
    if (!this._serverProcess) {
      return;
    }

    Logger.log('Stopping MCP server...');

    // Try graceful shutdown first
    this._serverProcess.kill('SIGTERM');

    // Wait for process to exit
    await new Promise<void>((resolve) => {
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
    Logger.log('MCP server stopped');
  }

  getServerInfo(): CliMcpServerInfo | undefined {
    return this._serverInfo;
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
        this._serverProcess.stdout.on('data', (data) => {
          output += data.toString();
          checkOutput();
        });
      }

      // Handle process errors
      this._serverProcess?.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this._serverProcess?.on('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`CLI process exited with code ${code} before server started`));
      });
    });
  }

  private cleanup(): void {
    this._serverProcess = undefined;
    this._serverInfo = undefined;
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
  return new Promise((resolve) => {
    const process = spawn('wcai', ['--version'], { stdio: 'pipe' });
    
    process.on('error', () => {
      resolve(false);
    });
    
    process.on('exit', (code) => {
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
  return new Promise((resolve) => {
    const process = spawn('wcai', ['--version'], { stdio: 'pipe' });
    
    let output = '';
    process.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('error', () => {
      resolve(undefined);
    });
    
    process.on('exit', (code) => {
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
