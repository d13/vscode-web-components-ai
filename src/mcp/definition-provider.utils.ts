import type { McpServerDefinitionProvider, Disposable } from 'vscode';
import type { Container } from '../container';
import { supportsMcpDefinitionProvider } from '../system/mcp';

export async function getDefinitionProviders(
  container: Container,
): Promise<(McpServerDefinitionProvider & Disposable)[] | undefined> {
  if (!supportsMcpDefinitionProvider()) return undefined;

  // Older versions of VS Code do not support the classes used in the MCP integration, so we need to dynamically import
  const mcpModule = await import(/* webpackChunkName: "mcp" */ './definition-provider');

  return [new mcpModule.McpDefinitionProvider(container)];
}
