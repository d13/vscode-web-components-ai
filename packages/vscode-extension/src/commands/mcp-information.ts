import { window, env } from 'vscode';
import type { Container } from '../container';
import type { HttpTransportInfo } from '../mcp/utils/transport';
import { executeCommand } from '../system/command';
import { command } from '../system/decorators/command';
import { supportsMcpDefinitionProvider, supportsMcpUrlHandler } from '../system/mcp';
import { getHostAppName } from '../system/vscode';
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

    const doesSupportDefinitionProvider = await supportsMcpDefinitionProvider();
    let message = `Web Component AI Tools MCP server (HTTP & SSE) listening at: ${serverInfo.url}`;

    const copyConfig = { title: 'Copy Config JSON' };
    const installConfig = { title: 'Install MCP' };
    const openDocs = { title: 'MCP Integration Help' };
    const cancel = { title: 'Ok', isCloseAffordance: true };
    let actions = [copyConfig, openDocs, cancel];
    if (doesSupportDefinitionProvider) {
      message += '. This MCP is automatically installed and active with your AI chat.';
      actions = [copyConfig, cancel];
    } else if (supportsMcpUrlHandler(await getHostAppName())) {
      actions = [installConfig, copyConfig, cancel];
    } else {
      message += '. Copy the configuration below to manually add to your MCP settings.';
    }

    const result = await window.showInformationMessage(message, ...actions);

    if (result === copyConfig) {
      void copyMcpConfig(serverInfo);
      return;
    }

    if (result === installConfig) {
      void executeCommand('wcai.mcp.install');
      return;
    }

    if (result === openDocs) {
      void executeCommand('wcai.views.cemList.helpMcpConfig');
    }
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
