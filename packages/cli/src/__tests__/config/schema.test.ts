import { describe, it, expect } from '@jest/globals';
import {
  ServerConfigSchema,
  ManifestsConfigSchema,
  LoggingConfigSchema,
  CliConfigSchema,
  getDefaultConfig,
  type FullCliConfig,
} from '../../config/schema';

describe('Configuration Schema', () => {
  describe('ServerConfigSchema', () => {
    it('should validate valid server config', () => {
      const validConfig = {
        host: '127.0.0.1',
        port: 3000,
        transport: 'http' as const,
      };

      const result = ServerConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should use defaults for missing fields', () => {
      const result = ServerConfigSchema.parse({});
      expect(result.host).toBe('127.0.0.1');
      expect(result.port).toBe(0);
      expect(result.transport).toBe('http');
    });

    it('should validate transport types', () => {
      expect(() => ServerConfigSchema.parse({ transport: 'invalid' })).toThrow();
      
      const validTransports = ['http', 'sse', 'stdio'];
      validTransports.forEach(transport => {
        expect(() => ServerConfigSchema.parse({ transport })).not.toThrow();
      });
    });

    it('should validate port ranges', () => {
      expect(() => ServerConfigSchema.parse({ port: -1 })).toThrow();
      expect(() => ServerConfigSchema.parse({ port: 65536 })).toThrow();
      expect(() => ServerConfigSchema.parse({ port: 0 })).not.toThrow();
      expect(() => ServerConfigSchema.parse({ port: 65535 })).not.toThrow();
    });
  });

  describe('ManifestsConfigSchema', () => {
    it('should validate valid manifests config', () => {
      const validConfig = {
        exclude: ['file:///path/to/manifest.json'],
        searchPaths: ['./src', './lib'],
      };

      const result = ManifestsConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should use defaults for missing fields', () => {
      const result = ManifestsConfigSchema.parse({});
      expect(result.exclude).toEqual([]);
      expect(result.searchPaths).toEqual([]);
    });

    it('should validate array types', () => {
      expect(() => ManifestsConfigSchema.parse({ exclude: 'not-array' })).toThrow();
      expect(() => ManifestsConfigSchema.parse({ searchPaths: 'not-array' })).toThrow();
    });
  });

  describe('LoggingConfigSchema', () => {
    it('should validate valid logging config', () => {
      const validConfig = {
        level: 'info' as const,
      };

      const result = LoggingConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should use defaults for missing fields', () => {
      const result = LoggingConfigSchema.parse({});
      expect(result.level).toBe('info');
    });

    it('should validate log levels', () => {
      expect(() => LoggingConfigSchema.parse({ level: 'invalid' })).toThrow();
      
      const validLevels = ['off', 'error', 'warn', 'info', 'debug'];
      validLevels.forEach(level => {
        expect(() => LoggingConfigSchema.parse({ level })).not.toThrow();
      });
    });
  });

  describe('CliConfigSchema', () => {
    it('should validate complete config', () => {
      const validConfig = {
        server: {
          host: '0.0.0.0',
          port: 8080,
          transport: 'http' as const,
        },
        manifests: {
          exclude: ['file:///excluded.json'],
          searchPaths: ['./components'],
        },
        logging: {
          level: 'debug' as const,
        },
      };

      const result = CliConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should handle partial config', () => {
      const partialConfig = {
        server: {
          port: 9000,
        },
        logging: {
          level: 'warn' as const,
        },
      };

      const result = CliConfigSchema.parse(partialConfig);
      expect(result.server?.port).toBe(9000);
      expect(result.logging?.level).toBe('warn');
    });

    it('should handle empty config', () => {
      const result = CliConfigSchema.parse({});
      expect(result).toEqual({});
    });
  });

  describe('getDefaultConfig', () => {
    it('should return complete default configuration', () => {
      const defaultConfig = getDefaultConfig();
      
      expect(defaultConfig).toEqual({
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
          level: 'info',
        },
      });
    });

    it('should return a new object each time', () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();
      
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('should have immutable nested objects', () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();
      
      config1.server.port = 9999;
      expect(config2.server.port).toBe(0);
    });
  });

  describe('Type compatibility', () => {
    it('should work with FullCliConfig type', () => {
      const config: FullCliConfig = getDefaultConfig();
      
      // These should not cause TypeScript errors
      expect(config.server.host).toBe('127.0.0.1');
      expect(config.manifests.exclude).toEqual([]);
      expect(config.logging.level).toBe('info');
    });
  });
});
