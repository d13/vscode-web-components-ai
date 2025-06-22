# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension that provides web component information to AI assistants via Model Context Protocol (MCP). The extension discovers custom elements manifests in workspaces and exposes them through an MCP server with HTTP/SSE transports.

## Common Commands

### Development
- `pnpm run build` - Build extension in development mode
- `pnpm run bundle` - Build extension for production
- `pnpm run watch` - Watch mode for development
- `pnpm run clean` - Clean build artifacts

### Code Quality
- `pnpm run lint` - Run ESLint on TypeScript files
- `pnpm run lint:fix` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check code formatting

### Packaging & Publishing
- `pnpm run package` - Create VSIX package
- `pnpm run package-pre` - Create pre-release VSIX package
- `pnpm run pub` - Publish to marketplace
- `pnpm run pub-pre` - Publish pre-release to marketplace

## Architecture Overview

### Core Components

**Extension Entry Point** (`src/extension.ts`):
- Main activation point that initializes logging, configuration, and container
- Sets up the dependency injection container and registers commands

**Container** (`src/container.ts`):
- Dependency injection container managing all services and providers
- Central point for service resolution and lifecycle management

**MCP Provider** (`src/mcp/provider.ts`):
- Core MCP server implementation providing web component data
- Serves HTTP and SSE endpoints for AI assistant integration
- Implements MCP tools: search-components, get-component-details, list-all-components

**Custom Elements Manifest (CEM) System**:
- `src/cem/locator.ts` - Discovers custom-elements.json files in workspace and dependencies
- `src/cem/reader.ts` - Reads and parses manifest files with caching

**Commands** (`src/commands/`):
- VS Code command implementations for starting/stopping MCP server
- Manifest management commands (list, locate, include/exclude)
- Tree view refresh and information display commands

**Views** (`src/views/`):
- Tree view implementation showing discovered manifests
- Custom tree nodes for different manifest states and groupings

**System Utilities** (`src/system/`):
- Logging, configuration, decorators, and common utilities
- Standardized patterns for async operations and error handling

### Key Data Flow

1. Extension activates and discovers custom-elements.json manifests
2. CEM files are parsed and cached for quick access
3. MCP server starts providing HTTP/SSE endpoints
4. AI assistants connect to MCP endpoints to query component information
5. Tree view in VS Code shows discovered manifests with include/exclude controls

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