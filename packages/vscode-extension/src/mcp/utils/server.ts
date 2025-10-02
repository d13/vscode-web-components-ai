import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function createMcpServer(
  name = 'cem-server',
  version = '1.0.0',
  callback: (server: McpServer) => void,
): McpServer {
  const server = new McpServer({ name, version });

  // Add server resources, tools, and prompts ...
  callback(server);

  return server;
}
