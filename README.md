# Web Component AI Tools

A comprehensive toolkit for integrating web component information with AI assistants via Model Context Protocol (MCP). This monorepo contains both a standalone CLI and a VS Code extension that discover custom elements manifests and expose them through MCP servers.

Supercharge your AI coding assistants with web component information from your workspace and dependencies. Generate accurate component code using your actual custom elements, properties, and APIs.

## 🚀 Quick Start

### Option 1: Standalone CLI (Recommended)

```bash
# Install globally
npm install -g @wcai/cli

# Run setup wizard
wcai setup

# Start MCP server
wcai start
```

### Option 2: VS Code Extension

1. Install the extension from VS Code Marketplace
2. Open a workspace with web components
3. Start the MCP server from Command Palette: "WCAI: Start MCP Server"

## 📦 Packages

This monorepo contains two main packages:

### [@wcai/cli](packages/cli/) - Standalone CLI

A feature-complete CLI tool that provides MCP server functionality for any development environment.

**Key Features:**

- 🌐 Multiple transport protocols (HTTP, SSE, STDIO)
- ⚙️ Flexible configuration system
- 🔍 Automatic component discovery
- 🎯 Interactive setup wizard
- 📊 Comprehensive logging

### [vscode-web-components-ai](packages/vscode-extension/) - VS Code Extension

A VS Code extension that integrates web component information directly into your development workflow.

**Key Features:**

- 🌳 Tree view of discovered manifests
- 🔧 Integrated MCP server management
- 🎛️ VS Code settings integration
- 🔄 CLI integration support

## 🚀 Benefits

- **Accelerate UI development** by facilitating AI agents to build using your custom elements and web component libraries
- **Expose documentation** of your web components and libraries through AI chat
- **Cross-platform support** with both CLI and VS Code extension options
- **Flexible deployment** via multiple transport protocols

## ✨ Features

### 🔍 **Automatic Component Discovery**

- Discovers components from both local code and installed packages
- Scans your workspace for `custom-elements.json` manifest files
- Analyzes `package.json` files to find component libraries in dependencies

### 📡 **Model Context Protocol Server**

- Starts a local MCP server with multiple transport options (HTTP and SSE)
- Provides real-time access to component information for AI assistants
- Automatically generates configuration for easy AI assistant integration

### 🤖 **AI Assistant Integration**

- Compatible with Copilot, Cursor, Windsurf, Claude Code, and other MCP-enabled AI tools
- Provides rich component context for accurate code generation
- Enables AI assistants to understand your specific component APIs

### 🛠️ **Powerful Component Tools**

- **Search Components**: Find components by name, tag, or description
- **Get Component Details**: Retrieve complete component metadata including attributes, properties, methods, and events
- **List All Components**: Browse all available components in your workspace
- **Component Resources**: Access structured component data via MCP resources

## 🚀 Getting Started

### Installation

Install this extension by clicking `Install` on the banner above, or from the Extensions side bar in VS Code by searching for `d13.vscode-web-components-ai`.

> Be sure to have VS Code 1.99.0 or higher installed.

### AI Assistant Integration

See the **[Integrating with the MCP Server](https://github.com/d13/vscode-web-components-ai/blob/main/docs/configure-mcp.md)** guide on how to integrate with your preferred AI assistants including Copilot, Cursor, Windsurf, Claude Code, and many more.

VS Code `>=1.101.0` registers the MCP server automatically with AI chat, run `MCP: List Servers` in the command palette to see the server listed.

> Have questions or concerns? Let's talk directly through the [GitHub Discussions page](https://github.com/d13/vscode-web-components-ai/discussions). Having a positive experience? Feel free to [write a review](https://marketplace.visualstudio.com/items?itemName=d13.vscode-web-components-ai&ssr=false#review-details).

## 🛠️ Available Tools & Resources

### MCP Tools

- **`search-components`**: Search for components by class name, tag name, or description
- **`get-component-details-by-tag-name`**: Get detailed information about a specific component by tag name
- **`get-component-details-by-class-name`**: Get detailed information about a specific component by class name
- **`list-all-components`**: List all available components with optional detailed information

### MCP Resources

- **`manifest://components`**: Access to all component data in JSON format
- **`manifest://components/{tag}`**: Access to specific component data by tag name

## 🤝 Community

### Discussions & Feedback

If you have any questions or want to share your experiences, please join-in on our [GitHub Discussions page](https://github.com/d13/vscode-web-components-ai/discussions).

### Issues & Feature Requests

If you encounter any issues or have feature requests, please report them on the [GitHub Issues page](https://github.com/d13/vscode-web-components-ai/issues).

### Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/d13/vscode-web-components-ai/blob/main/CONTRIBUTING.md) for more information.

## 🔗 Related Projects

- [Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/) - Standard for describing custom elements
- [Model Context Protocol](https://modelcontextprotocol.io/) - Protocol for AI assistant integrations
- [Web Components Toolkit](https://wc-toolkit.com/) - Utilities for working with Custom Elements Manifests

## 📝 License

See [LICENSE](LICENSE) file for details.
