import { env, window } from 'vscode';
import type { Container } from '../container';
import { command } from '../system/decorators/command';
import { McpServerNode } from '../views/nodes/mcpServerNode';
import { CommandBase } from './base';

@command()
export class CopyMcpServerConfigCommand extends CommandBase {
  constructor(container: Container) {
    super(container, 'wcai.views.cemList.copyMcpConfig');
  }

  async execute(item: McpServerNode) {
    if (!item || !(item instanceof McpServerNode) || !item.serverInfo) {
      window.showErrorMessage('MCP server is not running.');
      return;
    }

    try {
      const configString = JSON.stringify(
        {
          mcpServers: {
            'mcp-wcai-http': {
              type: 'http',
              url: item.serverInfo.mcpUrl,
            },
            'mcp-wcai-sse': {
              type: 'sse',
              url: item.serverInfo.sseUrl,
            },
          },
        },
        undefined,
        2,
      );

      await env.clipboard.writeText(configString);
      window.showInformationMessage('MCP server configuration copied to clipboard.');
    } catch (error) {
      window.showErrorMessage(`Failed to copy server configuration: ${error}`);
    }
  }
}
