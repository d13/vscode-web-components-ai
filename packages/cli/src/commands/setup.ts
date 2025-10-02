import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { loadConfig, saveLocalConfig, getConfigManager } from '../config';
import { ManifestLocationProvider } from '../cem';

export function createSetupCommand(): Command {
  return new Command('setup')
    .description('Interactive setup wizard for Web Component AI Tools')
    .option('--working-dir <dir>', 'Working directory for setup')
    .option('--skip-detection', 'Skip automatic project detection')
    .option('--config-only', 'Only generate configuration, skip MCP setup')
    .action(async options => {
      try {
        const workingDir = options.workingDir || process.cwd();

        console.log('🚀 Web Component AI Tools Setup Wizard');
        console.log('=====================================');
        console.log('');

        // Step 1: Project Detection
        if (!options.skipDetection) {
          console.log('📁 Detecting project structure...');
          await detectProject(workingDir);
          console.log('');
        }

        // Step 2: Manifest Discovery
        console.log('🔍 Discovering web component manifests...');
        const manifestCount = await discoverManifests(workingDir);
        console.log('');

        // Step 3: Configuration Setup
        console.log('⚙️  Setting up configuration...');
        await setupConfiguration(workingDir);
        console.log('');

        // Step 4: MCP Configuration (if not skipped)
        if (!options.configOnly) {
          console.log('🤖 Generating MCP configuration...');
          await generateMcpConfig(workingDir);
          console.log('');
        }

        // Step 5: Summary
        console.log('✅ Setup completed successfully!');
        console.log('');
        console.log('Next steps:');
        console.log('  1. Start the MCP server: wcai start');
        console.log('  2. Configure your AI assistant to use the MCP server');
        if (manifestCount === 0) {
          console.log('  3. Add web component manifests to your project');
        }
        console.log('');
        console.log('For help: wcai --help');
      } catch (error) {
        Logger.error('Setup failed:', error);
        process.exit(1);
      }
    });
}

async function detectProject(workingDir: string): Promise<void> {
  const packageJsonPath = path.join(workingDir, 'package.json');

  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    console.log(`  ✓ Found Node.js project: ${packageJson.name || 'unnamed'}`);

    // Check for common web component frameworks
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const frameworks = [];

    if (dependencies['lit']) frameworks.push('Lit');
    if (dependencies['@stencil/core']) frameworks.push('Stencil');
    if (dependencies['@angular/core']) frameworks.push('Angular');
    if (dependencies['vue']) frameworks.push('Vue');
    if (dependencies['react']) frameworks.push('React');
    if (dependencies['@polymer/polymer']) frameworks.push('Polymer');

    if (frameworks.length > 0) {
      console.log(`  ✓ Detected frameworks: ${frameworks.join(', ')}`);
    }

    // Check for existing custom elements manifest
    if (packageJson.customElements) {
      console.log(`  ✓ Found custom elements manifest reference: ${packageJson.customElements}`);
    }
  } catch (error) {
    console.log('  ⚠️  No package.json found - not a Node.js project');
  }

  // Check for other project types
  const files = await fs.readdir(workingDir);

  if (files.includes('tsconfig.json')) {
    console.log('  ✓ TypeScript project detected');
  }

  if (files.includes('custom-elements.json')) {
    console.log('  ✓ Found custom-elements.json manifest');
  }
}

async function discoverManifests(workingDir: string): Promise<number> {
  const locator = new ManifestLocationProvider(workingDir);
  const manifests = await locator.getManifests();

  console.log(`  Found ${manifests.length} manifest(s):`);

  if (manifests.length === 0) {
    console.log('    ⚠️  No custom elements manifests found');
    console.log('    💡 Consider adding custom-elements.json files to your project');
    console.log('    💡 Or add "customElements" field to package.json');
  } else {
    for (const manifest of manifests.slice(0, 5)) {
      // Show first 5
      console.log(`    ✓ ${manifest.toString()}`);
    }
    if (manifests.length > 5) {
      console.log(`    ... and ${manifests.length - 5} more`);
    }
  }

  return manifests.length;
}

async function setupConfiguration(workingDir: string): Promise<void> {
  const configManager = getConfigManager(workingDir);
  await configManager.loadConfig();

  // Set up basic configuration
  const updates: any = {
    server: {
      host: '127.0.0.1',
      port: 0, // Auto-assign
      transport: 'http',
    },
    logging: {
      level: 'info',
    },
    manifests: {
      exclude: [],
      searchPaths: [],
    },
  };

  configManager.updateConfig(updates);
  await saveLocalConfig(workingDir);

  console.log('  ✓ Created local configuration file (wcai.config.json)');
  console.log('  ✓ Set default server settings (HTTP transport, auto-assign port)');
  console.log('  ✓ Set logging level to info');
}

async function generateMcpConfig(workingDir: string): Promise<void> {
  const config = await loadConfig(workingDir);

  // Generate MCP configuration for different AI assistants
  const mcpConfigs = {
    claude: {
      mcpServers: {
        wcai: {
          command: 'wcai',
          args: ['start', '--transport', 'stdio'],
          env: {
            WCAI_LOG_LEVEL: 'warn',
          },
        },
      },
    },
    cline: {
      wcai: {
        command: 'wcai',
        args: ['start', '--transport', 'stdio'],
        env: {
          WCAI_LOG_LEVEL: 'warn',
        },
      },
    },
  };

  // Save Claude Desktop configuration
  const claudeConfigPath = path.join(workingDir, 'claude_desktop_config.json');
  await fs.writeFile(claudeConfigPath, JSON.stringify(mcpConfigs.claude, null, 2));
  console.log(`  ✓ Generated Claude Desktop config: ${claudeConfigPath}`);

  // Save Cline configuration
  const clineConfigPath = path.join(workingDir, 'cline_mcp_config.json');
  await fs.writeFile(clineConfigPath, JSON.stringify(mcpConfigs.cline, null, 2));
  console.log(`  ✓ Generated Cline config: ${clineConfigPath}`);

  // Generate installation instructions
  const instructions = `
# Web Component AI Tools - MCP Server Setup

## Installation

1. Install the CLI globally:
   \`\`\`bash
   npm install -g @wcai/cli
   \`\`\`

2. Test the installation:
   \`\`\`bash
   wcai --version
   \`\`\`

## Configuration

### Claude Desktop

Add this to your Claude Desktop configuration file:

\`\`\`json
${JSON.stringify(mcpConfigs.claude, null, 2)}
\`\`\`

Configuration file locations:
- macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
- Windows: %APPDATA%\\Claude\\claude_desktop_config.json

### Cline (VS Code Extension)

Add this to your Cline MCP settings:

\`\`\`json
${JSON.stringify(mcpConfigs.cline, null, 2)}
\`\`\`

## Usage

Start the server manually:
\`\`\`bash
wcai start
\`\`\`

Or use STDIO mode (recommended for AI assistants):
\`\`\`bash
wcai start --transport stdio
\`\`\`

## Available Tools

- \`search-web-components\` - Search for components by name, tag, or description
- \`get-web-component-details-by-tag-name\` - Get component details by tag name
- \`get-web-component-details-by-class-name\` - Get component details by class name
- \`list-all-web-components\` - List all available components

## Configuration

View current configuration:
\`\`\`bash
wcai config get
\`\`\`

Update configuration:
\`\`\`bash
wcai config set server.port 3000
wcai config set logging.level debug
\`\`\`
`;

  const readmePath = path.join(workingDir, 'WCAI_SETUP.md');
  await fs.writeFile(readmePath, instructions);
  console.log(`  ✓ Generated setup instructions: ${readmePath}`);
}
