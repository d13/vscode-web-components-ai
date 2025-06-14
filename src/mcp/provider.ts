import { Disposable } from 'vscode';
import { Container } from '../container';
import { createHttpTransport, HttpTransportInfo } from './utils/transport';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../system/logger';
import { z } from 'zod';
import { executeCommand } from '../system/command';
import { configuration } from '../system/configuration';
import { getComponentDetails } from '../cem/reader';

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
      const components = (await this._container.cem.getAllComponents()).map(component =>
        getComponentDetails(component),
      );
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
        let component = await this._container.cem.getComponentByTagName(variables.tag as string);
        if (component) {
          component = getComponentDetails(component);
        }
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
      'search-web-components',
      'Search for web components by name, tag name, or description. Returns matching components with their full public API including attributes, properties, methods, and events.',
      {
        query: z.string().describe('Search term to find components by name, tag, or description'),
        matching: z
          .enum(['strict', 'all', 'any'])
          .optional()
          .default('any')
          .describe(
            'Matching strategy for search. Options are "strict" (exact match), "all" (all terms must match), or "any" (any term can match). Default is "any".',
          ),
      },
      {
        title: 'Search Available Web Components',
        readOnlyHint: true,
      },
      async ({ query, matching }) => {
        try {
          const matchingComponents = (await this._container.cem.searchComponents(query, matching)).map(component =>
            getComponentDetails(component),
          );

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
      'get-web-component-details-by-tag-name',
      'Get detailed information about a specific web component by its tag name. Returns the full public API of the component including attributes, properties, methods, and events.',
      {
        tagName: z.string().describe('The tag name of the component to get details for'),
      },
      {
        title: 'Get Web Component Details by Tag Name',
        readOnlyHint: true,
      },
      async ({ tagName }) => {
        try {
          let component = await this._container.cem.getComponentByTagName(tagName);

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

          component = getComponentDetails(component);
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
      'get-web-component-details-by-class-name',
      'Get detailed information about a specific web component by its class name. Returns the full public API of the component including attributes, properties, methods, and events.',
      {
        className: z.string().describe('The class name of the component to get details for'),
      },
      {
        title: 'Get Web Component Details by Class Name',
        readOnlyHint: true,
      },
      async ({ className }) => {
        try {
          let component = await this._container.cem.getComponentByClassName(className);

          if (!component) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Component with class name "${className}" not found.`,
                },
              ],
              isError: true,
            };
          }

          component = getComponentDetails(component);
          return {
            content: [
              {
                type: 'text',
                text: `Component Details for "${className}":\n\n${JSON.stringify(component, null, 2)}`,
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
      'list-all-web-components',
      'List all available web components in the workspace. Can return just basic information or the full public API including attributes, properties, methods, and events.',
      {
        includeDetails: z
          .boolean()
          .optional()
          .describe(
            'Whether to include the full public API for each component or just the tag name, class name, and description (default: true)',
          ),
      },
      {
        title: 'List All Web Components',
        readOnlyHint: true,
      },
      async ({ includeDetails = true }) => {
        try {
          const components = await this._container.cem.getAllComponents();

          const componentList = components.map(component =>
            getComponentDetails(component, includeDetails ? 'public' : 'basic'),
          );

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
