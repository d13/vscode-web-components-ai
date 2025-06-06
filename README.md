# Web Component AI Tools

Supercharge your AI coding assistants with web component information from your workspace and dependencies. Generate accurate component code using your actual custom elements, properties, and APIs.

This VS Code extension automatically discovers Custom Elements Manifests in your workspace and dependencies, then starts a local Model Context Protocol (MCP) server that AI assistants can connect to for intelligent web component development.

## ✨ Features

### 🔍 **Automatic Component Discovery**

- Scans your workspace for `custom-elements.json` manifest files
- Analyzes `package.json` files to find component libraries in dependencies
- Discovers components from both local code and installed packages

### 🚀 **Model Context Protocol Server**

- Starts a local MCP server with multiple transport options (HTTP and SSE)
- Provides real-time access to component information for AI assistants
- Automatically generates configuration for easy AI assistant integration

### 🤖 **AI Assistant Integration**

- Compatible with Claude Desktop, Cline, and other MCP-enabled AI tools
- Provides rich component context for accurate code generation
- Enables AI assistants to understand your specific component APIs

### 🛠️ **Powerful Component Tools**

- **Search Components**: Find components by name, tag, or description
- **Get Component Details**: Retrieve complete component metadata including attributes, properties, methods, and events
- **List All Components**: Browse all available components in your workspace
- **Component Resources**: Access structured component data via MCP resources

## 🔧 How It Works

1. **Discovery**: The extension scans your workspace for:

   - `custom-elements.json` files (Custom Elements Manifest standard)
   - `package.json` files with `customElements` field pointing to manifest files
   - Component libraries in `node_modules` with their own manifests

2. **Analysis**: Parses manifest files to extract detailed component information:

   - Tag names and class names
   - Properties, attributes, methods, and events
   - Documentation and type information
   - Inheritance relationships

3. **MCP Server**: Starts a local server that exposes this data through:
   - RESTful HTTP endpoints for streaming responses
   - Server-Sent Events (SSE) for real-time updates
   - Structured resources and tools for AI assistant consumption

## 🚀 Getting Started

### Installation

1. Install the extension from the VS Code Marketplace
2. Open a workspace containing web components or component libraries
3. The extension will automatically start and discover your components

### AI Assistant Integration

When the extension starts, it will show a notification with MCP server details and configuration. Click "Copy Config" to get the configuration for your AI assistant.

#### Claude Desktop Integration

1. Copy the MCP configuration from the VS Code notification
2. Open your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
3. Add the server configuration to your `mcpServers` section:

```json
{
  "mcpServers": {
    "mcp-wcai-http": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    },
    "mcp-wcai-sse": {
      "type": "sse",
      "url": "http://localhost:3000/sse"
    }
  }
}
```

4. Restart Claude Desktop

#### Cline Integration

1. In VS Code, open Cline settings
2. Navigate to MCP servers configuration
3. Add the server configuration copied from the notification
4. Restart Cline

#### Other MCP-Compatible AI Assistants

The extension provides standard MCP endpoints that work with any MCP-compatible AI assistant. Use the configuration format appropriate for your specific tool.

## 🛠️ Available Tools & Resources

### MCP Tools

- **`search-components`**: Search for components by name, tag name, or description
- **`get-component-details`**: Get detailed information about a specific component by tag name
- **`list-all-components`**: List all available components with optional detailed information

### MCP Resources

- **`manifest://components`**: Access to all component data in JSON format
- **`manifest://components/{tag}`**: Access to specific component data by tag name

## 📋 Requirements

- VS Code 1.99.0 or higher
- Workspace containing web components with Custom Elements Manifests

## 🔗 Related Projects

- [Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/) - Standard for describing custom elements
- [Model Context Protocol](https://modelcontextprotocol.io/) - Protocol for AI assistant integrations
- [WC Toolkit CEM Utilities](https://github.com/break-stuff/wc-toolkit) - Utilities for working with Custom Elements Manifests

## 📝 License

See [LICENSE](LICENSE) file for details.
