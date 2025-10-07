# AGENTS.md

> Guidance for AI-powered coding assistants (Augment Agent Mode, Augment Auggie CLI, Copilot Agent Mode, Claude Code, Cursor, Windsurf, etc.) when working with code in this repository.
> Read this before writing, editing, or executing anything in this repo.

## Project Overview

This is a monorepo containing both a standalone CLI and a VS Code extension that provide web component information to AI assistants via Model Context Protocol (MCP). The tools discover custom elements manifests in workspaces and expose them through MCP servers with HTTP/SSE/STDIO transports. The VS Code extension now uses the standalone CLI as its primary MCP server implementation.

## Common Commands

### Prerequisites

- `nvm use` - Switch to the correct Node.js version (use `nvm install` first, if needed)
- `corepack enable` - Enable corepack for package manager
- `pnpm install` - Install dependencies

### Development

- `pnpm run build` - Build all packages in development mode
- `pnpm run bundle` - Build all packages for production
- `pnpm run watch` - Watch mode for development
- `pnpm run clean` - Clean build artifacts

### Code Quality

- `pnpm run lint` - Run ESLint on TypeScript files
- `pnpm run lint:fix` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check code formatting

### Testing

- `pnpm run test` - Run tests for all packages
- `pnpm run test:coverage` - Run tests with coverage for all packages
- `pnpm run test:ci` - Run tests in CI mode for all packages

### Packaging & Publishing

- `pnpm run package` - Create VSIX package
- `pnpm run package-pre` - Create pre-release VSIX package
- `pnpm run pub` - Publish to marketplace
- `pnpm run pub-pre` - Publish pre-release to marketplace
- `pnpm run generate:licenses` - Generate license files

## Architecture Overview

### Core Components

**Extension Entry Point** (`packages/vscode-extension/src/extension.ts`):

- Main activation point that initializes logging, configuration, and container
- Sets up the dependency injection container and registers commands

**Container** (`packages/vscode-extension/src/container.ts`):

- Dependency injection container managing all services and providers
- Central point for service resolution and lifecycle management

**MCP Provider** (`packages/vscode-extension/src/mcp/`):

- Core MCP server implementation providing web component data
- Serves HTTP and SSE endpoints for AI assistant integration
- Implements MCP tools: search-web-components, get-web-component-details, list-all-web-components
- Now primarily uses the standalone CLI as the MCP server implementation

**Custom Elements Manifest (CEM) System**:

- `packages/vscode-extension/src/cem/locator.ts` - Discovers custom-elements.json files in workspace and dependencies
- `packages/vscode-extension/src/cem/reader.ts` - Reads and parses manifest files with caching

**Commands** (`packages/vscode-extension/src/commands/`):

- VS Code command implementations for starting/stopping MCP server
- Manifest management commands (list, locate, include/exclude)
- Tree view refresh and information display commands

**Views** (`packages/vscode-extension/src/views/`):

- Tree view implementation showing discovered manifests
- Custom tree nodes for different manifest states and groupings

**System Utilities** (`packages/vscode-extension/src/system/`):

- Logging, configuration, decorators, and common utilities
- Standardized patterns for async operations and error handling

### Key Data Flow

1. Extension activates and discovers custom-elements.json manifests
2. CEM files are parsed and cached for quick access
3. MCP server starts providing HTTP/SSE endpoints
4. AI assistants connect to MCP endpoints to query component information
5. Tree view in VS Code shows discovered manifests with include/exclude controls

### Standalone CLI Package

**CLI Entry Point** (`packages/cli/src/cli.ts`):

- Standalone CLI application with commands for server management, configuration, and manifest discovery
- Published as `@wcai/cli` npm package with global installation support

**CLI Commands** (`packages/cli/src/commands/`):

- `wcai start` - Start MCP server with HTTP/SSE/STDIO transports
- `wcai setup` - Interactive setup wizard for MCP client configuration
- `wcai config` - Configuration management commands
- `wcai list` - List discovered manifests
- `wcai locate` - Locate manifest files in workspace

**CLI MCP Server** (`packages/cli/src/core/mcp-server.ts`):

- Core MCP server implementation with same tools as VS Code extension
- Supports multiple transport protocols (HTTP, SSE, STDIO)
- Feature parity with VS Code extension MCP provider

### Configuration

The extension uses VS Code settings under the `wcai.*` namespace:

- `wcai.outputLevel` - Logging verbosity (off, error, warn, info, debug)
- `wcai.manifests.exclude` - Array of manifest URIs to exclude
- `wcai.mcp.host/port` - MCP server network configuration
- `wcai.mcp.storeHostAndPortOnStart` - Auto-save server config after startup

### Build System

- Uses Webpack with TypeScript compilation
- Node.js target for main extension code
- Separate webpack configs for extension and potential webviews
- TypeScript project references for modular compilation

## Coding Standards & Styles Rules

### TypeScript Configuration

- Recommended TypeScript with `recommendedTypeChecked` ESLint config
- No `any` usage (exceptions for external APIs)
- Explicit return types for public methods
- Prefer `type` over `interface` for unions

### Import Organization

- Group imports: built-in, external, internal, parent, sibling, index
- Alphabetical order within groups
- No unused imports or variables
- Consistent type imports with `import type`

### Naming Conventions

- **Classes**: PascalCase (no I prefix for interfaces)
- **Methods/Variables**: camelCase
- **Constants**: camelCase for module-level constants
- **Private members**: Leading underscore allowed
- **Files**: `camelCase.ts`, `camelCase.utils.ts` for related utilities
- **Folders**
  - Models under a `models/` sub-folder
  - Utilities under a `utils/` sub-folder if they can be used in both the extension host and webviews, or `utils/-webview/` sub-folder for extension host-specific utilities

### Code Structure

- **Single responsibility** - Each service has focused purpose
- **Dependency injection** - Services injected via Container
- **Event-driven** - EventEmitter pattern for service communication
- **Disposable pattern** - Proper cleanup with VS Code `Disposable` interface

### Error Handling

- Use custom error types extending Error
- Log errors with context using `Logger.error()`
- Graceful degradation for network/API failures
- Validate external data with schema validators

## Repository Guidelines

### Commit Messages

- Use a future-oriented manner, third-person singular present tense (e.g., 'Fixes', 'Updates', 'Improves', 'Adds', 'Removes')
- Reference issues with #123 syntax for auto-linking
- Keep first line under 72 characters

### Branch Workflow

- Feature branches from main
- Prefix with feature type: feature/, bug/, debt/
- Use descriptive names: feature/search-natural-language

### Code Reviews

- Check TypeScript compilation and tests pass
- Verify no new ESLint violations

## Development Environment

### Prerequisites

- Node.js ≥ 20.18.3
- pnpm ≥ 10.x (via corepack)
- Git ≥ 2.7.2

### VS Code Tasks

- Build - `Ctrl+Shift+P` → "Tasks: Run Task" → "npm: watch"
- Test - Use VS Code's built-in test runner
- Debug - `F5` to launch Extension Development Host
