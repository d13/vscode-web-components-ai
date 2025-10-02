import inquirer from 'inquirer';
import { Logger } from '../utils/logger';
import { loadConfig } from '../config';
import { ManifestLocationProvider } from '../cem';

export interface InteractiveChoice {
  name: string;
  value: string;
  description?: string;
}

export const MAIN_MENU_CHOICES: InteractiveChoice[] = [
  {
    name: '🚀 Start MCP server',
    value: 'start',
    description: 'Start the MCP server with current configuration',
  },
  {
    name: '⚙️  Configure settings',
    value: 'config',
    description: 'View and modify configuration settings',
  },
  {
    name: '📋 List components',
    value: 'components',
    description: 'Show all available web components',
  },
  {
    name: '🔍 Search components',
    value: 'search',
    description: 'Search for specific web components',
  },
  {
    name: '📁 Manage manifests',
    value: 'manifests',
    description: 'Include/exclude component manifests',
  },
  {
    name: '🛠️  Setup MCP integration',
    value: 'setup',
    description: 'Run the interactive setup wizard',
  },
  {
    name: '📖 View help',
    value: 'help',
    description: 'Show available commands and options',
  },
  {
    name: '🚪 Exit',
    value: 'exit',
    description: 'Exit the interactive mode',
  },
];

export async function runInteractiveMode(): Promise<void> {
  console.log('');
  console.log('🌟 Welcome to Web Component AI Tools');
  console.log('=====================================');
  console.log('');

  // Show current status
  await showCurrentStatus();

  while (true) {
    console.log('');

    const { action } = await inquirer.prompt({
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: MAIN_MENU_CHOICES.map(choice => ({
        name: choice.name,
        value: choice.value,
        short: choice.name.replace(/[🚀⚙️📋🔍📁🛠️📖🚪]\s*/, ''),
      })),
      pageSize: 10,
    });

    console.log('');

    try {
      switch (action) {
        case 'start':
          await handleStartServer();
          break;
        case 'config':
          await handleConfigMenu();
          break;
        case 'components':
          await handleListComponents();
          break;
        case 'search':
          await handleSearchComponents();
          break;
        case 'manifests':
          await handleManifestMenu();
          break;
        case 'setup':
          await handleSetupWizard();
          break;
        case 'help':
          await handleShowHelp();
          break;
        case 'exit':
          console.log('👋 Goodbye!');
          return;
        default:
          console.log('❌ Unknown action');
      }
    } catch (error) {
      Logger.error('Interactive mode error:', error);
      console.log('❌ An error occurred. Please try again.');
    }

    // Ask if user wants to continue
    if (action !== 'exit') {
      const { continueChoice } = await inquirer.prompt({
        type: 'confirm',
        name: 'continueChoice',
        message: 'Continue with another action?',
        default: true,
      });

      if (!continueChoice) {
        console.log('👋 Goodbye!');
        return;
      }
    }
  }
}

async function showCurrentStatus(): Promise<void> {
  try {
    const config = await loadConfig(process.cwd());
    const locator = new ManifestLocationProvider(process.cwd());
    const manifests = await locator.getManifests();

    console.log('📊 Current Status:');
    console.log(`   • Working directory: ${process.cwd()}`);
    console.log(`   • Server transport: ${config.server.transport}`);
    console.log(`   • Server host: ${config.server.host}:${config.server.port || 'auto'}`);
    console.log(`   • Log level: ${config.logging.level}`);
    console.log(`   • Manifests found: ${manifests.length}`);

    if (config.manifests.exclude.length > 0) {
      console.log(`   • Excluded manifests: ${config.manifests.exclude.length}`);
    }
  } catch (error) {
    console.log('⚠️  Could not load current status');
  }
}

