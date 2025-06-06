import { Disposable, env, window } from 'vscode';
import { Container } from '../container';
import { Server } from 'http';
import { createHttpTransport } from './utils/transport';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../system/logger';
import { z } from 'zod';

export class McpProvider implements Disposable {
  private _disposables: Disposable[] = [];
  private server: Server | undefined;

  constructor(private readonly _container: Container) {
    this.start();
  }

  async start(): Promise<void> {
    if (this.server) {
      return;
    }

    try {
      // TODO: add configuration for port and host
      // TODO: MCP server resources, tools, and prompts ...
      const { url, httpServer } = await createHttpTransport(undefined, undefined, (mcpServer: McpServer) => {
        this.enrichMcpServer(mcpServer);
      });

      this.server = httpServer;

      const configString = JSON.stringify(
        {
          servers: {
            'mcp-wcai-http': {
              type: 'http',
              url: `${url}/mcp`,
            },
            'mcp-wcai-sse': {
              type: 'sse',
              url: `${url}/sse`,
            },
          },
        },
        undefined,
        2,
      );

      const message = `MCP server started at ${url}

      Available transports:
      - HTTP (Streamable): ${url}/mcp
      - SSE (Server-Sent Events): ${url}/sse

      Copy the following config:
      ${configString}`;

      const copyConfig = 'Copy Config';

      const result = await window.showInformationMessage(message, copyConfig);
      if (result === copyConfig) {
        await env.clipboard.writeText(configString);
        window.showInformationMessage('MCP configuration copied to clipboard.');
      }
    } catch (error) {
      Logger.error('Failed to start MCP server', error);
    }
  }

  stop(): Promise<void> {
    return new Promise<void>((resolve, _reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      try {
        this.server.close(() => {
          this.server = undefined;
          resolve();
        });
      } catch (error) {
        Logger.error('Error while stopping MCP server', error);
        this.server = undefined;
        resolve();
      }
    });
  }

  private enrichMcpServer(server: McpServer): void {
    // Add server resources, tools, and prompts ...
    server.resource('manifest', 'manifest://components', async (uri: URL) => {
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
      new ResourceTemplate('manifest://components/{tag}', { list: undefined }),
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
