# @wcai/cli

A standalone CLI for Web Component AI Tools that provides a Model Context Protocol (MCP) server for AI assistants to access web component information from your workspace and dependencies.

## Installation

### Global Installation (Recommended)

```bash
npm install -g @wcai/cli
```

### Local Installation

```bash
npm install @wcai/cli
# or
pnpm add @wcai/cli
# or
yarn add @wcai/cli
```

## Quick Start

1. **Install the CLI globally:**

   ```bash
   npm install -g @wcai/cli
   ```

2. **Run the setup wizard:**

   ```bash
   wcai setup
   ```

3. **Start the MCP server:**

   ```bash
   wcai start
   ```

4. **Configure your AI assistant** to use the MCP server (see [AI Assistant Configuration](#ai-assistant-configuration))

## Features

- 🚀 **Multiple Transport Protocols**: HTTP, Server-Sent Events (SSE), and STDIO
- 🔍 **Component Discovery**: Automatically finds custom elements manifests in your workspace and dependencies
- ⚙️ **Flexible Configuration**: Multi-level configuration with command line, environment variables, and config files
- 🎯 **Interactive Setup**: Guided setup wizard for easy configuration
- 📊 **Comprehensive Logging**: Configurable log levels for debugging and monitoring
- 🔄 **Hot Reloading**: Automatically detects changes to manifest files
- 🧪 **Cross-Platform**: Works on Windows, macOS, and Linux

## Commands

### Server Management

```bash
# Start the MCP server
wcai start [options]

# Stop the MCP server
wcai stop

# Check server status
wcai status
```

### Configuration

```bash
# View current configuration
wcai config get [key]

# Set configuration values
wcai config set <key> <value> [--global]

# List all configuration keys
wcai config list

# Reset configuration to defaults
wcai config reset [--global]
```

### Manifest Management

```bash
# List discovered manifests
wcai list [--show-sources]

# Locate manifests with details
wcai locate [--show-sources]

# Include a manifest in discovery
wcai include <uri>

# Exclude a manifest from discovery
wcai exclude <uri>
```

### Component Queries

```bash
# Search for components
wcai search <query> [--matching=any|all|strict]

# Get component details by tag or class name
wcai get <identifier> [--by=tag|class]

# List all available components
wcai components [--include-details]
```

### Setup and Installation

```bash
# Interactive setup wizard
wcai setup

# Generate MCP configuration files
wcai install
```

## Configuration

The CLI supports multiple configuration sources with the following precedence (highest to lowest):

1. **Command line arguments**
2. **Environment variables** (prefixed with `WCAI_`)
3. **Local config file** (`wcai.config.json`)
4. **Global config file** (`~/.wcai/config.json`)
5. **Default values**

### Configuration Schema

```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 0,
    "transport": "http"
  },
  "manifests": {
    "exclude": [],
    "searchPaths": []
  },
  "logging": {
    "level": "info"
  }
}
```

### Environment Variables

- `WCAI_SERVER_HOST` - Server host address
- `WCAI_SERVER_PORT` - Server port number
- `WCAI_SERVER_TRANSPORT` - Transport protocol (http, sse, stdio)
- `WCAI_LOG_LEVEL` - Logging level (off, error, warn, info, debug)
- `WCAI_MANIFESTS_EXCLUDE` - Comma-separated list of manifest URIs to exclude

## Transport Protocols

### HTTP Transport

The default transport protocol. Provides REST API endpoints:

- `GET /mcp` - MCP server endpoint
- `POST /mcp` - MCP server endpoint
- `GET /sse` - Server-Sent Events endpoint

```bash
wcai start --transport http --port 3000
```

### Server-Sent Events (SSE)

Real-time communication using Server-Sent Events:

```bash
wcai start --transport sse --port 3000
```

### STDIO Transport

Standard input/output communication, ideal for AI assistant integration:

```bash
wcai start --transport stdio
```

## AI Assistant Configuration

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "wcai": {
      "command": "wcai",
      "args": ["start", "--transport", "stdio"],
      "env": {
        "WCAI_LOG_LEVEL": "warn"
      }
    }
  }
}
```

### Cline (VS Code Extension)

Add to your Cline MCP settings:

```json
{
  "wcai": {
    "command": "wcai",
    "args": ["start", "--transport", "stdio"],
    "env": {
      "WCAI_LOG_LEVEL": "warn"
    }
  }
}
```

## MCP Tools

The CLI provides the following MCP tools for AI assistants:

### `search-web-components`

Search for web components by name, tag, or description.

**Parameters:**

- `query` (string): Search term
- `matching` (string, optional): Matching strategy - "any", "all", or "strict"

### `get-web-component-details-by-tag-name`

Get detailed information about a component by its tag name.

**Parameters:**

- `tagName` (string): The tag name of the component

### `get-web-component-details-by-class-name`

Get detailed information about a component by its class name.

**Parameters:**

- `className` (string): The class name of the component

### `list-all-web-components`

List all available web components.

**Parameters:**

- `includeDetails` (boolean, optional): Include full component details

## MCP Resources

### `manifest://components`

Returns all discovered web components as JSON.

### `manifest://components/{tag}`

Returns detailed information for a specific component by tag name.

## Development

### Building

```bash
pnpm run build
```

### Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage
```

### Linting and Formatting

```bash
# Lint code
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Format code
pnpm run format

# Check formatting
pnpm run format:check
```

## Troubleshooting

### Common Issues

1. **"wcai: command not found"**
   - Make sure the CLI is installed globally: `npm install -g @wcai/cli`
   - Check that your npm global bin directory is in your PATH

2. **"No manifests found"**
   - Ensure your project has `custom-elements.json` files or `customElements` field in `package.json`
   - Run `wcai locate` to see what manifests are being discovered
   - Check the `manifests.searchPaths` configuration

3. **"Port already in use"**
   - Use a different port: `wcai start --port 3001`
   - Or use auto-assign: `wcai start --port 0`

4. **AI assistant can't connect**
   - Verify the MCP server is running: `wcai status`
   - Check the transport protocol matches your AI assistant configuration
   - For STDIO transport, ensure the AI assistant is configured to spawn the CLI process

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
wcai start --log-level debug
```

Or set the environment variable:

```bash
WCAI_LOG_LEVEL=debug wcai start
```

## Contributing

See the main repository [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## License

See [LICENSE](../../LICENSE) file in the repository root.
