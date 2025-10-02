import { workspace, window } from 'vscode';
import type { Container } from '../container';
import { Logger } from '../system/logger';
import { CliMcpProvider, checkCliAvailability } from './cli-provider';
import type { IMcpProvider } from './types';

/**
 * Factory function to create the CLI-based MCP provider
 */
export async function createMcpProvider(container: Container): Promise<IMcpProvider> {
  Logger.log('Creating CLI-based MCP provider...');

  const isCliAvailable = await checkCliAvailability();

  if (!isCliAvailable) {
    Logger.error('CLI is not available. Please install the WCAI CLI to use this extension.');
    await showCliRequiredNotification(container);
    throw new Error('WCAI CLI is required but not available');
  }

  Logger.log('CLI is available, creating CLI-based MCP provider');
  const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath || container.context.extensionUri.fsPath;
  return new CliMcpProvider(workspaceRoot, container);
}

/**
 * Get the current provider type (always CLI now)
 */
export async function getCurrentProviderType(): Promise<'cli'> {
  return 'cli';
}

/**
 * Show notification when CLI is required but not available
 */
async function showCliRequiredNotification(container: Container): Promise<void> {
  const hasShownRequiredNotification = container.storage.get('hasShownCliRequiredNotification') ?? false;

  if (hasShownRequiredNotification) {
    return;
  }

  const installCli = 'Install CLI';
  const learnMore = 'Learn More';
  const dismiss = 'Dismiss';

  const result = await window.showErrorMessage(
    '❌ WCAI CLI is required to use this extension. Please install the CLI to continue.',
    installCli,
    learnMore,
    dismiss,
  );

  if (result === installCli) {
    window.commands.executeCommand('wcai.installCli');
  } else if (result === learnMore) {
    window.commands.executeCommand('wcai.runCliSetup');
  }

  // Mark as shown regardless of user action
  await container.storage.store('hasShownCliRequiredNotification', true);
}
