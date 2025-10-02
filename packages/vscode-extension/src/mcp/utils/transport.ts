import type { Server } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * HTTP transport information interface
 * This matches the HttpTransportInfo from the CLI package
 */
export interface HttpTransportInfo {
  httpServer: Server<typeof IncomingMessage, typeof ServerResponse>;
  hostName: string;
  port: number;
  url: string;
  mcpUrl: string;
  sseUrl: string;
}
