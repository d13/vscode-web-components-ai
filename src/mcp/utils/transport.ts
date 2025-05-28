import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { uuid } from '@env/crypto';
import { createMcpServer } from './server';
import { Logger } from '../../system/logger';

export async function createHttpTransport(
  port = 0,
  hostName = '127.0.0.1',
  mcpCallback: (server: McpServer) => void,
  options?: { mcp?: { name?: string; version?: string } },
): Promise<{ url: string; httpServer: Server<typeof IncomingMessage, typeof ServerResponse> }> {
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const sseTransports = new Map<string, SSEServerTransport>();
  const servers: McpServer[] = [];
  const httpServer = createServer(async (req, res) => {
    Logger.log(`HTTP ${req.method} ${req.url}`);

    // Handle SSE connection route
    if (req.url === '/sse') {
      if (req.method === 'GET') {
        await handleSSEConnection(req, res, mcpCallback, sseTransports, servers, options);
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
        await handleStreamableRequest(req, res, mcpCallback, transports, servers, options);
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

        const serverUrl = `http://${hostName}:${address.port}`;
        Logger.log(`MCP HTTP server listening on ${serverUrl}`);
        resolve({
          url: serverUrl,
          httpServer,
        });
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
  mcpCallback: (server: McpServer) => void,
  transports: Map<string, StreamableHTTPServerTransport>,
  servers: McpServer[],
  options?: { mcp?: { name?: string; version?: string } },
) {
  // Parse request body first for all requests
  const bodyString = await parseRequestBody(req);
  let bodyData: any;

  try {
    bodyData = JSON.parse(bodyString);
  } catch (error) {
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
    await transport.handleRequest(req, res, bodyData);
    return;
  }

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

    const server = createMcpServer(options?.mcp?.name, options?.mcp?.version, mcpCallback);
    servers.push(server);

    // Connect to the MCP server first, then handle the request
    await server.connect(transport);
    await transport.handleRequest(req, res, bodyData);
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
 * Handles SSE connection establishment (GET /sse).
 * @param req The incoming HTTP request.
 * @param res The HTTP response object.
 * @param mcpCallback Callback to enrich the MCP server.
 * @param sseTransports A map of session IDs to SSEServerTransport instances.
 * @param servers An array of MCP servers.
 * @param options Optional configuration for the MCP server.
 */
async function handleSSEConnection(
  req: IncomingMessage,
  res: ServerResponse,
  mcpCallback: (server: McpServer) => void,
  sseTransports: Map<string, SSEServerTransport>,
  servers: McpServer[],
  options?: { mcp?: { name?: string; version?: string } },
) {
  Logger.log('SSE connection request received');

  // Create a new SSE transport with the messaging endpoint
  // The SSEServerTransport constructor takes (endpoint, response)
  const transport = new SSEServerTransport('/sse/messages', res);

  // Get the session ID from the transport (it should be generated automatically)
  const sessionId = transport.sessionId;

  if (!sessionId) {
    res.statusCode = 500;
    res.end('Failed to generate session ID');
    return;
  }

  // Store the transport by session ID
  sseTransports.set(sessionId, transport);

  // Create and configure MCP server
  const server = createMcpServer(options?.mcp?.name, options?.mcp?.version, mcpCallback);
  servers.push(server);

  // Connect to the MCP server
  await server.connect(transport);

  // Clean up transport when closed
  res.on('close', () => {
    Logger.log(`SSE connection closed for session ${sessionId}`);
    sseTransports.delete(sessionId);
  });
}

/**
 * Handles SSE message requests (POST /sse).
 * @param req The incoming HTTP request.
 * @param res The HTTP response object.
 * @param sseTransports A map of session IDs to SSEServerTransport instances.
 */
async function handleSSEMessage(
  req: IncomingMessage,
  res: ServerResponse,
  sseTransports: Map<string, SSEServerTransport>,
) {
  Logger.log('SSE message request received');

  // Get session ID from query parameter (SSE client automatically adds this)
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId || !sseTransports.has(sessionId)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ message: 'Bad session id.' }));
    return;
  }

  const transport = sseTransports.get(sessionId)!;

  // Parse request body
  const bodyString = await parseRequestBody(req);
  let bodyData: any;

  try {
    bodyData = JSON.parse(bodyString);
  } catch (error) {
    res.statusCode = 400;
    res.end(JSON.stringify({ message: 'Invalid JSON' }));
    return;
  }

  // Handle the message through the transport
  await transport.handlePostMessage(req, res, bodyData);
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
