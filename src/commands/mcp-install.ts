import { window } from 'vscode';
import type { Container } from '../container';
import { executeCommand } from '../system/command';
import { command } from '../system/decorators/command';
import { installMcpViaUrlHandler, supportsMcpDefinitionProvider, supportsMcpUrlHandler } from '../system/mcp';
import { getHostAppName } from '../system/vscode';
import { CommandBase } from './base';
import { copyMcpConfig } from './mcp-information';

@command()
export class McpInstallCommand extends CommandBase {
  constructor(container: Container) {
    super(container, 'wcai.mcp.install');
  }

  async execute() {
    const serverInfo = this.container.mcp.getServerInfo();
    if (!serverInfo) {
      void window.showErrorMessage('MCP server is not running.');
      return;
    }

    if (supportsMcpDefinitionProvider()) {
      void window.showInformationMessage('MCP server is automatically installed and active in your AI chat.');
      return;
    }

    const hostAppName = await getHostAppName();
    if (supportsMcpUrlHandler(hostAppName)) {
      void installMcpViaUrlHandler({
        name: 'Web Component AI Tools',
        type: 'http',
        url: serverInfo.mcpUrl,
        version: this.container.version,
      });
      return;
    }

    const copyConfig = { title: 'Copy MCP Configuration' };
    const openDocs = { title: 'MCP Integration Help' };
    const cancel = { title: 'Ok', isCloseAffordance: true };
    const result = await window.showInformationMessage(
      'Your version of VS Code does not support automatic MCP registration. Please copy the MCP configuration and add it manually to your AI chat settings.',
      copyConfig,
      openDocs,
      cancel,
    );

    if (result === copyConfig) {
      void copyMcpConfig(serverInfo);
      return;
    }

    if (result === openDocs) {
      void executeCommand('wcai.views.cemList.helpMcpConfig');
    }
  }
}
