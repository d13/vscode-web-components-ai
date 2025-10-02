import { Command } from 'commander';
import { loadConfig, getConfigManager } from '../config';
import { Logger } from '../utils/logger';
import { ManifestLocationProvider, ManifestsProvider } from '../cem';
import { createHttpTransport, startStdioServer } from '../transports';
import { saveServerStatus } from './server';

export function createStartCommand(): Command {
  return new Command('start')
    .description('Start the MCP server')
    .option('-p, --port <port>', 'Port to listen on (0 for auto-assign)', parseInt)
    .option('-h, --host <host>', 'Host to bind to')
    .option('-t, --transport <transport>', 'Transport type (http, sse, stdio)', /^(http|sse|stdio)$/)
    .option('--log-level <level>', 'Log level (off, error, warn, info, debug)', /^(off|error|warn|info|debug)$/)
    .option('--working-dir <dir>', 'Working directory for manifest discovery')
    .action(async options => {
      try {
        const workingDir = options.workingDir || process.cwd();
        const configManager = getConfigManager(workingDir);

        // Load base configuration
        const config = await configManager.loadConfig();

        // Override with command line options
        const updates: any = {};
        if (options.port !== undefined) {
          updates.server = { ...updates.server, port: options.port };
        }
        if (options.host) {
          updates.server = { ...updates.server, host: options.host };
        }
        if (options.transport) {
          updates.server = { ...updates.server, transport: options.transport };
        }
        if (options.logLevel) {
          updates.logging = { ...updates.logging, level: options.logLevel };
        }

        if (Object.keys(updates).length > 0) {
          configManager.updateConfig(updates);
        }

        const finalConfig = configManager.getConfig();

        // Set up logging
        Logger.setLevel(finalConfig.logging.level);

        Logger.log(`Starting MCP server with transport: ${finalConfig.server.transport}`);
        Logger.debug('Configuration:', finalConfig);

        // Initialize CEM system
        const locator = new ManifestLocationProvider(workingDir);
        const cemReader = new ManifestsProvider(locator);

        // Start the appropriate transport
        if (finalConfig.server.transport === 'stdio') {
          Logger.log('Starting STDIO transport...');

          // Save server status
          await saveServerStatus({
            transport: 'stdio',
            configFile: workingDir,
          });

          await startStdioServer(cemReader, {
            mcp: { name: 'wcai-server', version: '1.0.0' },
          });
        } else {
          Logger.log(`Starting HTTP transport on ${finalConfig.server.host}:${finalConfig.server.port}...`);
          const transportInfo = await createHttpTransport(cemReader, finalConfig.server.port, finalConfig.server.host, {
            mcp: { name: 'wcai-server', version: '1.0.0' },
          });

          Logger.log(`MCP server started successfully!`);
          Logger.log(`HTTP endpoint: ${transportInfo.mcpUrl}`);
          Logger.log(`SSE endpoint: ${transportInfo.sseUrl}`);

          // Save server status
          await saveServerStatus({
            host: finalConfig.server.host,
            port: transportInfo.port,
            transport: finalConfig.server.transport,
            configFile: workingDir,
          });

          // Keep the process alive
          process.on('SIGINT', () => {
            Logger.log('Shutting down MCP server...');
            transportInfo.httpServer.close(() => {
              Logger.log('MCP server stopped');
              process.exit(0);
            });
          });

          process.on('SIGTERM', () => {
            Logger.log('Shutting down MCP server...');
            transportInfo.httpServer.close(() => {
              Logger.log('MCP server stopped');
              process.exit(0);
            });
          });
        }
      } catch (error) {
        Logger.error('Failed to start MCP server:', error);
        process.exit(1);
      }
    });
}
