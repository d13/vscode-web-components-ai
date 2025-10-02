import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Logger } from '../utils/logger';
import type { CustomElementsManifestReader } from '../cem/reader';
import { createMcpServer } from '../core/mcp-server';

export interface StdioTransportInfo {
  transport: StdioServerTransport;
  server: ReturnType<typeof createMcpServer>;
}

export async function createStdioTransport(
  cemReader: CustomElementsManifestReader,
  options?: { mcp?: { name?: string; version?: string } },
): Promise<StdioTransportInfo> {
  Logger.debug('Creating STDIO transport');

  const transport = new StdioServerTransport();
  const server = createMcpServer(
    options?.mcp?.name || 'wcai-server',
    options?.mcp?.version || '1.0.0',
    cemReader
  );

  // Connect the server to the transport
  await server.connect(transport);

  Logger.log('MCP STDIO server started');

  return {
    transport,
    server,
  };
}

export function startStdioServer(
  cemReader: CustomElementsManifestReader,
  options?: { mcp?: { name?: string; version?: string } },
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const { transport, server } = await createStdioTransport(cemReader, options);

      // Handle process termination
      process.on('SIGINT', () => {
        Logger.debug('Received SIGINT, shutting down STDIO server');
        transport.close();
        resolve();
      });

      process.on('SIGTERM', () => {
        Logger.debug('Received SIGTERM, shutting down STDIO server');
        transport.close();
        resolve();
      });

      // Handle transport close
      transport.onclose = () => {
        Logger.debug('STDIO transport closed');
        resolve();
      };

      // Handle transport errors
      transport.onerror = (error) => {
        Logger.error('STDIO transport error:', error);
        reject(error);
      };

    } catch (error) {
      Logger.error('Failed to start STDIO server:', error);
      reject(error);
    }
  });
}
