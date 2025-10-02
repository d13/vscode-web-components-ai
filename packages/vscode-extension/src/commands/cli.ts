import * as vscode from 'vscode';
import { Logger } from '../system/logger';
import { checkCliAvailability, getCliVersion } from '../mcp/cli-provider';

export function registerCliCommands(context: vscode.ExtensionContext): void {
  // Check CLI availability command
  const checkCliCommand = vscode.commands.registerCommand('wcai.checkCli', async () => {
    try {
      const isAvailable = await checkCliAvailability();
      
      if (isAvailable) {
        const version = await getCliVersion();
        vscode.window.showInformationMessage(
          `✅ WCAI CLI is available${version ? ` (${version})` : ''}`
        );
      } else {
        const action = await vscode.window.showWarningMessage(
          '⚠️ WCAI CLI is not available. Install it to use CLI-based MCP server.',
          'Install CLI',
          'Learn More'
        );
        
        if (action === 'Install CLI') {
          vscode.env.openExternal(vscode.Uri.parse('https://www.npmjs.com/package/@wcai/cli'));
        } else if (action === 'Learn More') {
          vscode.env.openExternal(vscode.Uri.parse('https://github.com/d13/vscode-web-components-ai#cli'));
        }
      }
    } catch (error) {
      Logger.error('Failed to check CLI availability:', error);
      vscode.window.showErrorMessage('Failed to check CLI availability');
    }
  });

  // Install CLI command
  const installCliCommand = vscode.commands.registerCommand('wcai.installCli', async () => {
    const terminal = vscode.window.createTerminal('WCAI CLI Installation');
    terminal.show();
    terminal.sendText('npm install -g @wcai/cli');
    
    vscode.window.showInformationMessage(
      'Installing WCAI CLI globally. Check the terminal for progress.'
    );
  });

  // Switch to CLI mode command
  const switchToCliCommand = vscode.commands.registerCommand('wcai.switchToCli', async () => {
    const isAvailable = await checkCliAvailability();
    
    if (!isAvailable) {
      const action = await vscode.window.showWarningMessage(
        'WCAI CLI is not available. Install it first.',
        'Install CLI'
      );
      
      if (action === 'Install CLI') {
        vscode.commands.executeCommand('wcai.installCli');
      }
      return;
    }

    const config = vscode.workspace.getConfiguration('wcai');
    await config.update('mcp.useCliServer', true, vscode.ConfigurationTarget.Workspace);
    
    vscode.window.showInformationMessage(
      '✅ Switched to CLI-based MCP server. Restart the MCP server to apply changes.',
      'Restart Server'
    ).then(action => {
      if (action === 'Restart Server') {
        vscode.commands.executeCommand('wcai.restartMcpServer');
      }
    });
  });

  // Switch to built-in mode command
  const switchToBuiltinCommand = vscode.commands.registerCommand('wcai.switchToBuiltin', async () => {
    const config = vscode.workspace.getConfiguration('wcai');
    await config.update('mcp.useCliServer', false, vscode.ConfigurationTarget.Workspace);
    
    vscode.window.showInformationMessage(
      '✅ Switched to built-in MCP server. Restart the MCP server to apply changes.',
      'Restart Server'
    ).then(action => {
      if (action === 'Restart Server') {
        vscode.commands.executeCommand('wcai.restartMcpServer');
      }
    });
  });

  // Run CLI setup command
  const runSetupCommand = vscode.commands.registerCommand('wcai.runCliSetup', async () => {
    const isAvailable = await checkCliAvailability();
    
    if (!isAvailable) {
      const action = await vscode.window.showWarningMessage(
        'WCAI CLI is not available. Install it first.',
        'Install CLI'
      );
      
      if (action === 'Install CLI') {
        vscode.commands.executeCommand('wcai.installCli');
      }
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const terminal = vscode.window.createTerminal({
      name: 'WCAI Setup',
      cwd: workspaceFolder.uri.fsPath
    });
    terminal.show();
    terminal.sendText('wcai setup');
    
    vscode.window.showInformationMessage(
      'Running WCAI setup wizard. Check the terminal for interactive prompts.'
    );
  });

  context.subscriptions.push(
    checkCliCommand,
    installCliCommand,
    switchToCliCommand,
    switchToBuiltinCommand,
    runSetupCommand
  );
}

export function createCliStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  
  statusBarItem.command = 'wcai.checkCli';
  statusBarItem.tooltip = 'Click to check WCAI CLI availability';
  
  // Update status bar item based on configuration
  const updateStatusBar = async () => {
    const config = vscode.workspace.getConfiguration('wcai');
    const useCliServer = config.get<boolean>('mcp.useCliServer', false);
    
    if (useCliServer) {
      const isAvailable = await checkCliAvailability();
      if (isAvailable) {
        statusBarItem.text = '$(check) WCAI CLI';
        statusBarItem.backgroundColor = undefined;
      } else {
        statusBarItem.text = '$(warning) WCAI CLI';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      }
    } else {
      statusBarItem.text = '$(server) WCAI Built-in';
      statusBarItem.backgroundColor = undefined;
    }
    
    statusBarItem.show();
  };

  // Update on configuration changes
  const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('wcai.mcp.useCliServer')) {
      updateStatusBar();
    }
  });

  // Initial update
  updateStatusBar();

  context.subscriptions.push(statusBarItem, configWatcher);
  return statusBarItem;
}
