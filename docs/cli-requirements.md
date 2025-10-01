# Standalone CLI Requirements

## Overview

This document outlines the requirements for creating a standalone CLI version of the Web Component AI Tools MCP server. The CLI will provide the same functionality as the VS Code extension but as a globally installable npm package that can be used independently or integrated with various editors.

## Goals

- Create a standalone CLI that can be installed globally via `npm install -g @wcai/cli`
- Support HTTP, SSE, and STDIO transports for MCP communication
- Provide all the same MCP tools and resources as the VS Code extension
- Offer a friendly setup experience for new users
- Enable the VS Code extension to use the CLI as its primary MCP server implementation

## Architecture

### Monorepo Structure

```
vscode-wc-ai-tools/                    # Root repository
├── package.json                       # Root package.json with workspace config
├── pnpm-workspace.yaml               # Workspace configuration
├── packages/
│   ├── cli/                          # @wcai/cli package (contains ALL logic)
│   │   ├── package.json             # CLI package config
│   │   ├── src/
│   │   │   ├── index.ts            # CLI entry point
│   │   │   ├── commands/           # CLI command implementations
│   │   │   ├── core/               # Core MCP server logic
│   │   │   ├── cem/                # CEM system
│   │   │   ├── transports/         # HTTP, SSE, STDIO transports
│   │   │   ├── config/             # Configuration management
│   │   │   └── setup/              # Interactive setup wizard
│   │   └── bin/
│   │       └── wcai                # CLI executable
│   └── vscode-extension/             # Thin wrapper around CLI
│       ├── package.json
│       └── src/
│           ├── mcp/
│           │   └── cli-provider.ts  # Spawns CLI processes
│           └── commands/             # VS Code commands that call CLI
├── docs/                             # Shared documentation
└── scripts/                          # Shared build/dev scripts
```

### Core Components (CLI Contains All Logic)

**CLI Package Contains:**

- **MCP Server Logic** (`src/mcp/provider.ts` → `packages/cli/src/core/mcp-server.ts`)
  - MCP tools: search-web-components, get-component-details, list-all-components
  - MCP resources: manifest://components, manifest://components/{tag}
  - Server enrichment logic

- **CEM System** (`src/cem/` → `packages/cli/src/cem/`)
  - Manifest location provider (adapted for CLI environment)
  - Manifest reader with caching
  - Component search and filtering logic

- **Transport Layer** (`src/mcp/utils/transport.ts` → `packages/cli/src/transports/`)
  - HTTP transport (existing)
  - SSE transport (existing)
  - **NEW**: STDIO transport for direct MCP communication

**VS Code Extension Contains:**

- **CLI Process Management** (`packages/vscode-extension/src/mcp/cli-provider.ts`)
  - Spawns and manages CLI processes
  - Translates VS Code settings to CLI arguments
  - Monitors CLI process health

- **Command Wrappers** (`packages/vscode-extension/src/commands/`)
  - Thin wrappers that call corresponding CLI commands
  - Parse CLI output and display in VS Code UI
  - Handle VS Code-specific interactions

## CLI Commands

The CLI should provide these commands:

```bash
# Server management
wcai start [options]              # Start MCP server
wcai stop                         # Stop MCP server
wcai status                       # Show server status
wcai config                       # Show/edit configuration

# Manifest management
wcai list                         # List discovered manifests
wcai locate [--force]             # Locate/refresh manifests
wcai include [manifest-uri]       # Include manifest (interactive if no URI provided)
wcai exclude [manifest-uri]       # Exclude manifest (interactive if no URI provided)

# MCP operations
wcai search <query>               # Search components
wcai get <tag-name>               # Get component details
wcai components [--details]       # List all components

# Setup and configuration
wcai setup                        # Interactive setup wizard
wcai install                      # Generate MCP config for AI tools
```

## Transport Support

### HTTP Transport (existing)

- Reuse current HTTP server implementation
- Serve both `/mcp` and `/sse` endpoints

### SSE Transport (existing)

- Reuse current SSE implementation

### STDIO Transport (new)

- Direct stdin/stdout communication
- Useful for AI tools that prefer STDIO over HTTP
- Implement using `@modelcontextprotocol/sdk/server/stdio.js`

## Configuration System

### Configuration Sources (in priority order)

1. Command line arguments
2. Environment variables
3. Local config file (`wcai.config.json`)
4. Global config file (`~/.wcai/config.json`)
5. Default values

