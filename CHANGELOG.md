# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

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

[unreleased]: https://github.com/d13/vscode-web-components-ai/compare/v0.0.3...HEAD
[0.0.3]: https://github.com/d13/vscode-web-components-ai/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/d13/vscode-web-components-ai/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/d13/vscode-web-components-ai/tree/v0.0.1
