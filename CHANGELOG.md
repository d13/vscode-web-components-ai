# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

### Added

- **Standalone CLI Package**: New `@wcai/cli` package with complete MCP server functionality
- **Monorepo Structure**: Restructured project with pnpm workspaces for CLI and VS Code extension
- **Multiple Transport Protocols**: HTTP, SSE, and STDIO support for different integration scenarios
- **Interactive Setup Wizard**: Guided configuration with project detection and MCP config generation
- **Multi-level Configuration**: Command line args, environment variables, local/global config files with proper precedence
- **Comprehensive CLI Commands**: Server management, configuration, manifest discovery, and component queries
- **CLI Integration for VS Code**: Commands to check CLI availability, switch server modes, and run setup
- **Enhanced Documentation**: Comprehensive README, CLI documentation, and contributing guidelines
- **Unit Testing Framework**: Jest-based testing with TypeScript support and coverage reporting

### Changed

- **Architecture**: CLI becomes primary implementation with VS Code extension as thin wrapper
- **Configuration System**: Enhanced with Zod validation and better error handling
- **Error Handling**: Improved error messages and recovery throughout the application
- **Logging**: Configurable log levels with structured output

### Technical

- **Node.js Adaptation**: Ported CEM system from VS Code APIs to Node.js environment
- **Cross-Platform Support**: CLI works on Windows, macOS, and Linux
- **Process Management**: Graceful shutdown, PID tracking, and signal handling
- **File Watching**: Automatic manifest change detection with cache invalidation

## [1.2.1] - 2025-09-21

### Fixed

- Prevents from registering the MCP Definition Provider in Kiro as it doesn't properly support it.

## [1.2.0] - 2025-09-18

### Added

- Added _Install MCP Server_ command for easy install where supported or to provide guidance for manually configuring the MCP server.

### Changed

- Improved _MCP Server Information_ messaging and added links for help and installation.
- Ensure _MCP Server Information_ only displays automatically on the first start-up.

## [1.0.0] - 2025-09-15

### Added

- Added automatic registration of the MCP server for VS Code 1.101.0 and later ([#8](https://github.com/d13/vscode-web-components-ai/issues/8))
- Display MCP server information in the Manifests view with an action to copy the server configuration.
- Added help and informational links to the _Web Component AI Tools_ sidebar.

### Changed

- Improved error handling when locating manifests in dependencies.
- Updated MCP server SDK

## [0.0.3] - 2025-06-18

### Added

- Added documentation for configuring the MCP server with VS Code, Cursor, Claude Code, and other AI assistants ([#7](https://github.com/d13/vscode-web-components-ai/issues/7))

### Changed

- Updated the JSON format when using the _Copy Config JSON_ in the _MCP Server Information_ command to match the standard MCP format.
- Updated manifest readers to better cache and invalidate CEM files, improving performance, accuracy and reliability.

## [0.0.2] - 2025-06-18

### Added

- Added _Manifests_ view and _Web Component AI Tools_ sidebar ([#2](https://github.com/d13/vscode-web-components-ai/issues/2), [#6](https://github.com/d13/vscode-web-components-ai/issues/6))
  - See all discovered CEM files, organized by local and dependencies.
  - Control whether CEM files are excluded from the MCP server.
  - Open CEM files in the editor.
  - Refresh discovered CEM files.
- Added _Start MCP Server_ and _Stop MCP Server_ commands to the command palette.

### Changed

- Updated _List Custom Elements Manifests_ command to open CEM files in the editor when selected.

### Fixed

- Fixed sending private member data from CEM files to MCP clients. ([#5](https://github.com/d13/vscode-web-components-ai/issues/5))

## [0.0.1] - 2025-06-11

### Added

- Initial development of the project, super basic functionality.

[unreleased]: https://github.com/d13/vscode-web-components-ai/compare/v1.2.1...HEAD
[1.2.1]: https://github.com/d13/vscode-web-components-ai/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/d13/vscode-web-components-ai/compare/v1.0.0...v1.2.0
[1.0.0]: https://github.com/d13/vscode-web-components-ai/compare/v0.0.3...v1.0.0
[0.0.3]: https://github.com/d13/vscode-web-components-ai/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/d13/vscode-web-components-ai/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/d13/vscode-web-components-ai/tree/v0.0.1
