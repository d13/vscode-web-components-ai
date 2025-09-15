import { window, env } from 'vscode';
import type { Container } from '../container';
import type { HttpTransportInfo } from '../mcp/utils/transport';
import { command } from '../system/decorators/command';
import { supportsMcpDefinitionProvider } from '../system/mcp';
import { CommandBase } from './base';

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

    let message = `Web Component AI Tools MCP server (HTTP & SSE) listening at: ${serverInfo.url}`;
    if (supportsMcpDefinitionProvider()) {
      message += '. This MCP is automatically registered with your AI chat.';
    }

    const copyConfig = 'Copy Config JSON';

    const result = await window.showInformationMessage(message, copyConfig);
    if (result !== copyConfig) return;

    void copyMcpConfig(serverInfo);
  }
}

export async function copyMcpConfig(serverInfo?: HttpTransportInfo): Promise<void> {
  if (!serverInfo) {
    window.showErrorMessage('MCP server is not running.');
    return;
  }

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
