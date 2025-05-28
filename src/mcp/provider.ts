import { Disposable, env, window } from 'vscode';
import { Container } from '../container';
import { Server } from 'http';
import { createHttpTransport } from './utils/transport';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../system/logger';

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
      this.server.close(() => {
        this.server = undefined;
        resolve();
      });
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
  }

  dispose() {
    void this.stop();
    this._disposables.forEach(d => d.dispose());
  }
}
