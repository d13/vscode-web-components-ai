import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '../utils/logger';

interface ServerStatus {
  pid?: number;
  port?: number;
  host?: string;
  transport?: string;
  startTime?: string;
  configFile?: string;
}

const SERVER_PID_FILE = path.join(os.tmpdir(), 'wcai-server.pid');
const SERVER_INFO_FILE = path.join(os.tmpdir(), 'wcai-server.json');

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Check MCP server status')
    .option('--format <format>', 'Output format (table, json)', /^(table|json)$/, 'table')
    .action(async options => {
      try {
        const status = await getServerStatus();

        if (options.format === 'json') {
          console.log(JSON.stringify(status, null, 2));
        } else {
          if (status.pid) {
            console.log('MCP Server Status: RUNNING');
            console.log(`  PID: ${status.pid}`);
            if (status.host && status.port) {
              console.log(`  Address: ${status.host}:${status.port}`);
            }
            if (status.transport) {
              console.log(`  Transport: ${status.transport}`);
            }
            if (status.startTime) {
              console.log(`  Started: ${status.startTime}`);
            }
            if (status.configFile) {
              console.log(`  Config: ${status.configFile}`);
            }
          } else {
            console.log('MCP Server Status: STOPPED');
          }
        }
      } catch (error) {
        Logger.error('Failed to get server status:', error);
        process.exit(1);
      }
    });
}

export function createStopCommand(): Command {
  return new Command('stop')
    .description('Stop the MCP server')
    .option('--force', 'Force stop the server')
    .action(async options => {
      try {
        const status = await getServerStatus();

        if (!status.pid) {
          console.log('MCP server is not running');
          return;
        }

        try {
          // Try to terminate the process gracefully
          process.kill(status.pid, options.force ? 'SIGKILL' : 'SIGTERM');

          // Wait a bit for graceful shutdown
          if (!options.force) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check if process is still running
            try {
              process.kill(status.pid, 0);
              // Process is still running, force kill
              Logger.warn('Process did not terminate gracefully, force killing...');
              process.kill(status.pid, 'SIGKILL');
            } catch {
              // Process has terminated
            }
          }

          // Clean up status files
          await cleanupServerFiles();

          console.log(`MCP server (PID ${status.pid}) stopped`);
        } catch (error: any) {
          if (error.code === 'ESRCH') {
            // Process doesn't exist, clean up stale files
            await cleanupServerFiles();
            console.log('MCP server was not running (cleaned up stale files)');
          } else {
            throw error;
          }
        }
      } catch (error) {
        Logger.error('Failed to stop server:', error);
        process.exit(1);
      }
    });
}

async function getServerStatus(): Promise<ServerStatus> {
  try {
    // Check if PID file exists
    const pidContent = await fs.readFile(SERVER_PID_FILE, 'utf8');
    const pid = parseInt(pidContent.trim(), 10);

    if (isNaN(pid)) {
      return {};
    }

    // Check if process is actually running
    try {
      process.kill(pid, 0);
    } catch (error: any) {
      if (error.code === 'ESRCH') {
        // Process doesn't exist, clean up stale files
        await cleanupServerFiles();
        return {};
      }
      throw error;
    }

    // Try to read server info
    let serverInfo: any = { pid };
    try {
      const infoContent = await fs.readFile(SERVER_INFO_FILE, 'utf8');
      const info = JSON.parse(infoContent);
      serverInfo = { ...serverInfo, ...info };
    } catch {
      // Info file doesn't exist or is invalid, that's ok
    }

    return serverInfo;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function cleanupServerFiles(): Promise<void> {
  try {
    await fs.unlink(SERVER_PID_FILE);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      Logger.warn('Failed to remove PID file:', error);
    }
  }

  try {
    await fs.unlink(SERVER_INFO_FILE);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      Logger.warn('Failed to remove server info file:', error);
    }
  }
}

export async function saveServerStatus(status: Omit<ServerStatus, 'pid'>): Promise<void> {
  try {
    // Save PID
    await fs.writeFile(SERVER_PID_FILE, process.pid.toString());

    // Save server info
    const serverInfo = {
      ...status,
      startTime: new Date().toISOString(),
    };
    await fs.writeFile(SERVER_INFO_FILE, JSON.stringify(serverInfo, null, 2));
  } catch (error) {
    Logger.warn('Failed to save server status:', error);
  }
}
