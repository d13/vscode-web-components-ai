import type { Container } from '../container';
import { command } from '../system/decorators/command';
import { CommandBase } from './base';

@command()
export class McpStartCommand extends CommandBase {
  constructor(private readonly _container: Container) {
    super(_container, 'wcai.mcp.start');
  }

  async execute() {
    await this._container.mcp.start();
  }
}

@command()
export class McpStopCommand extends CommandBase {
  constructor(private readonly _container: Container) {
    super(_container, 'wcai.mcp.stop');
  }

  async execute() {
    await this._container.mcp.stop();
  }
}
