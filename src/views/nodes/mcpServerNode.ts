import { TreeItem, TreeItemCollapsibleState, ThemeIcon, ThemeColor } from 'vscode';
import type { HttpTransportInfo } from '../../mcp/utils/transport';

/**
 * Represents the MCP server status in the tree view
 */
export class McpServerNode extends TreeItem {
  public readonly serverInfo: HttpTransportInfo | undefined;
  public readonly isRunning: boolean;

  constructor(serverInfo: HttpTransportInfo | undefined) {
    const isRunning = serverInfo !== undefined;
    const label = isRunning ? `MCP Server: ${serverInfo.url}` : 'MCP Server: Stopped';

    super(label, TreeItemCollapsibleState.None);

    this.serverInfo = serverInfo;
    this.isRunning = isRunning;

    // Set icon and styling based on server state
    if (isRunning) {
      this.iconPath = new ThemeIcon('server-process', new ThemeColor('debugIcon.startForeground'));
      this.contextValue = 'mcpServerRunning';
      this.tooltip = this.createRunningTooltip(serverInfo);
      this.description = 'Running';
    } else {
      this.iconPath = new ThemeIcon('server-process', new ThemeColor('debugIcon.disconnectForeground'));
      this.contextValue = 'mcpServerStopped';
      this.tooltip = 'MCP Server is not running';
      this.description = 'Stopped';
    }
  }

  private createRunningTooltip(serverInfo: HttpTransportInfo): string {
    return [
      `MCP Server running at ${serverInfo.url}`,
      `HTTP: ${serverInfo.mcpUrl}`,
      `SSE: ${serverInfo.sseUrl}`,
      '',
      'Click the copy inline action to copy the server configuration',
    ].join('\n');
  }
}
