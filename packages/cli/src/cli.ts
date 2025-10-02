import { Command } from 'commander';
import { version } from '../package.json';
import {
  createStartCommand,
  createConfigCommand,
  createListCommand,
  createLocateCommand,
  createIncludeCommand,
  createExcludeCommand,
  createSearchCommand,
  createGetCommand,
  createComponentsCommand,
  createStatusCommand,
  createStopCommand,
  createSetupCommand,
  createInstallCommand,
  runInteractiveMode,
} from './commands';

export const program = new Command();

program.name('wcai').description('Web Component AI Tools CLI - MCP server for AI assistants').version(version);

// Server commands
program.addCommand(createStartCommand());
program.addCommand(createStopCommand());
program.addCommand(createStatusCommand());

// Configuration commands
program.addCommand(createConfigCommand());

// Manifest commands
program.addCommand(createListCommand());
program.addCommand(createLocateCommand());
program.addCommand(createIncludeCommand());
program.addCommand(createExcludeCommand());

// Component commands
program.addCommand(createSearchCommand());
program.addCommand(createGetCommand());
program.addCommand(createComponentsCommand());

// Setup commands
program.addCommand(createSetupCommand());
program.addCommand(createInstallCommand());

// Default action when no command is provided
program.action(async () => {
  await runInteractiveMode();
});
