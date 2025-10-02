import { workspace, window } from 'vscode';
import type { Container } from '../container';
import { configuration } from '../system/configuration';
import { Logger } from '../system/logger';
import { CliMcpProvider, checkCliAvailability } from './cli-provider';
import { McpProvider } from './provider';
import type { IMcpProvider } from './types';

/**
 * Factory function to create the appropriate MCP provider based on configuration
 */
export async function createMcpProvider(container: Container): Promise<IMcpProvider> {
  const useCliServer = configuration.get('mcp.useCliServer') ?? true; // Default to true now

  if (useCliServer) {
    Logger.log('Attempting to create CLI-based MCP provider...');

    // Check if CLI is available
    const isCliAvailable = await checkCliAvailability();

    if (isCliAvailable) {
      Logger.log('CLI is available, using CLI-based MCP provider');
      // Use the first workspace folder or fallback to extension path
      const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath || container.context.extensionUri.fsPath;
      return new CliMcpProvider(workspaceRoot, container);
    } else {
      Logger.warn('CLI is not available, falling back to built-in MCP provider');
      await showCliUnavailableNotification(container);
    }
  }

  Logger.log('Using built-in MCP provider');

  // Show one-time notification about CLI option (only if user explicitly chose built-in)
  if (!useCliServer) {
    await showCliRecommendationIfNeeded(container);
  }

  return new McpProvider(container);
}

/**
 * Get the current provider type based on configuration and CLI availability
 */
export async function getCurrentProviderType(): Promise<'cli' | 'builtin'> {
  const useCliServer = configuration.get('mcp.useCliServer') ?? false;

  if (useCliServer) {
    const isCliAvailable = await checkCliAvailability();
    return isCliAvailable ? 'cli' : 'builtin';
  }

  return 'builtin';
}

/**
 * Show a one-time notification recommending the CLI to users
 */
async function showCliRecommendationIfNeeded(container: Container): Promise<void> {
  const showRecommendation = configuration.get('mcp.showCliRecommendation') ?? true;
  const hasShownRecommendation = container.storage.get('hasShownCliRecommendation') ?? false;

  if (!showRecommendation || hasShownRecommendation) {
    return;
  }

  // Check if CLI is available
  const isCliAvailable = await checkCliAvailability();

  if (isCliAvailable) {
    // CLI is available but not being used
    const switchToCli = 'Switch to CLI';
    const learnMore = 'Learn More';
    const dismiss = 'Dismiss';

    const result = await window.showInformationMessage(
      '🚀 WCAI CLI is available! Switch to the CLI-based MCP server for better performance and additional features.',
      switchToCli,
      learnMore,
      dismiss,
    );

    if (result === switchToCli) {
      await configuration.updateEffective('mcp.useCliServer', true);
      window.showInformationMessage('✅ Switched to CLI-based MCP server. Restart the MCP server to apply changes.');
    } else if (result === learnMore) {
      // Open documentation or run CLI setup
      window.commands.executeCommand('wcai.runCliSetup');
    }
  } else {
    // CLI is not available, suggest installation
    const installCli = 'Install CLI';
    const learnMore = 'Learn More';
    const dismiss = 'Dismiss';

    const result = await window.showInformationMessage(
      '💡 Install WCAI CLI for better performance and additional features.',
      installCli,
      learnMore,
      dismiss,
    );

    if (result === installCli) {
      window.commands.executeCommand('wcai.installCli');
    } else if (result === learnMore) {
      window.commands.executeCommand('wcai.runCliSetup');
    }
  }

  // Mark as shown regardless of user action
  await container.storage.store('hasShownCliRecommendation', true);
}

/**
 * Show notification when CLI is unavailable and fallback to built-in server
 */
async function showCliUnavailableNotification(container: Container): Promise<void> {
  const hasShownFallbackNotification = container.storage.get('hasShownCliFallbackNotification') ?? false;

  if (hasShownFallbackNotification) {
    return;
  }

  const installCli = 'Install CLI';
  const useBuiltIn = 'Use Built-in Server';
  const dismiss = 'Dismiss';

  const result = await window.showWarningMessage(
    '⚠️ WCAI CLI is not available. Falling back to built-in MCP server. Install the CLI for better performance and additional features.',
    installCli,
    useBuiltIn,
    dismiss,
  );

  if (result === installCli) {
    window.commands.executeCommand('wcai.installCli');
  } else if (result === useBuiltIn) {
    // User explicitly chooses built-in, update configuration
    await configuration.updateEffective('mcp.useCliServer', false);
    window.showInformationMessage(
      '✅ Switched to built-in MCP server. You can switch back to CLI anytime in settings.',
    );
  }

  // Mark as shown regardless of user action
  await container.storage.store('hasShownCliFallbackNotification', true);
}
