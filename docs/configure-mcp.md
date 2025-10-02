# Integrating with the MCP Server

The Web Component AI Tools extension provides a local Model Context Protocol (MCP) server that exposes information about the web components in your workspace. This server can be integrated with various AI assistants and tools that support the MCP protocol.

## MCP Server Overview

The MCP server provided by this extension supports the following transports:

- HTTP
- SSE
- STDIO (coming soon)

### Host & Port Settings

The MCP Server's hostname by default is `127.0.0.1` and the port is randomly assigned by the OS, but these can be customized through the `settings.json` file:

```json
{
  "wcai.mcp.host": "localhost",
  "wcai.mcp.port": 3000
}
```

### JSON Configuration Information

1. If the MCP server is not already running, start the MCP server in VS Code by opening the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and running the `Web Components AI: Start MCP Server` command.
2. Copy the server configuration by running the `Web Components AI: MCP Server Information` command and clicking the "Copy Config" button.
3. Paste the configuration into the settings for your AI assistant or tool.

<details>
<summary>🗒️ Format for almost all IDEs and AI assistants</summary>
  
```json
{
  "mcpServers": {
    "mcp-wcai-http": {
      "type": "http",
      "url": "http://<host>:<port>/mcp"
    },
    "mcp-wcai-sse": {
      "type": "sse",
      "url": "http://<host>:<port>/sse"
    }
  }
}
```

</details>

## Integrating with AI Assistants

