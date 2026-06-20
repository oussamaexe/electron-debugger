# electron-debugger

Debug any Electron app via Chrome DevTools Protocol (CDP) — no code changes required. Provides an [MCP](https://modelcontextprotocol.io) server for AI tool integration and a CLI for direct use.

## Features

- **Zero-setup debugging** — works with any Electron app running with `--remote-debugging-port`
- **DOM inspection** — snapshot page structure, get element bounding boxes
- **Style inspection** — get computed CSS styles per element
- **Screenshots** — full page or per-element screenshots (PNG/JPEG)
- **Console access** — retrieve renderer process console logs
- **Performance metrics** — FPS, memory usage, DOM node counts
- **Element interaction** — click, type text, highlight elements
- **Window listing** — enumerate all open BrowserWindows
- **Dual interface** — MCP server (stdio) for AI tools, CLI for scripting

## Installation

```bash
npm install -g electron-debugger
```

Or run directly:

```bash
npx electron-debugger mcp
```

## Prerequisites

Your Electron app must **already be running** with the remote debugging port enabled:

```bash
/path/to/your-electron-app --remote-debugging-port=9222
```

> Some apps (VS Code, Slack, Discord) already ship with DevTools support. Check your app's docs.

## Configuration

All settings have sensible defaults. Override via environment variables:

| Variable | Default | Description |
|---|---|---|
| `ELECTRON_DEBUG_PORT` | `9222` | CDP debugging port |
| `ELECTRON_DEBUG_HOST` | `127.0.0.1` | Debugging host address |

## Usage

### MCP Server (for AI tools)

```bash
electron-debugger mcp
```

The MCP server starts a stdio-based server. Configure your AI assistant to use it as an MCP tool. For opencode, add to `opencode.json`:

```json
{
  "mcpServers": {
    "electron-debugger": {
      "command": "npx",
      "args": ["electron-debugger", "mcp"]
    }
  }
}
```

### CLI

```bash
# Get a DOM snapshot
electron-debugger exec get-dom-snapshot depth=3

# Click an element
electron-debugger exec click-element selector=button.submit

# Take a screenshot
electron-debugger exec take-screenshot format=png
```

## Available Tools

| Tool | Description |
|---|---|
| `get-dom-snapshot` | Get DOM tree snapshot with optional depth |
| `get-element-box` | Get bounding box for a CSS selector |
| `get-element-styles` | Get computed styles (optionally filtered by property) |
| `take-screenshot` | Capture page or element screenshot (base64 PNG/JPEG) |
| `get-console-logs` | Retrieve recent console entries |
| `get-metrics` | Get performance metrics (FPS, memory, DOM nodes) |
| `click-element` | Click an element by CSS selector |
| `type-text` | Type text into an input field |
| `highlight-element` | Visually highlight an element |
| `list-windows` | List all open BrowserWindows |

## How It Works

1. Your Electron app exposes a CDP WebSocket via `--remote-debugging-port`
2. `electron-debugger` discovers page targets through the HTTP discovery endpoint (`http://127.0.0.1:9222/json`)
3. It connects to the first `page` target via WebSocket
4. All tools communicate using Chrome DevTools Protocol commands
5. The MCP server exposes these as tool definitions that AI assistants can discover and call

## Development

```bash
git clone https://github.com/oussamaexe/electron-debugger.git
cd electron-debugger
npm install
npm run build
npm test
```

## License

MIT
