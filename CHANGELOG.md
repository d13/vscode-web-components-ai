# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

### Added

- Added documentation for configuring the MCP server with VS Code, Cursor, Claude Code, and other AI assistants ([#7](https://github.com/d13/vscode-web-components-ai/issues/7))

## [0.0.2]

### Added

- Added _Manifests_ view and _Web Component AI Tools_ sidebar
  - See all discovered CEM files, organized by local and dependencies.
  - Control whether CEM files are excluded from the MCP server.
  - Open CEM files in the editor.
  - Refresh discovered CEM files.
- Added _Start MCP Server_ and _Stop MCP Server_ commands to the command palette.

### Changed

- Updated _List Custom Elements Manifests_ command to open CEM files in the editor when selected.

### Fixed

- Fixed sending private member data from CEM files to MCP clients.

## [0.0.1]

### Added

- Initial development of the project, super basic functionality.

[unreleased]: https://github.com/d13/vscode-web-components-ai/compare/v0.0.2...HEAD
[0.0.2]: https://github.com/d13/vscode-web-components-ai/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/d13/vscode-web-components-ai/tree/v0.0.1
