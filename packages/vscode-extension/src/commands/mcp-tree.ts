import type { Container } from '../container';
import { command } from '../system/decorators/command';
import { openUrl } from '../system/uris';
import type { McpServerNode } from '../views/nodes/mcpServerNode';
import { CommandBase } from './base';
import { copyMcpConfig } from './mcp-information';

@command()
export class CopyMcpServerConfigCommand extends CommandBase {
  constructor(container: Container) {
    super(container, 'wcai.views.cemList.copyMcpConfig');
  }

  execute(item: McpServerNode) {
    void copyMcpConfig(item?.serverInfo);
  }
}

@command()
export class OpenMcpHelpCommand extends CommandBase {
  constructor(container: Container) {
    super(container, 'wcai.views.cemList.helpMcpConfig');
  }

  execute() {
    void openUrl('https://github.com/d13/vscode-web-components-ai/blob/main/docs/configure-mcp.md');
  }
}

@command()
export class OpenIssuesCommand extends CommandBase {
  constructor(container: Container) {
    super(container, 'wcai.views.cemList.issues');
  }

  execute() {
    void openUrl('https://github.com/d13/vscode-web-components-ai/issues');
  }
}

@command()
export class OpenDiscussionsCommand extends CommandBase {
  constructor(container: Container) {
    super(container, 'wcai.views.cemList.discussions');
  }

  execute() {
    void openUrl('https://github.com/d13/vscode-web-components-ai/discussions');
  }
}
