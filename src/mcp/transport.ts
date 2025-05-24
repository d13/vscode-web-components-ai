import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { uuid } from '@env/crypto';
import { createMcpServer } from './server';

export async function createHttpTransport(
  port = 0,
  hostName = '127.0.0.1',
  options?: { mcp?: { name?: string; version?: string } },
) {
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const servers: McpServer[] = [];
  const httpServer = createServer(async (req, res) => {
    if (req.url !== '/mcp') {
      res.statusCode = 405;
      res.end('Method not allowed');
      return;
    }

    if (req.method === 'POST') {
      await handleStreamableRequest(req, res, transports, servers, options);
      return;
    }

    if (req.method === 'GET' || req.method === 'DELETE') {
      await handleRequest(req, res, transports);
      return;
    }

    res.statusCode = 400;
    res.end('Invalid request');
  });

  return new Promise((resolve, reject) => {
    try {
      httpServer.on('error', ex => {
        debugger;
        console.error(ex, 'MCP HTTP server error');
        reject(ex);
      });

      // Let the OS assign an available port by listening on port 0
      httpServer.listen(port, hostName, () => {
        const address = httpServer.address();
        if (address == null || typeof address === 'string') {
          reject(new Error('Failed to get server address'));
          return;
        }

        // const serverUrl = `http://${hostName}:${address.port}`;
        resolve(httpServer);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * Handles incoming requests for the streamable HTTP transport.
 * @param req The incoming HTTP request.
 * @param res The HTTP response object.
 * @param transports A map of session IDs to StreamableHTTPServerTransport instances.
 * @param servers An array of MCP servers.
 * @param options Optional configuration for the MCP server.
 */
async function handleStreamableRequest(
  req: IncomingMessage,
  res: ServerResponse,
  transports: Map<string, StreamableHTTPServerTransport>,
  servers: McpServer[],
  options?: { mcp?: { name?: string; version?: string } },
) {
  // Check for existing session ID
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (sessionId) {
    // Reuse existing transport
    const transport = transports.get(sessionId);
    if (!transport) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        }),
      );
      return;
    }
    await transport.handleRequest(req, res);
    return;
  }

  const bodyData = await parseRequestBody(req);
  if (req.method === 'POST' && isInitializeRequest(bodyData)) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => uuid(),
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

    const server = createMcpServer(options?.mcp?.name, options?.mcp?.version);
    servers.push(server);

    // Connect to the MCP server
    await Promise.all([server.connect(transport), transport.handleRequest(req, res)]);
    return;
  }

  res.statusCode = 400;
  res.end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Bad Request: Invalid request method',
      },
      id: null,
    }),
  );
}

/**
 * Handles incoming requests for the HTTP transport.
 * @param req The incoming HTTP request.
 * @param res The HTTP response object.
 * @param transports A map of session IDs to StreamableHTTPServerTransport instances.
 */
async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  transports: Map<string, StreamableHTTPServerTransport>,
) {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.statusCode = 400;
    res.end('Invalid or missing session ID');
    return;
  }

  const transport = transports.get(sessionId)!;
  return transport.handleRequest(req, res);
}

/**
 * Parses the request body from an IncomingMessage.
 * @param req The IncomingMessage object.
 * @returns A promise that resolves to the parsed body as a string.
 */
async function parseRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on('data', d => chunks.push(d));
    req.on('end', async () => {
      const body = Buffer.concat(chunks).toString();
      resolve(body);
    });
    req.on('error', reject);
  });
}
