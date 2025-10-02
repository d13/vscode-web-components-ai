import { z } from 'zod';

export const LogLevelSchema = z.enum(['off', 'error', 'warn', 'info', 'debug']);
export const TransportTypeSchema = z.enum(['http', 'sse', 'stdio']);

export const ServerConfigSchema = z.object({
  host: z.string().optional(),
  port: z.number().int().min(0).max(65535).optional(),
  transport: TransportTypeSchema.optional(),
});

export const ManifestsConfigSchema = z.object({
  exclude: z.array(z.string()).optional(),
  searchPaths: z.array(z.string()).optional(),
});

export const LoggingConfigSchema = z.object({
  level: LogLevelSchema.optional(),
  file: z.string().optional(),
});

// Full config schemas with defaults for validation
export const FullServerConfigSchema = z.object({
  host: z.string().default('127.0.0.1'),
  port: z.number().int().min(0).max(65535).default(0),
  transport: TransportTypeSchema.default('http'),
});

export const FullManifestsConfigSchema = z.object({
  exclude: z.array(z.string()).default([]),
  searchPaths: z.array(z.string()).default([]),
});

export const FullLoggingConfigSchema = z.object({
  level: LogLevelSchema.default('warn'),
  file: z.string().optional(),
});

export const CliConfigSchema = z.object({
  server: ServerConfigSchema.optional(),
  manifests: ManifestsConfigSchema.optional(),
  logging: LoggingConfigSchema.optional(),
});

export type LogLevel = z.infer<typeof LogLevelSchema>;
export type TransportType = z.infer<typeof TransportTypeSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type ManifestsConfig = z.infer<typeof ManifestsConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type CliConfig = z.infer<typeof CliConfigSchema>;

// Full config types with required properties
export type FullServerConfig = z.infer<typeof FullServerConfigSchema>;
export type FullManifestsConfig = z.infer<typeof FullManifestsConfigSchema>;
export type FullLoggingConfig = z.infer<typeof FullLoggingConfigSchema>;

export interface FullCliConfig {
  server: FullServerConfig;
  manifests: FullManifestsConfig;
  logging: FullLoggingConfig;
}

export const DEFAULT_CONFIG: FullCliConfig = {
  server: {
    host: '127.0.0.1',
    port: 0,
    transport: 'http',
  },
  manifests: {
    exclude: [],
    searchPaths: [],
  },
  logging: {
    level: 'warn',
  },
};
