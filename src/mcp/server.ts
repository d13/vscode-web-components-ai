import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function createMcpServer(name = 'cem-server', version = '1.0.0'): McpServer {
  const server = new McpServer({ name, version });

  // TODO: server resources, tools, and prompts ...

  return server;
}
