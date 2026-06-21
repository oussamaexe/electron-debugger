# electron-debugger

**Status: Work in progress.** APIs and tool set are evolving.

MCP server for debugging Electron apps via Chrome DevTools Protocol (CDP).

## Prerequisites

Your Electron app must be running with remote debugging:

```bash
/path/to/your-electron-app --remote-debugging-port=9222
```

## Installation

```bash
npm install -g electron-debugger
```

Or run directly:

```bash
npx electron-debugger mcp
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `ELECTRON_DEBUG_PORT` | `9222` | CDP debugging port |
| `ELECTRON_DEBUG_HOST` | `127.0.0.1` | Debugging host address |

## Usage

### MCP Server

```bash
electron-debugger mcp
```

For opencode, add to `opencode.json`:

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
electron-debugger exec get-dom-snapshot depth=3
electron-debugger exec click-element selector=button.submit
electron-debugger exec take-screenshot format=png
```

## Available Tools

| Tool | Description |
|---|---|
| `get-dom-snapshot` | Get DOM tree snapshot |
| `get-element-box` | Get bounding box for a CSS selector |
| `get-element-styles` | Get computed styles |
| `take-screenshot` | Capture page or element screenshot |
| `get-console-logs` | Retrieve console entries |
| `get-metrics` | Get performance metrics (FPS, memory, DOM nodes) |
| `click-element` | Click an element by CSS selector |
| `type-text` | Type text into an input field |
| `highlight-element` | Visually highlight an element |
| `list-windows` | List all open BrowserWindows |

## How It Works

1. Electron app exposes a CDP WebSocket via `--remote-debugging-port`
2. `electron-debugger` discovers page targets at `http://127.0.0.1:9222/json`
3. Connects to the first `page` target via WebSocket
4. Tools communicate using Chrome DevTools Protocol commands
5. MCP server exposes these as tool definitions for AI assistants

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
