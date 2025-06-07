import { ConfigurationTarget, Disposable, env, window } from 'vscode';
import { Container } from '../container';
import { Server } from 'http';
import { createHttpTransport, HttpTransportInfo } from './utils/transport';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../system/logger';
import { z } from 'zod';
import { executeCommand } from '../system/command';
import { configuration } from '../system/configuration';
import { start } from 'repl';

export const MANIFEST_SCHEME = 'manifest' as const;

export class McpProvider implements Disposable {
  private _disposables: Disposable[] = [];
  private httpTransport: HttpTransportInfo | undefined;

  constructor(private readonly _container: Container) {
    this.start();

    this._disposables.push(
      configuration.onDidChange(async e => {
        if (e.affectsConfiguration('mcp.port') || e.affectsConfiguration('mcp.host')) {
          if (this.httpTransport) {
            if (
              this.httpTransport.port === configuration.get('mcp.port') &&
              this.httpTransport.hostName === configuration.get('mcp.host')
            ) {
              return;
            }

            await this.stop();
          }

          void this.start();
        }
      }),
    );
  }

  getServerInfo(): HttpTransportInfo | undefined {
    if (!this.httpTransport) return undefined;

    return {
      ...this.httpTransport,
    };
  }

  async start(): Promise<void> {
    if (this.httpTransport?.httpServer) {
      return;
    }

    Logger.log('Starting MCP server');

    try {
      const port = configuration.get('mcp.port') ?? undefined;
      const host = configuration.get('mcp.host') ?? undefined;
      const httpTransport = await createHttpTransport(port, host, (mcpServer: McpServer) => {
        this.enrichMcpServer(mcpServer);
      });

      this.httpTransport = httpTransport;

      if (configuration.get('mcp.storeHostAndPortOnStart')) {
        if (httpTransport.port !== port) {
          configuration.updateEffective('mcp.port', httpTransport.port);
        }
        if (httpTransport.hostName !== host) {
          configuration.updateEffective('mcp.host', httpTransport.hostName);
        }
      }

      void executeCommand('wcai.mcp.showInformation');
    } catch (error) {
      Logger.error('Failed to start MCP server', error);
    }
  }

  stop(): Promise<void> {
    return new Promise<void>((resolve, _reject) => {
      if (!this.httpTransport?.httpServer) {
        resolve();
        return;
      }
      try {
        this.httpTransport.httpServer.close(() => {
          this.httpTransport = undefined;
          resolve();
        });
      } catch (error) {
        Logger.error('Error while stopping MCP server', error);
        this.httpTransport = undefined;
        resolve();
      }
    });
  }

  private enrichMcpServer(server: McpServer): void {
    // Add server resources, tools, and prompts ...
    server.resource('manifest', `${MANIFEST_SCHEME}://components`, async (uri: URL) => {
      const components = await this._container.cem.getAllComponents();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(components),
          },
        ],
      };
    });

    server.resource(
      'manifest-components',
      new ResourceTemplate(`${MANIFEST_SCHEME}://components/{tag}`, { list: undefined }),
      async (uri: URL, variables) => {
        const component = await this._container.cem.getComponentByTagName(variables.tag as string);
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(component),
            },
          ],
        };
      },
    );

    // Add tools for web component development
    server.tool(
      'search-components',
      'Search for web components by name, tag name, or description. Returns matching components with their basic information.',
      {
        query: z.string().describe('Search term to find components by name, tag, or description'),
      },
      async ({ query }) => {
        try {
          const matchingComponents = await this._container.cem.searchComponents(query);

          return {
            content: [
              {
                type: 'text',
                text: `Found ${matchingComponents.length} components matching "${query}":\n\n${JSON.stringify(
                  matchingComponents,
                  null,
                  2,
                )}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error searching components: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    server.tool(
      'get-component-details',
      'Get detailed information about a specific web component by its tag name. Returns complete component metadata including attributes, properties, methods, and events.',
      {
        tagName: z.string().describe('The tag name of the component to get details for'),
      },
      async ({ tagName }) => {
        try {
          const component = await this._container.cem.getComponentByTagName(tagName);

          if (!component) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Component with tag name "${tagName}" not found.`,
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `Component Details for "${tagName}":\n\n${JSON.stringify(component, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting component details: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    server.tool(
      'list-all-components',
      'List all available web components in the workspace. Can return either basic information or full component details.',
      {
        includeDetails: z.boolean().optional().describe('Whether to include full component details (default: false)'),
      },
      async ({ includeDetails = false }) => {
        try {
          const components = await this._container.cem.getAllComponents();

          const componentList = includeDetails
            ? components
            : components.map(component => ({
                tagName: component.tagName,
                name: component.name,
                description: component.description,
              }));

          return {
            content: [
              {
                type: 'text',
                text: `Found ${components.length} components:\n\n${JSON.stringify(componentList, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing components: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  dispose() {
    void this.stop();
    this._disposables.forEach(d => d.dispose());
  }
}
