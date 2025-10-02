import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import inquirer from 'inquirer';
import { Logger } from '../utils/logger';
import { loadConfig } from '../config';

export interface McpConfig {
  mcpServers: Record<
    string,
    {
      command: string;
      args: string[];
      env?: Record<string, string>;
    }
  >;
}

export interface ClineConfig {
  [key: string]: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
}

export function createInstallCommand(): Command {
  return new Command('install')
    .description('Generate MCP config for AI tools')
    .option(
      '--tool <tool>',
      'Specific AI tool to configure (claude, cline, cursor, all)',
      /^(claude|cline|cursor|all)$/,
    )
    .option('--output-dir <dir>', 'Directory to save configuration files')
    .option('--global', 'Install configuration globally (user home directory)')
    .option('--local', 'Install configuration locally (current directory)')
    .option('--transport <transport>', 'Transport type to use (http, sse, stdio)', /^(http|sse|stdio)$/)
    .option('--dry-run', 'Show what would be generated without writing files')
    .action(async options => {
      try {
        await runInstallWizard(options);
      } catch (error) {
        Logger.error('Install command failed:', error);
        process.exit(1);
      }
    });
}

async function runInstallWizard(options: any): Promise<void> {
  console.log('🤖 MCP Configuration Generator');
  console.log('==============================');
  console.log('');

  // Load current configuration
  const workingDir = process.cwd();
  const config = await loadConfig(workingDir);

  // Interactive prompts if options not provided
  let selectedTools: string[] = [];
  let transport = options.transport || config.server.transport;
  let outputLocation = 'local';
  let outputDir = options.outputDir;

  if (!options.tool) {
    const { tools } = await inquirer.prompt({
      type: 'checkbox',
      name: 'tools',
      message: 'Which AI tools would you like to configure?',
      choices: [
        { name: 'Claude Desktop', value: 'claude', checked: true },
        { name: 'Cline (VS Code Extension)', value: 'cline', checked: true },
        { name: 'Cursor', value: 'cursor', checked: false },
      ],
      validate: (choices: readonly any[]) => choices.length > 0 || 'Please select at least one tool',
    });
    selectedTools = tools;
  } else if (options.tool === 'all') {
    selectedTools = ['claude', 'cline', 'cursor'];
  } else {
    selectedTools = [options.tool];
  }

  if (!options.transport) {
    const { selectedTransport } = await inquirer.prompt({
      type: 'list',
      name: 'selectedTransport',
      message: 'Which transport method would you like to use?',
      choices: [
        { name: 'STDIO (Recommended for AI tools)', value: 'stdio' },
        { name: 'HTTP (Good for debugging)', value: 'http' },
        { name: 'SSE (Server-Sent Events)', value: 'sse' },
      ],
      default: 'stdio',
    });
    transport = selectedTransport;
  }

  if (!options.global && !options.local && !options.outputDir) {
    const { location } = await inquirer.prompt({
      type: 'list',
      name: 'location',
      message: 'Where would you like to save the configuration?',
      choices: [
        { name: 'Current directory (project-specific)', value: 'local' },
        { name: 'User home directory (global)', value: 'global' },
        { name: 'Custom directory', value: 'custom' },
      ],
      default: 'local',
    });
    outputLocation = location;

    if (location === 'custom') {
      const { customDir } = await inquirer.prompt({
        type: 'input',
        name: 'customDir',
        message: 'Enter the directory path:',
        default: workingDir,
        validate: async (input: string) => {
          try {
            const resolvedPath = path.resolve(input);
            await fs.access(path.dirname(resolvedPath));
            return true;
          } catch {
            return 'Directory does not exist or is not accessible';
          }
        },
      });
      outputDir = customDir;
    }
  } else if (options.global) {
    outputLocation = 'global';
  } else if (options.local) {
    outputLocation = 'local';
  }

  // Determine output directory
  if (!outputDir) {
    switch (outputLocation) {
      case 'global':
        outputDir = os.homedir();
        break;
      case 'local':
      default:
        outputDir = workingDir;
        break;
    }
  }

  console.log('');
  console.log('📋 Configuration Summary:');
  console.log(`   • Tools: ${selectedTools.join(', ')}`);
  console.log(`   • Transport: ${transport}`);
  console.log(`   • Output directory: ${outputDir}`);
  console.log('');

  if (options.dryRun) {
    console.log('🔍 Dry run mode - showing what would be generated:');
    console.log('');
  }

  // Generate configurations
  const results: string[] = [];

  for (const tool of selectedTools) {
    try {
      const result = await generateToolConfig(tool, transport, outputDir, options.dryRun);
      results.push(result);
    } catch (error) {
      Logger.error(`Failed to generate config for ${tool}:`, error);
      console.log(`❌ Failed to generate configuration for ${tool}`);
    }
  }

  // Generate installation instructions
  if (!options.dryRun) {
    await generateInstallationInstructions(selectedTools, transport, outputDir);
    results.push('Generated installation instructions');
  }

  console.log('');
  console.log('✅ Configuration generation completed!');
  console.log('');

  if (results.length > 0) {
    console.log('📁 Generated files:');
    results.forEach(result => console.log(`   • ${result}`));
    console.log('');
  }

  if (!options.dryRun) {
    console.log('📖 Next steps:');
    console.log('   1. Review the generated configuration files');
    console.log('   2. Follow the installation instructions in WCAI_INSTALL.md');
    console.log('   3. Restart your AI tool to load the new configuration');
    console.log('   4. Test the integration with: wcai start');
  }
}

