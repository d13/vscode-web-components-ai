import type { Disposable, Event } from 'vscode';

/**
 * Common server information interface that both built-in and CLI providers implement
 */
export interface McpServerInfo {
  hostName: string;
  port: number;
  url: string;
  mcpUrl: string;
  sseUrl: string;
}

/**
 * Unified interface for MCP providers (built-in and CLI-based)
 */
export interface IMcpProvider extends Disposable {
  /**
   * Event fired when the HTTP server state changes (started/stopped)
   */
  readonly onDidChangeHttpServerState: Event<void>;

  /**
   * Get current server information if running
   */
  getServerInfo(): McpServerInfo | undefined;

  /**
   * Start the MCP server
   * @param silent - Whether to suppress user notifications
   * @returns Promise that resolves to true if started successfully
   */
  start(silent?: boolean): Promise<boolean>;

  /**
   * Stop the MCP server
   * @returns Promise that resolves when server is stopped
   */
  stop(): Promise<void>;
}

/**
 * Provider type for distinguishing between implementations
 */
export type McpProviderType = 'builtin' | 'cli';

/**
 * Configuration for creating MCP providers
 */
export interface McpProviderConfig {
  type: McpProviderType;
  workspaceRoot?: string;
}
