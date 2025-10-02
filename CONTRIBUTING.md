# Contributing to Web Component AI Tools

Thank you for your interest in contributing to Web Component AI Tools! This document provides guidelines and information for contributors.

## 🚀 Quick Start

This is a monorepo containing both a standalone CLI (`@wcai/cli`) and a VS Code extension (`vscode-web-components-ai`). Both packages work together to provide web component information to AI assistants via Model Context Protocol (MCP).

## 📋 Code of Conduct

Please note the [Code of Conduct](CODE_OF_CONDUCT.md) document and follow it in all your interactions with this project.

## 📦 Project Structure

```
packages/
├── cli/                    # @wcai/cli - Standalone CLI package
└── vscode-extension/       # VS Code extension
```

## Getting Started

### Prerequisites

- [NodeJS](https://nodejs.org/), `>= 20.18.3`
- [Corepack](https://nodejs.org/docs/latest-v22.x/api/corepack.html), `>= 0.31.0`
- [pnpm](https://pnpm.io/), `>= 10.10.0` (installs using corepack)

For those using [nvm](https://github.com/nvm-sh/nvm), simply run the following command to install the required version of NodeJS:

```
nvm use
```

> 👉 **NOTE!** Corepack version
>
> Check your version of corepack by running `corepack -v` and ensure it is at least `0.31.0`. To update corepack, run `npm install corepack@latest`. You can enable corepack by running `corepack enable`.

### Dependencies

To install the dependencies for this project, run the following command in the root directory:

```bash
pnpm install
```

### Build

From a terminal, where you have cloned the repository, execute the following command to build the project:

```bash
pnpm run build
```

### Watch

During development you can use a watcher to make builds on changes quick and easy. From a terminal, where you have cloned the repository, execute the following command:

```bash
pnpm run watch
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run CLI tests specifically
cd packages/cli && pnpm test
```

### Running locally

#### VS Code Extension

To run the extension locally, you can use the `Watch & Run` launch configuration in the Run and Debug sidebar in Visual Studio Code. This will open a new instance of VS Code with your extension loaded.

#### CLI Testing

```bash
# Build and test CLI locally
cd packages/cli
pnpm run build
node bin/wcai --help

# Test CLI commands
node bin/wcai setup
node bin/wcai start --transport http --port 3000
```

## 🧪 Testing Guidelines

- Write tests for all new functionality
- Use Jest with TypeScript support
- Mock external dependencies
- Aim for high test coverage (>80%)

## 🐛 Bug Reports & 🚀 Feature Requests

Please use GitHub Issues to report bugs or request features. Include:

- Clear description of the issue/feature
- Steps to reproduce (for bugs)
- Environment information
- Expected vs actual behavior

## 🔄 Pull Request Process

1. Fork the repository and create a feature branch
2. Write tests for your changes
3. Ensure all tests pass: `pnpm test`
4. Lint your code: `pnpm run lint`
5. Format your code: `pnpm run format`
6. Submit a pull request with a clear description

## 📚 Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Custom Elements Manifest Specification](https://custom-elements-manifest.open-wc.org/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
