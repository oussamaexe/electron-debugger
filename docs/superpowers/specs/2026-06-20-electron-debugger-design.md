# electron-debugger Design

An MCP server and CLI tool for debugging Electron apps via Chrome DevTools Protocol (CDP), designed for opencode integration.

## Architecture

```
opencode
  └── electron-debugger MCP Server (stdio)
        └── CDP WebSocket connection
              └── Target Electron App (--remote-debugging-port)
```

- Published as a standalone npm package (`electron-debugger`)
- No code changes needed in target apps — just `--remote-debugging-port`
- Dual interface: MCP server (primary) and CLI (secondary)

## Package Structure

```
electron-debugger/
  src/
    index.ts            # CLI entry point
    mcp-server.ts       # MCP protocol handler (stdio transport)
    cdp-client.ts       # CDP WebSocket connection manager
    tools/
      dom.ts            # DOM tree, element inspection
      styles.ts         # Computed styles, CSS rules
      screenshot.ts     # Screenshot capture
      console.ts        # Console log streaming
      metrics.ts        # Performance metrics
      interact.ts       # Click, type, highlight
    config.ts           # Port, host, connection settings
  bin/
    cli.js
```

## MCP Tools

| Tool | Purpose | CDP APIs Used |
|---|---|---|
| `get-dom-snapshot` | Full or depth-filtered DOM tree | `DOM.getDocument`, `DOM.querySelector` |
| `get-element-styles` | Computed styles + CSS rules for a node | `CSS.getComputedStyleForNode`, `CSS.getMatchedStylesForNode` |
| `get-element-box` | Position, size, padding, margin | `DOM.getBoxModel` |
| `take-screenshot` | PNG screenshot (full page or element) | `Page.captureScreenshot` |
| `highlight-element` | Visually highlight an element | `Overlay.highlightNode`, `Overlay.hideHighlight` |
| `get-console-logs` | Recent console entries | `Console.enable`, `Console.messageAdded` |
| `get-metrics` | FPS, memory, layout/node counts | `Performance.enable`, `Runtime.evaluate` |
| `click-element` | Click element by selector | `Runtime.evaluate` (dispatchEvent) |
| `type-text` | Type into an input field | `Runtime.evaluate` (set value + dispatch) |
| `list-windows` | List all open BrowserWindows/targets | HTTP GET `/json` |

## Connection & Lifecycle

1. Target app started with `--remote-debugging-port=9222` (configurable)
2. Tool discovers pages via `http://localhost:{port}/json`
3. Connects to the `page` target via CDP WebSocket
4. Auto-reconnects with exponential backoff on disconnect
5. Supports attaching to already-running apps

## CDP Session Setup

- `DOM.enable` — DOM tree access
- `CSS.enable` — computed styles
- `Console.enable` — log capture
- `Overlay.enable` — element highlighting
- `Performance.enable` — metrics
- `Page.enable` — page events
- `Runtime.enable` — JS evaluation

If CSP blocks `Runtime.evaluate`, fall back to `Page.addScriptToEvaluateOnNewDocument`.

## opencode Integration

Add to `.opencode.json` or `opencode.json`:

```json
{
  "mcpServers": {
    "electron-debugger": {
      "command": "npx",
      "args": ["-y", "electron-debugger", "mcp"]
    }
  }
}
```

## CLI Commands

| Command | Description |
|---|---|
| `electron-debugger mcp` | Start MCP server on stdio |
| `electron-debugger mcp --port 9222` | Connect to specific CDP port |
| `electron-debugger screenshot` | One-off screenshot (CLI mode) |
| `electron-debugger get-dom` | One-off DOM dump (CLI mode) |

## Error Handling

| Scenario | Behavior |
|---|---|
| App not running | Clear error with fix instructions |
| App crashes | Auto-reconnect; tools return "disconnected" |
| CDP command failure | Return raw CDP error to opencode |
| No matching element | Return "No element found" |
| CSP blocking eval | Fallback to script injection |

## Testing

- Unit tests: CDP client, tool response parsing, CLI args
- Integration tests: launch tmp Electron app, run tools, assert results
