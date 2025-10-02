export * from './http';
export * from './stdio';

export type TransportType = 'http' | 'sse' | 'stdio';

export interface TransportConfig {
  type: TransportType;
  host?: string;
  port?: number;
  name?: string;
  version?: string;
}

export interface TransportResult {
  type: TransportType;
  info: any;
  cleanup: () => Promise<void>;
}
