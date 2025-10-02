import { Command } from 'commander';
import { loadConfig, getConfigManager, saveLocalConfig, saveGlobalConfig } from '../config';
import { Logger } from '../utils/logger';

export function createConfigCommand(): Command {
  const configCmd = new Command('config').description('Manage configuration settings');

  // Get configuration
  configCmd
    .command('get')
    .description('Display current configuration')
    .option('--working-dir <dir>', 'Working directory')
    .option('--global', 'Show global configuration only')
    .option('--local', 'Show local configuration only')
    .action(async options => {
      try {
        const workingDir = options.workingDir || process.cwd();
        const config = await loadConfig(workingDir);

        console.log(JSON.stringify(config, null, 2));
      } catch (error) {
        Logger.error('Failed to get configuration:', error);
        process.exit(1);
      }
    });

  // Set configuration
  configCmd
    .command('set')
    .description('Set configuration values')
    .argument('<key>', 'Configuration key (e.g., server.port, logging.level)')
    .argument('<value>', 'Configuration value')
    .option('--working-dir <dir>', 'Working directory')
    .option('--global', 'Save to global configuration')
    .option('--local', 'Save to local configuration (default)')
    .action(async (key, value, options) => {
      try {
        const workingDir = options.workingDir || process.cwd();
        const configManager = getConfigManager(workingDir);

        await configManager.loadConfig();

        // Parse the key path and value
        const keyPath = key.split('.');
        const parsedValue = parseConfigValue(value);

        // Build the update object
        const updates: any = {};
        let current = updates;
        for (let i = 0; i < keyPath.length - 1; i++) {
          current[keyPath[i]] = {};
          current = current[keyPath[i]];
        }
        current[keyPath[keyPath.length - 1]] = parsedValue;

        configManager.updateConfig(updates);

        // Save configuration
        if (options.global) {
          await saveGlobalConfig(workingDir);
          Logger.log(`Configuration saved to global config`);
        } else {
          await saveLocalConfig(workingDir);
          Logger.log(`Configuration saved to local config`);
        }

        Logger.log(`Set ${key} = ${JSON.stringify(parsedValue)}`);
      } catch (error) {
        Logger.error('Failed to set configuration:', error);
        process.exit(1);
      }
    });

  // List configuration keys
  configCmd
    .command('list')
    .description('List all configuration keys and their current values')
    .option('--working-dir <dir>', 'Working directory')
    .action(async options => {
      try {
        const workingDir = options.workingDir || process.cwd();
        const config = await loadConfig(workingDir);

        console.log('Configuration keys and values:');
        console.log('');

        // Server configuration
        console.log('Server:');
        console.log(`  server.host = ${JSON.stringify(config.server.host)}`);
        console.log(`  server.port = ${JSON.stringify(config.server.port)}`);
        console.log(`  server.transport = ${JSON.stringify(config.server.transport)}`);
        console.log('');

        // Manifests configuration
        console.log('Manifests:');
        console.log(`  manifests.exclude = ${JSON.stringify(config.manifests.exclude)}`);
        console.log(`  manifests.searchPaths = ${JSON.stringify(config.manifests.searchPaths)}`);
        console.log('');

        // Logging configuration
        console.log('Logging:');
        console.log(`  logging.level = ${JSON.stringify(config.logging.level)}`);
        if (config.logging.file) {
          console.log(`  logging.file = ${JSON.stringify(config.logging.file)}`);
        }
      } catch (error) {
        Logger.error('Failed to list configuration:', error);
        process.exit(1);
      }
    });

  // Reset configuration
  configCmd
    .command('reset')
    .description('Reset configuration to defaults')
    .option('--working-dir <dir>', 'Working directory')
    .option('--global', 'Reset global configuration')
    .option('--local', 'Reset local configuration')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async options => {
      try {
        if (!options.confirm) {
          console.log('This will reset configuration to defaults. Use --confirm to proceed.');
          process.exit(1);
        }

        const workingDir = options.workingDir || process.cwd();
        const configManager = getConfigManager(workingDir);

        // Reset to defaults
        await configManager.loadConfig();
        configManager.updateConfig({});

        // Save configuration
        if (options.global) {
          await saveGlobalConfig(workingDir);
          Logger.log('Global configuration reset to defaults');
        } else if (options.local) {
          await saveLocalConfig(workingDir);
          Logger.log('Local configuration reset to defaults');
        } else {
          Logger.log('Specify --global or --local to reset configuration');
          process.exit(1);
        }
      } catch (error) {
        Logger.error('Failed to reset configuration:', error);
        process.exit(1);
      }
    });

  return configCmd;
}

function parseConfigValue(value: string): any {
  // Try to parse as JSON first
  try {
    return JSON.parse(value);
  } catch {
    // If not valid JSON, treat as string
    return value;
  }
}
