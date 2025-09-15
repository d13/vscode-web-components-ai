import type { Event, McpServerDefinition, McpServerDefinitionProvider } from 'vscode';
import { Disposable, EventEmitter, lm, McpHttpServerDefinition, Uri } from 'vscode';
import type { Container } from '../container';

export class McpDefinitionProvider implements McpServerDefinitionProvider, Disposable {
  private readonly _disposable: Disposable;
  private readonly _onDidChangeMcpServerDefinitions = new EventEmitter<void>();
  get onDidChangeMcpServerDefinitions(): Event<void> {
    return this._onDidChangeMcpServerDefinitions.event;
  }

  constructor(private readonly container: Container) {
    this._disposable = Disposable.from(
      this.container.mcp.onDidChangeHttpServerState(e => this.onDidChangeHttpServerState(e)),
      lm.registerMcpServerDefinitionProvider('wcai.McpDefinitionProvider', this),
    );
  }

  provideMcpServerDefinitions(): McpServerDefinition[] {
    const serverInfo = this.container.mcp.getServerInfo();
    if (!serverInfo) return [];

    const serverDefinition = new McpHttpServerDefinition(
      'Web Component AI Tools',
      Uri.parse(serverInfo.mcpUrl),
      {},
      this.container.version,
    );

    return [serverDefinition];
  }

  private onDidChangeHttpServerState(e: void) {
    this._onDidChangeMcpServerDefinitions.fire(e);
  }

  dispose(): void {
    this._disposable.dispose();
    this._onDidChangeMcpServerDefinitions.dispose();
  }
}