async function handleStartServer(): Promise<void> {
  console.log('🚀 Starting MCP server...');
  console.log('💡 This will start the server in the background.');
  console.log('💡 Use "wcai stop" to stop the server later.');
  console.log('');

  // Import and execute start command
  const { spawn } = await import('child_process');
  const child = spawn('node', ['bin/wcai', 'start'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  return new Promise(resolve => {
    child.on('close', code => {
      if (code === 0) {
        console.log('✅ Server started successfully');
      } else {
        console.log('❌ Failed to start server');
      }
      resolve();
    });
  });
}

async function handleConfigMenu(): Promise<void> {
  const { configAction } = await inquirer.prompt({
    type: 'list',
    name: 'configAction',
    message: 'Configuration options:',
    choices: [
      { name: '📖 View current configuration', value: 'view' },
      { name: '✏️  Edit configuration', value: 'edit' },
      { name: '🔄 Reset to defaults', value: 'reset' },
      { name: '⬅️  Back to main menu', value: 'back' },
    ],
  });

  if (configAction === 'back') return;

  const { spawn } = await import('child_process');
  const args = ['bin/wcai', 'config'];

  switch (configAction) {
    case 'view':
      args.push('get');
      break;
    case 'edit':
      console.log('💡 Use "wcai config set <key> <value>" to modify settings');
      console.log('💡 Available keys: server.host, server.port, server.transport, logging.level');
      return;
    case 'reset':
      args.push('reset');
      break;
  }

  const child = spawn('node', args, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  return new Promise(resolve => {
    child.on('close', () => resolve());
  });
}

async function handleListComponents(): Promise<void> {
  console.log('📋 Listing all components...');

  const { spawn } = await import('child_process');
  const child = spawn('node', ['bin/wcai', 'components'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  return new Promise(resolve => {
    child.on('close', () => resolve());
  });
}

async function handleSearchComponents(): Promise<void> {
  const { query } = await inquirer.prompt({
    type: 'input',
    name: 'query',
    message: 'Enter search query (component name, tag, or description):',
    validate: (input: string) => input.trim().length > 0 || 'Please enter a search query',
  });

  console.log(`🔍 Searching for: "${query}"`);

  const { spawn } = await import('child_process');
  const child = spawn('node', ['bin/wcai', 'search', query], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  return new Promise(resolve => {
    child.on('close', () => resolve());
  });
}

async function handleManifestMenu(): Promise<void> {
  const { manifestAction } = await inquirer.prompt({
    type: 'list',
    name: 'manifestAction',
    message: 'Manifest management:',
    choices: [
      { name: '📋 List all manifests', value: 'list' },
      { name: '🔍 Locate manifests', value: 'locate' },
      { name: '✅ Include manifests', value: 'include' },
      { name: '❌ Exclude manifests', value: 'exclude' },
      { name: '⬅️  Back to main menu', value: 'back' },
    ],
  });

  if (manifestAction === 'back') return;

  const { spawn } = await import('child_process');
  const args = ['bin/wcai'];

  switch (manifestAction) {
    case 'list':
      args.push('list');
      break;
    case 'locate':
      args.push('locate');
      break;
    case 'include':
      await handleInteractiveManifestSelection('include');
      return;
    case 'exclude':
      await handleInteractiveManifestSelection('exclude');
      return;
  }

  const child = spawn('node', args, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  return new Promise(resolve => {
    child.on('close', () => resolve());
  });
}

async function handleInteractiveManifestSelection(action: 'include' | 'exclude'): Promise<void> {
  try {
    const locator = new ManifestLocationProvider(process.cwd());
    const manifests = await locator.getManifests();

    if (manifests.length === 0) {
      console.log('⚠️  No manifests found in the current workspace');
      return;
    }

    const config = await loadConfig(process.cwd());
    const excludedSet = new Set(config.manifests.exclude);

    const choices = manifests.map(manifest => {
      const uri = manifest.toString();
      const isExcluded = excludedSet.has(uri);
      const status = isExcluded ? '❌' : '✅';
      const type = uri.includes('node_modules') ? 'dependency' : 'local';

      return {
        name: `${status} ${uri} (${type})`,
        value: uri,
        checked: action === 'include' ? !isExcluded : isExcluded,
      };
    });

    const { selectedManifests } = await inquirer.prompt({
      type: 'checkbox',
      name: 'selectedManifests',
      message: `Select manifests to ${action}:`,
      choices,
      pageSize: 15,
    });

    if (selectedManifests.length === 0) {
      console.log('No manifests selected');
      return;
    }

    console.log(
      `\n${action === 'include' ? '✅' : '❌'} ${action === 'include' ? 'Including' : 'Excluding'} ${selectedManifests.length} manifest(s):`,
    );

    for (const manifest of selectedManifests) {
      console.log(`   • ${manifest}`);

      const { spawn } = await import('child_process');
      const child = spawn('node', ['bin/wcai', action, manifest], {
        stdio: 'pipe',
        cwd: process.cwd(),
      });

      await new Promise(resolve => {
        child.on('close', () => resolve(undefined));
      });
    }

    console.log(`\n✅ Successfully ${action}d ${selectedManifests.length} manifest(s)`);
  } catch (error) {
    console.log(`❌ Error managing manifests: ${error}`);
  }
}

async function handleSetupWizard(): Promise<void> {
  console.log('🛠️  Running setup wizard...');

  const { spawn } = await import('child_process');
  const child = spawn('node', ['bin/wcai', 'setup'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  return new Promise(resolve => {
    child.on('close', () => resolve());
  });
}

async function handleShowHelp(): Promise<void> {
  console.log('📖 Available Commands:');
  console.log('');

  const { spawn } = await import('child_process');
  const child = spawn('node', ['bin/wcai', '--help'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  return new Promise(resolve => {
    child.on('close', () => resolve());
  });
}
