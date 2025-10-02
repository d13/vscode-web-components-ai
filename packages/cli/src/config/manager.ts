import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CliConfig,
  CliConfigSchema,
  DEFAULT_CONFIG,
  FullCliConfig,
  FullServerConfigSchema,
  FullManifestsConfigSchema,
  FullLoggingConfigSchema,
} from './schema';
import { Logger } from '../utils/logger';

export class ConfigManager {
  private _config: FullCliConfig = { ...DEFAULT_CONFIG };
  private _configLoaded = false;

  constructor(private readonly workingDirectory: string = process.cwd()) {}

  /**
   * Load configuration from all sources in priority order:
   * 1. Command line arguments (handled externally)
   * 2. Environment variables
   * 3. Local config file (wcai.config.json)
   * 4. Global config file (~/.wcai/config.json)
   * 5. Default values
   */
  async loadConfig(): Promise<FullCliConfig> {
    if (this._configLoaded) {
      return this._config;
    }

    // Start with defaults
    let config: CliConfig = { ...DEFAULT_CONFIG };

    // 4. Load global config file
    const globalConfig = await this.loadGlobalConfig();
    if (globalConfig) {
      config = this.mergeConfigs(config, globalConfig);
    }

    // 3. Load local config file
    const localConfig = await this.loadLocalConfig();
    if (localConfig) {
      config = this.mergeConfigs(config, localConfig);
    }

    // 2. Load environment variables
    const envConfig = this.loadEnvironmentConfig();
    if (envConfig) {
      config = this.mergeConfigs(config, envConfig);
    }

    // Validate and set the final config
    this._config = this.validateConfig(config);
    this._configLoaded = true;

    return this._config;
  }

  /**
   * Get the current configuration
   */
  getConfig(): FullCliConfig {
    return { ...this._config };
  }

  /**
   * Update configuration with new values
   */
  updateConfig(updates: CliConfig): FullCliConfig {
    this._config = this.validateConfig(this.mergeConfigs(this._config, updates));
    return this._config;
  }

  /**
   * Save current configuration to local config file
   */
  async saveLocalConfig(): Promise<void> {
    const configPath = this.getLocalConfigPath();
    const configDir = path.dirname(configPath);

    try {
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(this._config, null, 2));
      Logger.debug(`Configuration saved to ${configPath}`);
    } catch (error) {
      Logger.error(`Failed to save local config to ${configPath}:`, error);
      throw error;
    }
  }

  /**
   * Save current configuration to global config file
   */
  async saveGlobalConfig(): Promise<void> {
    const configPath = this.getGlobalConfigPath();
    const configDir = path.dirname(configPath);

    try {
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(this._config, null, 2));
      Logger.debug(`Configuration saved to ${configPath}`);
    } catch (error) {
      Logger.error(`Failed to save global config to ${configPath}:`, error);
      throw error;
    }
  }

  private async loadLocalConfig(): Promise<CliConfig | null> {
    const configPath = this.getLocalConfigPath();
    return this.loadConfigFile(configPath);
  }

  private async loadGlobalConfig(): Promise<CliConfig | null> {
    const configPath = this.getGlobalConfigPath();
    return this.loadConfigFile(configPath);
  }

  private async loadConfigFile(configPath: string): Promise<CliConfig | null> {
    try {
      const content = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(content);
      Logger.debug(`Loaded config from ${configPath}`);
      return config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        Logger.warn(`Failed to load config from ${configPath}:`, error);
      }
      return null;
    }
  }

  private loadEnvironmentConfig(): CliConfig | null {
    const config: CliConfig = {};

    // Server configuration
    if (process.env.WCAI_HOST || process.env.WCAI_PORT || process.env.WCAI_TRANSPORT) {
      config.server = {};
      if (process.env.WCAI_HOST) {
        config.server.host = process.env.WCAI_HOST;
      }
      if (process.env.WCAI_PORT) {
        const port = parseInt(process.env.WCAI_PORT, 10);
        if (!isNaN(port)) {
          config.server.port = port;
        }
      }
      if (process.env.WCAI_TRANSPORT) {
        config.server.transport = process.env.WCAI_TRANSPORT as any;
      }
    }

    // Logging configuration
    if (process.env.WCAI_LOG_LEVEL || process.env.WCAI_LOG_FILE) {
      config.logging = {};
      if (process.env.WCAI_LOG_LEVEL) {
        config.logging.level = process.env.WCAI_LOG_LEVEL as any;
      }
      if (process.env.WCAI_LOG_FILE) {
        config.logging.file = process.env.WCAI_LOG_FILE;
      }
    }

    // Manifests configuration
    if (process.env.WCAI_EXCLUDE_MANIFESTS || process.env.WCAI_SEARCH_PATHS) {
      config.manifests = {};
      if (process.env.WCAI_EXCLUDE_MANIFESTS) {
        const exclude = process.env.WCAI_EXCLUDE_MANIFESTS.split(',').map(s => s.trim());
        config.manifests.exclude = exclude;
      }
      if (process.env.WCAI_SEARCH_PATHS) {
        const searchPaths = process.env.WCAI_SEARCH_PATHS.split(',').map(s => s.trim());
        config.manifests.searchPaths = searchPaths;
      }
    }

    // Return null if no environment variables were set
    return Object.keys(config).length > 0 ? config : null;
  }

  private mergeConfigs(base: CliConfig | FullCliConfig, override: CliConfig): CliConfig {
    const result: CliConfig = {};

    if (base.server || override.server) {
      result.server = { ...base.server, ...override.server };
    }

    if (base.manifests || override.manifests) {
      result.manifests = { ...base.manifests, ...override.manifests };
    }

    if (base.logging || override.logging) {
      result.logging = { ...base.logging, ...override.logging };
    }

    return result;
  }

  private validateConfig(config: CliConfig): FullCliConfig {
    try {
      // Validate the partial config first
      const validated = CliConfigSchema.parse(config);

      // Then apply defaults to create full config
      const server = FullServerConfigSchema.parse({ ...DEFAULT_CONFIG.server, ...validated.server });
      const manifests = FullManifestsConfigSchema.parse({ ...DEFAULT_CONFIG.manifests, ...validated.manifests });
      const logging = FullLoggingConfigSchema.parse({ ...DEFAULT_CONFIG.logging, ...validated.logging });

      return { server, manifests, logging };
    } catch (error) {
      Logger.error('Invalid configuration:', error);
      Logger.warn('Using default configuration');
      return { ...DEFAULT_CONFIG };
    }
  }

  private getLocalConfigPath(): string {
    return path.join(this.workingDirectory, 'wcai.config.json');
  }

  private getGlobalConfigPath(): string {
    return path.join(os.homedir(), '.wcai', 'config.json');
  }
}

// Global configuration manager instance
let globalConfigManager: ConfigManager | undefined;

export function getConfigManager(workingDirectory?: string): ConfigManager {
  if (!globalConfigManager || (workingDirectory && workingDirectory !== process.cwd())) {
    globalConfigManager = new ConfigManager(workingDirectory);
  }
  return globalConfigManager;
}
