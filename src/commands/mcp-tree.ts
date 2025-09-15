import type { Container } from '../container';
import { command } from '../system/decorators/command';
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