- [VS Code (including Copilot)](#vs-code-including-copilot)
- [Cursor](#cursor)
- [Claude Desktop](#claude-desktop)
- [Claude Code](#claude-code)
- [Trae](#trae)
- [Windsurf](#windsurf)
- [Void](#void)
- [Cline](#cline)
- [Augment](#augment)
- [AMP](#amp)
- [Kiro](#kiro)

### VS Code (including Copilot)

#### Automatically installation

The extension will automatically register the MCP server with VS Code, so no additional configuration is required. Run `MCP: List Servers` in the command palette to see the server listed.

#### Older versions (`<1.101.0`)

Using the copied configuration, manually add the MCP server into your `.vscode/mcp.json`:

<details>
<summary>🗒️ Config Example</summary>
  
```json
{
  "servers": {
    "mcp-wcai-http": {
      "type": "http",
      "url": "http://<host>:<port>/mcp"
    },
    "mcp-wcai-sse": {
      "type": "sse",
      "url": "http://<host>:<port>/sse"
    }
  }
}
```

> NOTE: VS Code's format is slightly different from the standard MCP format, so ensure you use the correct keys.

</details>

### Cursor

Copy the MCP server configuration from the VS Code notification and paste it into your `.cursor/mcp.json`:

<details>
<summary>🗒️ Config Example</summary>

```json
{
  "mcpServers": {
    "mcp-wcai-http": {
      "type": "http",
      "url": "http://<host>:<port>/mcp"
    },
    "mcp-wcai-sse": {
      "type": "sse",
      "url": "http://<host>:<port>/sse"
    }
  }
}
```

</details>

### Claude Desktop

- Click _Connected Apps_.
- Click _+ Add Integration_.
- In the _Integration URL_ field, paste the SSE URL `http://<host>:<port>/sse`.
- Click the _Add_ button.

### Claude Code

Use a project-scoped server configuration adding a `.mcp.json` file into the root of your project.

#### Generate file using the CLI:

```bash
claude mcp add --transport sse sse-server http://<host>:<port>/sse --scope project /path/to/your/project
```

#### Creating the file manually

Add a `.mcp.json` file in the the root of your project:

<details>
<summary>🗒️ Config Example</summary>

```json
{
  "mcpServers": {
    "mcp-wcai-http": {
      "type": "http",
      "url": "http://<host>:<port>/mcp"
    },
    "mcp-wcai-sse": {
      "type": "sse",
      "url": "http://<host>:<port>/sse"
    }
  }
}
```

</details>

### Trae

- At the top right of the side chat box, click the _Settings_ icon, and select _MCP_ from the menu. The MCP tab appears.
- Click the _+ Add_ button and select _Add Manually_ from the menu. The Configure Manually window appears.

<details>
<summary>🗒️ Config Example</summary>

```json
{
  "mcpServers": {
    "mcp-wcai-http": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

</details>

> NOTE: Only one MCP server entry is allowed at a time.

### Windsurf

You can add an MCP server to Cascade by adding the following configuration to your `~/.codeium/windsurf/mcp_config.json` file:

<details>
<summary>🗒️ Config Example</summary>

```json
{
  "mcpServers": {
    "mcp-wcai-http": {
      "type": "http",
      "url": "http://<host>:<port>/mcp"
    },
    "mcp-wcai-sse": {
      "type": "sse",
      "url": "http://<host>:<port>/sse"
    }
  }
}
```

</details>

### Void

Copy the MCP server configuration from the VS Code notification and paste it into your `.void-editor/mcp.json`:

<details>
<summary>🗒️ Config Example</summary>

```json
{
  "mcpServers": {
    "mcp-wcai-http": {
      "type": "http",
      "url": "http://<host>:<port>/mcp"
    },
    "mcp-wcai-sse": {
      "type": "sse",
      "url": "http://<host>:<port>/sse"
    }
  }
}
```

</details>

### Cline

- Click the _MCP Servers_ icon in the top navigation bar of the Cline extension.
- Click the _Installed_ tab.
- Click the _Configure MCP Servers_ button and enter the configuration into the `cline_mcp_settings.json` file:

<details>
<summary>🗒️ Config Example</summary>

```json
{
  "mcpServers": {
    "mcp-wcai-http": {
      "type": "http",
      "url": "http://<host>:<port>/mcp"
    },
    "mcp-wcai-sse": {
      "type": "sse",
      "url": "http://<host>:<port>/sse"
    }
  }
}
```

</details>

### Augment

> Product release support coming soon once STDIO transport is added!

#### HTTP & SSE Support in `>0.491.0` Pre-Release.

Using the _Augment Settings_ view:

HTTP streaming:

- Click "Add HTTP MCP"
- Name, add `mcp-wcai-http`
- URL add `http://<host>:<port>/mcp`

SSE:

- Click "Add SSE MCP"
- Name, add `mcp-wcai-sse`
- URL add `http://<host>:<port>/sse`

Using `settings.json`:

<details>
<summary>🗒️ Config Example</summary>

```json
"augment.advanced": {
  "mcpServers": {
    "mcp-wcai-http": {
      "type": "http",
      "url": "http://<host>:<port>/mcp"
    },
    "mcp-wcai-sse": {
      "type": "sse",
      "url": "http://<host>:<port>/sse"
    }
  }
}
```

</details>

### AMP

Using `settings.json`:

<details>
<summary>🗒️ Config Example</summary>

```json
"amp.mcpServers": {
  "mcp-wcai-http": {
    "type": "http",
    "url": "http://<host>:<port>/mcp"
  },
  "mcp-wcai-sse": {
    "type": "sse",
    "url": "http://<host>:<port>/sse"
  }
}
```

</details>

### Kiro

> Kiro doesn't support http-based MCP servers, however you can use the [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) NPM package to make requests through `stdio`.

Copy the MCP server configuration from the VS Code notification and paste it into:

- Workspace-level `.kiro/settings/mcp.json`
- User-level `~/.kiro/settings/mcp.json`

<details>
<summary>🗒️ Config Example</summary>

```json
{
  "mcpServers": {
    "mcp-wcai-http": {
      "command": "npx",
      "args": ["mcp-remote", "http://<host>:<port>/mcp", "--transport", "http"]
    },
    "mcp-wcai-sse": {
      "command": "npx",
      "args": ["mcp-remote", "http://<host>:<port>/sse", "--transport", "sse"]
    }
  }
}
```

> NOTE: Kiro's format is very different from the standard MCP format, so ensure you use the correct formatting.

</details>
