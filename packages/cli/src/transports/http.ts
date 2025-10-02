import type { IncomingMessage, Server, ServerResponse } from 'http';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../utils/logger';
import type { CustomElementsManifestReader } from '../cem/reader';
import { createMcpServer } from '../core/mcp-server';

export interface HttpTransportInfo {
  httpServer: Server<typeof IncomingMessage, typeof ServerResponse>;
  hostName: string;
  port: number;
  url: string;
  mcpUrl: string;
  sseUrl: string;
}

export async function createHttpTransport(
  cemReader: CustomElementsManifestReader,
  port = 0,
  hostName = '127.0.0.1',
  options?: { mcp?: { name?: string; version?: string } },
): Promise<HttpTransportInfo> {
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const sseTransports = new Map<string, SSEServerTransport>();
  const servers: McpServer[] = [];

  const httpServer = createServer(async (req, res) => {
    Logger.debug(`HTTP ${req.method} ${req.url}`);

    // Handle SSE connection route
    if (req.url === '/sse') {
      if (req.method === 'GET') {
        await handleSSEConnection(req, res, cemReader, sseTransports, servers, options);
        return;
      }
      res.statusCode = 405;
      res.end('Method not allowed for SSE connection endpoint');
      return;
    }

    // Handle SSE message route
    if (req.url?.startsWith('/sse/messages')) {
      if (req.method === 'POST') {
        await handleSSEMessage(req, res, sseTransports);
        return;
      }
      res.statusCode = 405;
      res.end('Method not allowed for SSE message endpoint');
      return;
    }

    // Handle MCP route
    if (req.url === '/mcp') {
      if (req.method === 'POST') {
        await handleStreamableRequest(req, res, cemReader, transports, servers, options);
        return;
      }

      if (req.method === 'GET' || req.method === 'DELETE') {
        await handleRequest(req, res, transports);
        return;
      }

      res.statusCode = 400;
      res.end('Invalid request');
      return;
    }

    // Unknown route
    res.statusCode = 404;
    res.end('Not found');
  });

  return new Promise((resolve, reject) => {
    try {
      httpServer.on('error', ex => {
        Logger.error('MCP HTTP server error:', ex);
        reject(ex);
      });

      // Let the OS assign an available port by listening on port 0
      httpServer.listen(port, hostName, () => {
        const address = httpServer.address();
        if (address == null || typeof address === 'string') {
          reject(new Error('Failed to get server address'));
          return;
        }

        const serverUrl = `http://${hostName}:${address.port}`;
        Logger.log(`MCP HTTP server listening on ${serverUrl}`);
        resolve({
          httpServer,
          hostName,
          port: address.port,
          url: serverUrl,
          mcpUrl: `${serverUrl}/mcp`,
          sseUrl: `${serverUrl}/sse`,
        });
      });
    } catch (ex) {
      reject(ex as Error);
    }
  });
}

async function handleSSEConnection(
  req: IncomingMessage,
  res: ServerResponse,
  cemReader: CustomElementsManifestReader,
  sseTransports: Map<string, SSEServerTransport>,
  servers: McpServer[],
  options?: { mcp?: { name?: string; version?: string } },
) {
  const sessionId = randomUUID();

  const transport = new SSEServerTransport(`/sse/messages/${sessionId}`, res);

  sseTransports.set(sessionId, transport);

  // Clean up transport when closed
  transport.onclose = () => {
    sseTransports.delete(sessionId);
  };

  const server = createMcpServer(options?.mcp?.name || 'wcai-server', options?.mcp?.version || '1.0.0', cemReader);
  servers.push(server);

  await server.connect(transport);
}

async function handleSSEMessage(
  req: IncomingMessage,
  res: ServerResponse,
  sseTransports: Map<string, SSEServerTransport>,
) {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/');
  const sessionId = pathParts[pathParts.length - 1];

  const transport = sseTransports.get(sessionId);
  if (!transport) {
    res.statusCode = 404;
    res.end('Session not found');
    return;
  }

  const body = await parseRequestBody(req);
  await transport.handleMessage(body);

  res.statusCode = 200;
  res.end();
}

async function handleStreamableRequest(
  req: IncomingMessage,
  res: ServerResponse,
  cemReader: CustomElementsManifestReader,
  transports: Map<string, StreamableHTTPServerTransport>,
  servers: McpServer[],
  options?: { mcp?: { name?: string; version?: string } },
) {
  // Parse request body first for all requests
  const bodyString = await parseRequestBody(req);
  let bodyData: any;

  try {
    bodyData = JSON.parse(bodyString);
  } catch (_error) {
    res.statusCode = 400;
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error: Invalid JSON',
        },
        id: null,
      }),
    );
    return;
  }

  // Check for existing session ID
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (sessionId) {
    // Reuse existing transport
    const transport = transports.get(sessionId);
    if (transport) {
      await transport.handleRequest(req, res, bodyData);
      return;
    }
  }

  if (req.method === 'POST' && isInitializeRequest(bodyData)) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: sessionId => {
        // Store the transport by session ID
        transports.set(sessionId, transport);
      },
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
      }
    };

    const server = createMcpServer(options?.mcp?.name || 'wcai-server', options?.mcp?.version || '1.0.0', cemReader);
    servers.push(server);

    // Connect to the MCP server first, then handle the request
    await server.connect(transport);
    await transport.handleRequest(req, res, bodyData);
    return;
  }

  res.statusCode = 400;
  res.end('Invalid request');
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  transports: Map<string, StreamableHTTPServerTransport>,
) {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId) {
    res.statusCode = 400;
    res.end('Missing session ID');
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    res.statusCode = 404;
    res.end('Session not found');
    return;
  }

  if (req.method === 'DELETE') {
    transport.close();
    transports.delete(sessionId);
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    const body = await parseRequestBody(req);
    await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
    return;
  }

  res.statusCode = 405;
  res.end('Method not allowed');
}

async function parseRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}
