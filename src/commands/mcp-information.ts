import { window, env } from 'vscode';
import { Container } from '../container';
import { CommandBase } from './base';
import { command } from '../system/decorators/command';

@command()
export class McpInformationCommand extends CommandBase {
  constructor(container: Container) {
    super(container, 'wcai.mcp.showInformation');
  }

  async execute() {
    const serverInfo = this.container.mcp.getServerInfo();
    if (!serverInfo) {
      window.showErrorMessage('MCP server is not running.');
      return;
    }

    const message = `MCP server (HTTP & SSE) listening at: ${serverInfo.url}`;

    const copyConfig = 'Copy Config JSON';

    const result = await window.showInformationMessage(message, copyConfig);
    if (result === copyConfig) {
      const configString = JSON.stringify(
        {
          mcpServers: {
            'mcp-wcai-http': {
              type: 'http',
              url: serverInfo.mcpUrl,
            },
            'mcp-wcai-sse': {
              type: 'sse',
              url: serverInfo.sseUrl,
            },
          },
        },
        undefined,
        2,
      );
      await env.clipboard.writeText(configString);
      window.showInformationMessage('MCP configuration copied to clipboard.');
    }
  }
}