async function generateToolConfig(
  tool: string,
  transport: string,
  outputDir: string,
  dryRun: boolean,
): Promise<string> {
  let config: any;
  let filename: string;
  let description: string;

  const baseArgs = ['start', '--transport', transport];
  if (transport !== 'stdio') {
    baseArgs.push('--host', '127.0.0.1', '--port', '0');
  }

  switch (tool) {
    case 'claude':
      config = {
        mcpServers: {
          wcai: {
            command: 'wcai',
            args: baseArgs,
            env: {
              WCAI_LOG_LEVEL: 'warn',
            },
          },
        },
      };
      filename = 'claude_desktop_config.json';
      description = 'Claude Desktop configuration';
      break;

    case 'cline':
      config = {
        wcai: {
          command: 'wcai',
          args: baseArgs,
          env: {
            WCAI_LOG_LEVEL: 'warn',
          },
        },
      };
      filename = 'cline_mcp_config.json';
      description = 'Cline MCP configuration';
      break;

    case 'cursor':
      config = {
        mcpServers: {
          wcai: {
            command: 'wcai',
            args: baseArgs,
            env: {
              WCAI_LOG_LEVEL: 'warn',
            },
          },
        },
      };
      filename = 'cursor_mcp_config.json';
      description = 'Cursor MCP configuration';
      break;

    default:
      throw new Error(`Unsupported tool: ${tool}`);
  }

  const filePath = path.join(outputDir, filename);
  const configJson = JSON.stringify(config, null, 2);

  if (dryRun) {
    console.log(`📄 ${description} (${filename}):`);
    console.log(configJson);
    console.log('');
    return `${description} (dry run)`;
  } else {
    await fs.writeFile(filePath, configJson);
    console.log(`✅ Generated ${description}: ${filePath}`);
    return filePath;
  }
}

async function generateInstallationInstructions(tools: string[], transport: string, outputDir: string): Promise<void> {
  const instructions = `# Web Component AI Tools - Installation Instructions

## Prerequisites

1. Install the CLI globally:
   \`\`\`bash
   npm install -g @wcai/cli
   \`\`\`

2. Verify installation:
   \`\`\`bash
   wcai --version
   \`\`\`

## Configuration Files Generated

${tools
  .map(tool => {
    switch (tool) {
      case 'claude':
        return `### Claude Desktop

Configuration file: \`claude_desktop_config.json\`

**Installation locations:**
- macOS: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
- Windows: \`%APPDATA%\\Claude\\claude_desktop_config.json\`
- Linux: \`~/.config/Claude/claude_desktop_config.json\`

Copy the generated \`claude_desktop_config.json\` to the appropriate location for your system.`;

      case 'cline':
        return `### Cline (VS Code Extension)

Configuration file: \`cline_mcp_config.json\`

1. Open VS Code
2. Install the Cline extension if not already installed
3. Open Cline settings
4. Add the MCP server configuration from \`cline_mcp_config.json\``;

      case 'cursor':
        return `### Cursor

Configuration file: \`cursor_mcp_config.json\`

1. Open Cursor settings
2. Navigate to MCP servers configuration
3. Add the configuration from \`cursor_mcp_config.json\``;

      default:
        return '';
    }
  })
  .join('\n\n')}

## Testing the Integration

1. Start the MCP server:
   \`\`\`bash
   wcai start${transport !== 'stdio' ? ` --transport ${transport}` : ''}
   \`\`\`

2. Open your AI tool and verify the connection
3. Try asking about web components in your project

## Available MCP Tools

Once configured, your AI assistant will have access to these tools:

- \`search-web-components\` - Search for components by name, tag, or description
- \`get-web-component-details-by-tag-name\` - Get component details by tag name
- \`get-web-component-details-by-class-name\` - Get component details by class name
- \`list-all-web-components\` - List all available components

## Troubleshooting

### Server won't start
- Check that the CLI is installed globally: \`wcai --version\`
- Verify your project has web component manifests: \`wcai list\`
- Check server status: \`wcai status\`

### AI tool can't connect
- Ensure the server is running: \`wcai status\`
- Check the configuration file syntax
- Restart your AI tool after configuration changes

### No components found
- Run manifest discovery: \`wcai locate\`
- Check for custom-elements.json files in your project
- Verify manifests aren't excluded: \`wcai config get\`

## Getting Help

- CLI help: \`wcai --help\`
- Interactive mode: \`wcai\` (no arguments)
- Setup wizard: \`wcai setup\`
- Configuration help: \`wcai config --help\`

For more information, visit: https://github.com/d13/vscode-web-components-ai
`;

  const instructionsPath = path.join(outputDir, 'WCAI_INSTALL.md');
  await fs.writeFile(instructionsPath, instructions);
  console.log(`📖 Generated installation instructions: ${instructionsPath}`);
}
