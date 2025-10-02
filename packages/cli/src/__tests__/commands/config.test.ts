import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Command } from 'commander';
import { createConfigCommand } from '../../commands/config';
import * as configModule from '../../config';

// Mock the config module
jest.mock('../../config');

describe('Config Commands', () => {
  let program: Command;
  let mockLoadConfig: jest.MockedFunction<any>;
  let mockSaveLocalConfig: jest.MockedFunction<any>;
  let mockSaveGlobalConfig: jest.MockedFunction<any>;
  let mockGetConfigManager: jest.MockedFunction<any>;
  let mockConfigManager: any;

  beforeEach(() => {
    program = new Command();

    // Reset mocks
    jest.clearAllMocks();

    // Mock config functions
    mockLoadConfig = configModule.loadConfig as jest.MockedFunction<any>;
    mockSaveLocalConfig = configModule.saveLocalConfig as jest.MockedFunction<any>;
    mockSaveGlobalConfig = configModule.saveGlobalConfig as jest.MockedFunction<any>;
    mockGetConfigManager = configModule.getConfigManager as jest.MockedFunction<any>;

    // Mock config manager
    mockConfigManager = {
      loadConfig: jest.fn(),
      updateConfig: jest.fn(),
      getConfig: jest.fn(),
      resetConfig: jest.fn(),
    };

    mockGetConfigManager.mockReturnValue(mockConfigManager);

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('config get command', () => {
    it('should display current configuration', async () => {
      const mockConfig = {
        server: {
          host: '127.0.0.1',
          port: 3000,
          transport: 'http' as const,
        },
        manifests: {
          exclude: [],
          searchPaths: [],
        },
        logging: {
          level: 'info' as const,
        },
      };

      mockLoadConfig.mockResolvedValue(mockConfig);

      const configCommand = createConfigCommand();
      program.addCommand(configCommand);

      // Simulate running "config get"
      await program.parseAsync(['config', 'get'], { from: 'user' });

      expect(mockLoadConfig).toHaveBeenCalledWith(process.cwd());
      expect(console.log).toHaveBeenCalledWith(JSON.stringify(mockConfig, null, 2));
    });

    it('should display specific config key', async () => {
      const mockConfig = {
        server: {
          host: '127.0.0.1',
          port: 3000,
          transport: 'http' as const,
        },
        manifests: {
          exclude: [],
          searchPaths: [],
        },
        logging: {
          level: 'info' as const,
        },
      };

      mockLoadConfig.mockResolvedValue(mockConfig);

      const configCommand = createConfigCommand();
      program.addCommand(configCommand);

      // Simulate running "config get server.host"
      await program.parseAsync(['config', 'get', 'server.host'], { from: 'user' });

      expect(console.log).toHaveBeenCalledWith('127.0.0.1');
    });

    it('should handle missing config key', async () => {
      const mockConfig = {
        server: {
          host: '127.0.0.1',
          port: 3000,
          transport: 'http' as const,
        },
        manifests: {
          exclude: [],
          searchPaths: [],
        },
        logging: {
          level: 'info' as const,
        },
      };

      mockLoadConfig.mockResolvedValue(mockConfig);

      const configCommand = createConfigCommand();
      program.addCommand(configCommand);

      // Simulate running "config get nonexistent.key"
      await program.parseAsync(['config', 'get', 'nonexistent.key'], { from: 'user' });

      expect(console.log).toHaveBeenCalledWith('undefined');
    });
  });

  describe('config set command', () => {
    it('should set configuration value locally', async () => {
      mockConfigManager.getConfig.mockReturnValue({
        server: { host: '127.0.0.1', port: 0, transport: 'http' },
        manifests: { exclude: [], searchPaths: [] },
        logging: { level: 'info' },
      });

      const configCommand = createConfigCommand();
      program.addCommand(configCommand);

      // Simulate running "config set server.port 3000"
      await program.parseAsync(['config', 'set', 'server.port', '3000'], { from: 'user' });

      expect(mockGetConfigManager).toHaveBeenCalledWith(process.cwd());
      expect(mockConfigManager.loadConfig).toHaveBeenCalled();
      expect(mockConfigManager.updateConfig).toHaveBeenCalledWith({ server: { port: 3000 } });
      expect(mockSaveLocalConfig).toHaveBeenCalledWith(process.cwd());
      expect(console.log).toHaveBeenCalledWith('✓ Set server.port = 3000 (local)');
    });

    it('should set configuration value globally', async () => {
      mockConfigManager.getConfig.mockReturnValue({
        server: { host: '127.0.0.1', port: 0, transport: 'http' },
        manifests: { exclude: [], searchPaths: [] },
        logging: { level: 'info' },
      });

      const configCommand = createConfigCommand();
      program.addCommand(configCommand);

      // Simulate running "config set --global logging.level debug"
      await program.parseAsync(['config', 'set', '--global', 'logging.level', 'debug'], {
        from: 'user',
      });

      expect(mockConfigManager.updateConfig).toHaveBeenCalledWith({ logging: { level: 'debug' } });
      expect(mockSaveGlobalConfig).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('✓ Set logging.level = debug (global)');
    });

    it('should handle boolean values', async () => {
      mockConfigManager.getConfig.mockReturnValue({
        server: { host: '127.0.0.1', port: 0, transport: 'http' },
        manifests: { exclude: [], searchPaths: [] },
        logging: { level: 'info' },
      });

      const configCommand = createConfigCommand();
      program.addCommand(configCommand);

      // Simulate setting a boolean value
      await program.parseAsync(['config', 'set', 'server.enabled', 'true'], { from: 'user' });

      expect(mockConfigManager.updateConfig).toHaveBeenCalledWith({ server: { enabled: true } });
    });

    it('should handle array values', async () => {
      mockConfigManager.getConfig.mockReturnValue({
        server: { host: '127.0.0.1', port: 0, transport: 'http' },
        manifests: { exclude: [], searchPaths: [] },
        logging: { level: 'info' },
      });

      const configCommand = createConfigCommand();
      program.addCommand(configCommand);

      // Simulate setting an array value
      await program.parseAsync(['config', 'set', 'manifests.searchPaths', '["./src", "./lib"]'], {
        from: 'user',
      });

      expect(mockConfigManager.updateConfig).toHaveBeenCalledWith({
        manifests: { searchPaths: ['./src', './lib'] },
      });
    });
  });

  describe('config list command', () => {
    it('should list all configuration keys and values', async () => {
      const mockConfig = {
        server: {
          host: '127.0.0.1',
          port: 3000,
          transport: 'http' as const,
        },
        manifests: {
          exclude: ['file:///excluded.json'],
          searchPaths: ['./src'],
        },
        logging: {
          level: 'debug' as const,
        },
      };

      mockLoadConfig.mockResolvedValue(mockConfig);

      const configCommand = createConfigCommand();
      program.addCommand(configCommand);

      // Simulate running "config list"
      await program.parseAsync(['config', 'list'], { from: 'user' });

      expect(console.log).toHaveBeenCalledWith('Configuration:');
      expect(console.log).toHaveBeenCalledWith('  server.host = 127.0.0.1');
      expect(console.log).toHaveBeenCalledWith('  server.port = 3000');
      expect(console.log).toHaveBeenCalledWith('  server.transport = http');
      expect(console.log).toHaveBeenCalledWith('  manifests.exclude = ["file:///excluded.json"]');
      expect(console.log).toHaveBeenCalledWith('  manifests.searchPaths = ["./src"]');
      expect(console.log).toHaveBeenCalledWith('  logging.level = debug');
    });
  });

  describe('config reset command', () => {
    it('should reset local configuration', async () => {
      const configCommand = createConfigCommand();
      program.addCommand(configCommand);

      // Simulate running "config reset --local --confirm"
      await program.parseAsync(['config', 'reset', '--local', '--confirm'], { from: 'user' });

      expect(mockGetConfigManager).toHaveBeenCalledWith(process.cwd());
      expect(mockConfigManager.resetConfig).toHaveBeenCalled();
      expect(mockSaveLocalConfig).toHaveBeenCalledWith(process.cwd());
      expect(console.log).toHaveBeenCalledWith('✓ Reset local configuration to defaults');
    });

    it('should reset global configuration', async () => {
      const configCommand = createConfigCommand();
      program.addCommand(configCommand);

      // Simulate running "config reset --global --confirm"
      await program.parseAsync(['config', 'reset', '--global', '--confirm'], { from: 'user' });

      expect(mockConfigManager.resetConfig).toHaveBeenCalled();
      expect(mockSaveGlobalConfig).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('✓ Reset global configuration to defaults');
    });
  });
});
