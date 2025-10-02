import type { Disposable, Event } from 'vscode';
import { EventEmitter } from 'vscode';
import { Logger } from '../system/logger';
import type { IMcpProvider, McpServerInfo } from './types';

/**
 * Stub MCP provider used when CLI is not available
 * This provider doesn't actually start a server but provides error messages
 */
export class StubMcpProvider implements IMcpProvider {
  private _onDidChangeHttpServerState = new EventEmitter<void>();
  private _disposables: Disposable[] = [];

  constructor(private readonly _error: unknown) {
    this._disposables.push(this._onDidChangeHttpServerState);
  }

  get onDidChangeHttpServerState(): Event<void> {
    return this._onDidChangeHttpServerState.event;
  }

  getServerInfo(): McpServerInfo | undefined {
    return undefined;
  }

  async start(silent = false): Promise<boolean> {
    const errorMessage = this._error instanceof Error ? this._error.message : String(this._error);
    Logger.error(this._error, 'Cannot start MCP server: CLI is not available');
    
    if (!silent) {
      // The factory already shows the notification, so we don't need to show another one
      Logger.warn('MCP server cannot be started because CLI is not available');
    }
    
    return false;
  }

  async stop(): Promise<void> {
    // Nothing to stop
    Logger.log('Stub MCP provider stop called (no-op)');
  }

  dispose(): void {
    this._disposables.forEach(d => d.dispose());
    this._disposables = [];
  }
}