### Configuration Schema

```typescript
interface CliConfig {
  server?: {
    host?: string;
    port?: number;
    transport?: 'http' | 'sse' | 'stdio';
  };
  manifests?: {
    exclude?: string[];
    searchPaths?: string[];
  };
  logging?: {
    level?: 'off' | 'error' | 'warn' | 'info' | 'debug';
    file?: string;
  };
}
```

## Interactive Setup Experience

When `wcai` is called without arguments:

```bash
$ wcai
? What would you like to do?
  ❯ Start MCP server
    Configure settings
    List components
    Setup MCP integration
    View help
```

### Setup Wizard Features

- Detect workspace/project type
- Suggest optimal configuration
- Generate MCP config for popular AI tools
- Test server connectivity

### Interactive Manifest Management

When `wcai include` or `wcai exclude` is called without a manifest URI:

```bash
$ wcai include
? Select manifests to include:
  ◯ ./custom-elements.json (local)
  ◉ ./node_modules/@lit/components/custom-elements.json (dependency)
  ◯ ./node_modules/@material/web/custom-elements.json (dependency)
  ◉ ./packages/ui/custom-elements.json (workspace)
```

**Interactive Features:**

- Multi-select interface with checkboxes
- Show current inclusion/exclusion status
- Display manifest source (local, dependency, workspace)
- Allow filtering by manifest type or search term
- Confirm changes before applying

## VS Code Extension Integration

**Approach: CLI as Primary**

- VS Code extension becomes a thin wrapper around CLI
- Extension spawns CLI process for MCP operations
- CLI contains ALL logic, extension has minimal code

### Implementation Strategy

1. **CLI Process Management**
   - Extension spawns `wcai start` with appropriate options
   - Monitor process health and capture server info
   - Handle graceful shutdown with `wcai stop`

2. **Configuration Synchronization**
   - Extension settings → CLI command arguments
   - Maintain compatibility with existing VS Code settings

3. **Command Delegation**
   - VS Code commands execute corresponding CLI commands
   - Parse CLI output and display in VS Code UI

### Package Dependencies

```json
// packages/cli/package.json
{
  "name": "@wcai/cli",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.17.5",
    "@wc-toolkit/cem-utilities": "^1.4.1",
    "custom-elements-manifest": "^2.1.0",
    "zod": "^3.25.76"
  }
}

// packages/vscode-extension/package.json
{
  "name": "vscode-web-components-ai",
  "dependencies": {
    "@wcai/cli": "workspace:*"  // Only dependency on CLI
  }
}
```

## Technical Considerations

### Dependency Management

- CLI contains all dependencies and logic
- VS Code extension only depends on CLI package
- No shared dependencies between packages (CLI is self-contained)

### Error Handling

- Graceful degradation when manifests not found
- Clear error messages for configuration issues
- Proper cleanup on process termination

### Performance

- Maintain existing caching strategies
- Efficient manifest discovery in CLI environment
- Minimal startup time for CLI commands

### Cross-Platform Support

- Works on Windows, macOS, Linux
- Proper path handling and file system operations
- Shell integration considerations

## Development Phases

1. **Phase 1**: Extract core logic and create basic CLI structure
2. **Phase 2**: Implement HTTP/SSE transports and basic commands
3. **Phase 3**: Add STDIO transport and advanced CLI features
4. **Phase 4**: Create interactive setup and VS Code integration
5. **Phase 5**: Testing, documentation, and publishing

## Success Criteria

- ✅ **Feature Parity**: All current VS Code extension capabilities
- ✅ **Transport Flexibility**: HTTP, SSE, and STDIO support
- ✅ **Developer Experience**: Friendly setup and configuration
- ✅ **Integration Ready**: Easy consumption by VS Code extension
- ✅ **Extensibility**: Foundation for future JetBrains plugin

## Migration Strategy

### Phase 1: Parallel Implementation

- Build CLI alongside existing extension
- Extension keeps current implementation
- Add feature flag: `wcai.experimental.useCliServer`

### Phase 2: CLI Integration

- Implement `CliMcpProvider` in extension
- Add process management and error handling
- Test with feature flag enabled

### Phase 3: CLI as Default

- Switch default to CLI-based implementation
- Keep built-in as fallback for compatibility
- Monitor for issues and performance

### Phase 4: Built-in Removal

- Remove built-in MCP server code
- CLI becomes only implementation
- Significant code reduction in extension
