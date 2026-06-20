# electron-debugger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MCP server that lets opencode debug any Electron app via CDP

**Architecture:** Standalone npm package (`electron-debugger`) that opens a WebSocket to Electron's Chrome DevTools Protocol port and exposes debugging capabilities as MCP tools. Works with any Electron app — no code changes required.

**Tech Stack:** TypeScript, `ws` (WebSocket), `@modelcontextprotocol/sdk` (MCP), `yargs` (CLI), `vitest` (testing)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `bin/cli.js`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "electron-debugger",
  "version": "0.1.0",
  "description": "MCP server for debugging Electron apps via Chrome DevTools Protocol",
  "type": "module",
  "bin": {
    "electron-debugger": "./bin/cli.js"
  },
  "main": "./dist/index.js",
  "files": ["dist", "bin"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.15.0",
    "ws": "^8.18.2",
    "yargs": "^17.7.2"
  },
  "devDependencies": {
    "@types/node": "^22.19.1",
    "@types/ws": "^8.18.1",
    "typescript": "^5.9.3",
    "vitest": "^4.1.8"
  },
  "keywords": ["electron", "debug", "cdp", "mcp", "opencode"],
  "license": "MIT"
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create bin/cli.js**

```js
#!/usr/bin/env node
import '../dist/index.js';
```

- [ ] **Step 4: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: All deps installed, no errors.

- [ ] **Step 6: Verify build works**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json bin/cli.js vitest.config.ts
git commit -m "feat: scaffold electron-debugger package"
```

---

### Task 2: Config Module

**Files:**
- Create: `src/config.ts`
- Test: `tests/config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/config.test.ts
import { describe, it, expect } from 'vitest';
import { getConfig } from '../src/config.js';

describe('config', () => {
  it('returns default values when no overrides', () => {
    const config = getConfig({});
    expect(config.port).toBe(9222);
    expect(config.host).toBe('127.0.0.1');
    expect(config.reconnect).toBe(true);
    expect(config.reconnectDelay).toBe(1000);
    expect(config.maxRetries).toBe(10);
  });

  it('merges provided overrides with defaults', () => {
    const config = getConfig({ port: 9333, reconnect: false });
    expect(config.port).toBe(9333);
    expect(config.host).toBe('127.0.0.1');
    expect(config.reconnect).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/config.ts
export interface DebugConfig {
  port: number;
  host: string;
  reconnect: boolean;
  reconnectDelay: number;
  maxRetries: number;
}

export interface ConfigOverrides {
  port?: number;
  host?: string;
  reconnect?: boolean;
  reconnectDelay?: number;
  maxRetries?: number;
}

const defaults: DebugConfig = {
  port: 9222,
  host: '127.0.0.1',
  reconnect: true,
  reconnectDelay: 1000,
  maxRetries: 10,
};

export function getConfig(overrides: ConfigOverrides): DebugConfig {
  return { ...defaults, ...overrides };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat: add config module"
```

---

### Task 3: CDP Client

**Files:**
- Create: `src/cdp-client.ts`
- Create: `src/types.ts`
- Test: `tests/cdp-client.test.ts`

- [ ] **Step 1: Create types module**

```ts
// src/types.ts

export interface CdpTarget {
  id: string;
  title: string;
  url: string;
  type: string;
  webSocketDebuggerUrl: string;
}

export interface CdpResponse {
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

export interface DomNode {
  nodeId: number;
  nodeType: number;
  nodeName: string;
  nodeValue?: string;
  attributes?: Record<string, string>;
  children?: DomNode[];
  childNodeCount?: number;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/cdp-client.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CdpClient } from '../src/cdp-client.js';

describe('CdpClient', () => {
  let client: CdpClient;

  beforeEach(() => {
    client = new CdpClient({ port: 9222, host: '127.0.0.1' });
  });

  it('should be disconnected initially', () => {
    expect(client.isConnected()).toBe(false);
  });

  it('should generate increasing message IDs', () => {
    const id1 = client.nextId();
    const id2 = client.nextId();
    expect(id2).toBe(id1 + 1);
  });

  it('should build discovery URL', () => {
    expect(client.discoveryUrl()).toBe('http://127.0.0.1:9222/json');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/cdp-client.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write minimal implementation**

```ts
// src/cdp-client.ts
import WebSocket from 'ws';
import { getConfig, type DebugConfig, type ConfigOverrides } from './config.js';
import type { CdpTarget, CdpResponse } from './types.js';

export class CdpClient {
  private ws: WebSocket | null = null;
  private msgId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private config: DebugConfig;
  private target: CdpTarget | null = null;

  constructor(overrides?: ConfigOverrides) {
    this.config = getConfig(overrides ?? {});
  }

  nextId(): number {
    return this.msgId++;
  }

  discoveryUrl(): string {
    return `http://${this.config.host}:${this.config.port}/json`;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    const targets = await this.discoverTargets();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No page target found');
    this.target = page;
    await this.connectToTarget(page.webSocketDebuggerUrl);
  }

  async disconnect(): Promise<void> {
    this.ws?.close();
    this.ws = null;
    this.target = null;
  }

  async send<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    if (!this.ws) throw new Error('Not connected');
    return new Promise((resolve, reject) => {
      const id = this.nextId();
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.ws!.send(JSON.stringify({ id, method, params: params ?? {} }));
    }) as Promise<T>;
  }

  async discoverTargets(): Promise<CdpTarget[]> {
    const resp = await fetch(this.discoveryUrl());
    return resp.json() as Promise<CdpTarget[]>;
  }

  private async connectToTarget(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.ws.on('open', () => resolve());
      this.ws.on('message', (data: Buffer) => this.handleMessage(data));
      this.ws.on('error', (err) => reject(err));
      this.ws.on('close', () => {
        this.ws = null;
        this.target = null;
      });
    });
  }

  private handleMessage(data: Buffer): void {
    const msg = JSON.parse(data.toString()) as CdpResponse;
    if (msg.id && this.pending.has(msg.id)) {
      const cb = this.pending.get(msg.id)!;
      this.pending.delete(msg.id);
      if (msg.error) cb.reject(new Error(msg.error.message));
      else cb.resolve(msg.result);
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/cdp-client.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/cdp-client.ts src/types.ts tests/cdp-client.test.ts
git commit -m "feat: add CDP client"
```

---

### Task 4: DOM Tools

**Files:**
- Create: `src/tools/dom.ts`
- Create: `src/tools/index.ts`
- Test: `tests/tools/dom.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/tools/dom.test.ts
import { describe, it, expect } from 'vitest';
import { createDomTools } from '../src/tools/dom.js';
import { CdpClient } from '../src/cdp-client.js';

describe('DOM tools', () => {
  const mockClient = {
    send: () => Promise.resolve({ root: { nodeId: 1 } }),
  } as unknown as CdpClient;

  const tools = createDomTools(mockClient);

  it('registers get-dom-snapshot tool', () => {
    const tool = tools.find(t => t.name === 'get-dom-snapshot');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('selector');
  });

  it('registers get-element-box tool', () => {
    const tool = tools.find(t => t.name === 'get-element-box');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('selector');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tools/dom.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the DOM tools module and ToolDefinition type**

```ts
// src/tools/index.ts
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}
```

```ts
// src/tools/dom.ts
import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export function createDomTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'get-dom-snapshot',
      description: 'Get a snapshot of the DOM tree starting from a CSS selector. Returns the DOM subtree with node names, attributes, and text content.',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector for the root element' },
          maxDepth: { type: 'number', description: 'Maximum depth of the DOM tree to return (default: all)' },
        },
        required: ['selector'],
      },
      handler: async (args: Record<string, unknown>) => {
        const selector = args.selector as string;
        const maxDepth = args.maxDepth as number | undefined;
        if (!selector) throw new Error('selector is required');

        const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument', { depth: maxDepth ?? -1 });
        const nodeResult = await client.send<{ nodeId: number }>('DOM.querySelector', {
          nodeId: doc.root.nodeId,
          selector,
        });
        const nodeDetail = await client.send<{ node: unknown }>('DOM.describeNode', {
          nodeId: nodeResult.nodeId,
          depth: maxDepth ?? -1,
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(nodeDetail.node, null, 2) }],
        };
      },
    },

    {
      name: 'get-element-box',
      description: 'Get the box model (position, size, padding, border, margin) of an element by CSS selector.',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector' },
        },
        required: ['selector'],
      },
      handler: async (args: Record<string, unknown>) => {
        const selector = args.selector as string;
        if (!selector) throw new Error('selector is required');

        const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument');
        const node = await client.send<{ nodeId: number }>('DOM.querySelector', {
          nodeId: doc.root.nodeId,
          selector,
        });

        const model = await client.send<{
          model: {
            content: number[];
            padding: number[];
            border: number[];
            margin: number[];
            width: number;
            height: number;
          };
        }>('DOM.getBoxModel', { nodeId: node.nodeId });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              selector,
              content: model.model.content,
              padding: model.model.padding,
              border: model.model.border,
              margin: model.model.margin,
              width: model.model.width,
              height: model.model.height,
            }, null, 2),
          }],
        };
      },
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tools/dom.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/ tests/tools/
git commit -m "feat: add DOM inspection tools"
```

---

### Task 5: Styles Tool

**Files:**
- Create: `src/tools/styles.ts`
- Test: `tests/tools/styles.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/tools/styles.test.ts
import { describe, it, expect } from 'vitest';
import { createStylesTools } from '../src/tools/styles.js';
import { CdpClient } from '../src/cdp-client.js';

describe('Styles tools', () => {
  const mockClient = {
    send: () => Promise.resolve({ root: { nodeId: 1 } }),
  } as unknown as CdpClient;

  const tools = createStylesTools(mockClient);

  it('registers get-element-styles tool', () => {
    const tool = tools.find(t => t.name === 'get-element-styles');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('selector');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tools/styles.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the styles tool**

```ts
// src/tools/styles.ts
import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export function createStylesTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'get-element-styles',
      description: 'Get computed styles and matched CSS rules for an element by CSS selector.',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector' },
          properties: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional list of specific CSS properties to return (e.g., ["color", "font-size"]). Returns all if not specified.',
          },
        },
        required: ['selector'],
      },
      handler: async (args: Record<string, unknown>) => {
        const selector = args.selector as string;
        const properties = args.properties as string[] | undefined;

        const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument');
        const node = await client.send<{ nodeId: number }>('DOM.querySelector', {
          nodeId: doc.root.nodeId,
          selector,
        });

        const styles = await client.send<{
          computedStyle: Array<{ name: string; value: string }>;
        }>('CSS.getComputedStyleForNode', { nodeId: node.nodeId });

        let result = styles.computedStyle;
        if (properties && properties.length > 0) {
          const propSet = new Set(properties);
          result = result.filter(s => propSet.has(s.name));
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(
              result.reduce((acc, s) => ({ ...acc, [s.name]: s.value }), {}),
              null, 2
            ),
          }],
        };
      },
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tools/styles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/styles.ts tests/tools/styles.test.ts
git commit -m "feat: add element styles tool"
```

---

### Task 6: Screenshot Tool

**Files:**
- Create: `src/tools/screenshot.ts`
- Test: `tests/tools/screenshot.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/tools/screenshot.test.ts
import { describe, it, expect } from 'vitest';
import { createScreenshotTools } from '../src/tools/screenshot.js';
import { CdpClient } from '../src/cdp-client.js';

describe('Screenshot tools', () => {
  const mockClient = {
    send: () => Promise.resolve({ root: { nodeId: 1 } }),
  } as unknown as CdpClient;

  const tools = createScreenshotTools(mockClient);

  it('registers take-screenshot tool', () => {
    const tool = tools.find(t => t.name === 'take-screenshot');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties).toHaveProperty('format');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tools/screenshot.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the screenshot tool**

```ts
// src/tools/screenshot.ts
import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export function createScreenshotTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'take-screenshot',
      description: 'Take a screenshot of the current page or a specific element. Returns base64-encoded PNG data.',
      inputSchema: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['png', 'jpeg'], description: 'Image format (default: png)' },
          quality: { type: 'number', description: 'JPEG quality (0-100, default: 80, only for jpeg)' },
          selector: { type: 'string', description: 'CSS selector to capture a specific element (optional)' },
        },
      },
      handler: async (args: Record<string, unknown>) => {
        const format = args.format as string | undefined;
        const quality = args.quality as number | undefined;
        const selector = args.selector as string | undefined;

        let clip: Record<string, unknown> | undefined;
        if (selector) {
          const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument');
          const node = await client.send<{ nodeId: number }>('DOM.querySelector', {
            nodeId: doc.root.nodeId,
            selector,
          });
          const model = await client.send<{
            model: { content: number[]; width: number; height: number };
          }>('DOM.getBoxModel', { nodeId: node.nodeId });
          clip = {
            x: model.model.content[0],
            y: model.model.content[1],
            width: model.model.width,
            height: model.model.height,
            scale: 1,
          };
        }

        const result = await client.send<{ data: string }>('Page.captureScreenshot', {
          format: format ?? 'png',
          quality: format === 'jpeg' ? (quality ?? 80) : undefined,
          clip,
          fromSurface: true,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              format: format ?? 'png',
              data: result.data,
              mimeType: `image/${format ?? 'png'}`,
            }),
          }],
        };
      },
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tools/screenshot.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/screenshot.ts tests/tools/screenshot.test.ts
git commit -m "feat: add screenshot tool"
```

---

### Task 7: Console Tool

**Files:**
- Create: `src/tools/console.ts`
- Test: `tests/tools/console.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/tools/console.test.ts
import { describe, it, expect } from 'vitest';
import { createConsoleTools } from '../src/tools/console.js';
import { CdpClient } from '../src/cdp-client.js';

describe('Console tools', () => {
  const mockClient = {
    send: () => Promise.resolve({}),
  } as unknown as CdpClient;

  const tools = createConsoleTools(mockClient);

  it('registers get-console-logs tool', () => {
    const tool = tools.find(t => t.name === 'get-console-logs');
    expect(tool).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tools/console.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the console tool**

```ts
// src/tools/console.ts
import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export function createConsoleTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'get-console-logs',
      description: 'Get recent console.log/warn/error entries from the Electron renderer process.',
      inputSchema: {
        type: 'object',
        properties: {
          maxEntries: { type: 'number', description: 'Maximum number of log entries to return (default: 50)' },
          level: {
            type: 'string',
            enum: ['all', 'error', 'warn', 'info', 'debug'],
            description: 'Filter by log level (default: all)',
          },
        },
      },
      handler: async (args: Record<string, unknown>) => {
        const maxEntries = args.maxEntries as number | undefined;
        const level = args.level as string | undefined;
        const limit = maxEntries ?? 50;

        await client.send('Console.enable');
        const result = await client.send<{ messages: Array<{ level: string; text: string; source?: string; timestamp: number }> }>('Console.getMessages');

        let messages = result.messages ?? [];
        if (level && level !== 'all') {
          messages = messages.filter(m => m.level === level);
        }
        messages = messages.slice(-limit);

        return {
          content: [{ type: 'text', text: JSON.stringify(messages, null, 2) }],
        };
      },
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tools/console.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/console.ts tests/tools/console.test.ts
git commit -m "feat: add console log tool"
```

---

### Task 8: Metrics Tool

**Files:**
- Create: `src/tools/metrics.ts`
- Test: `tests/tools/metrics.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/tools/metrics.test.ts
import { describe, it, expect } from 'vitest';
import { createMetricsTools } from '../src/tools/metrics.js';
import { CdpClient } from '../src/cdp-client.js';

describe('Metrics tools', () => {
  const mockClient = {
    send: () => Promise.resolve({}),
  } as unknown as CdpClient;

  const tools = createMetricsTools(mockClient);

  it('registers get-metrics tool', () => {
    const tool = tools.find(t => t.name === 'get-metrics');
    expect(tool).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tools/metrics.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the metrics tool**

```ts
// src/tools/metrics.ts
import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export function createMetricsTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'get-metrics',
      description: 'Get performance metrics from the Electron app — FPS, memory usage, DOM node count, and more.',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        await client.send('Performance.enable');
        const result = await client.send<{ metrics: Array<{ name: string; value: number }> }>('Performance.getMetrics');

        const doc = await client.send<{ root: { childNodeCount: number } }>('DOM.getDocument');
        const memory = await client.send<{ result: { value: Record<string, number> } }>('Runtime.evaluate', {
          expression: 'JSON.stringify(process.memoryUsage ? process.memoryUsage() : performance.memory || {})',
          returnByValue: true,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              performance: result.metrics,
              domNodeCount: doc.root.childNodeCount,
              memory: memory.result.value,
            }, null, 2),
          }],
        };
      },
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tools/metrics.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/metrics.ts tests/tools/metrics.test.ts
git commit -m "feat: add metrics tool"
```

---

### Task 9: Interaction Tools

**Files:**
- Create: `src/tools/interact.ts`
- Test: `tests/tools/interact.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/tools/interact.test.ts
import { describe, it, expect } from 'vitest';
import { createInteractTools } from '../src/tools/interact.js';
import { CdpClient } from '../src/cdp-client.js';

describe('Interact tools', () => {
  const mockClient = {
    send: () => Promise.resolve({ root: { nodeId: 1 } }),
  } as unknown as CdpClient;

  const tools = createInteractTools(mockClient);

  it('registers click-element tool', () => {
    const tool = tools.find(t => t.name === 'click-element');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('selector');
  });

  it('registers type-text tool', () => {
    const tool = tools.find(t => t.name === 'type-text');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('selector');
  });

  it('registers highlight-element tool', () => {
    const tool = tools.find(t => t.name === 'highlight-element');
    expect(tool).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tools/interact.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the interact tools**

```ts
// src/tools/interact.ts
import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export function createInteractTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'click-element',
      description: 'Click an element identified by CSS selector. Simulates a real mouse click on the target element.',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector of the element to click' },
        },
        required: ['selector'],
      },
      handler: async (args: Record<string, unknown>) => {
        const selector = args.selector as string;
        const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument');
        const node = await client.send<{ nodeId: number }>('DOM.querySelector', {
          nodeId: doc.root.nodeId,
          selector,
        });
        const model = await client.send<{ model: { content: number[] } }>('DOM.getBoxModel', { nodeId: node.nodeId });
        const [x, y] = model.model.content;

        await client.send('Input.dispatchMouseEvent', {
          type: 'mousePressed', x: x + 1, y: y + 1, button: 'left', clickCount: 1,
        });
        await client.send('Input.dispatchMouseEvent', {
          type: 'mouseReleased', x: x + 1, y: y + 1, button: 'left', clickCount: 1,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ clicked: selector, x: x + 1, y: y + 1 }) }] };
      },
    },

    {
      name: 'type-text',
      description: 'Type text into an input field identified by CSS selector.',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector of the input element' },
          text: { type: 'string', description: 'Text to type' },
          clearFirst: { type: 'boolean', description: 'Clear the field before typing (default: true)' },
        },
        required: ['selector', 'text'],
      },
      handler: async (args: Record<string, unknown>) => {
        const selector = args.selector as string;
        const text = args.text as string;
        const clearFirst = args.clearFirst as boolean | undefined;

        const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument');
        const node = await client.send<{ nodeId: number }>('DOM.querySelector', {
          nodeId: doc.root.nodeId,
          selector,
        });
        const model = await client.send<{ model: { content: number[] } }>('DOM.getBoxModel', { nodeId: node.nodeId });
        const [x, y] = model.model.content;

        await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x + 1, y: y + 1, button: 'left', clickCount: 1 });
        await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 1, y: y + 1, button: 'left', clickCount: 1 });

        if (clearFirst !== false) {
          await client.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 2, windowsVirtualKeyCode: 65, code: 'KeyA', key: 'a' });
          await client.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 2, windowsVirtualKeyCode: 65, code: 'KeyA', key: 'a' });
          await client.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 0, windowsVirtualKeyCode: 46, code: 'Delete', key: 'Delete' });
          await client.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 0, windowsVirtualKeyCode: 46, code: 'Delete', key: 'Delete' });
        }

        await client.send('Input.insertText', { text });

        return { content: [{ type: 'text', text: JSON.stringify({ typed: text, into: selector }) }] };
      },
    },

    {
      name: 'highlight-element',
      description: 'Visually highlight an element in the Electron app window with a colored outline.',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector of the element to highlight' },
          color: { type: 'string', description: 'Highlight color in rgba format (default: "rgba(255, 0, 0, 0.3)")' },
          duration: { type: 'number', description: 'How long to show the highlight in ms (default: 2000, 0 = permanent)' },
        },
        required: ['selector'],
      },
      handler: async (args: Record<string, unknown>) => {
        const selector = args.selector as string;
        const color = args.color as string | undefined;
        const duration = args.duration as number | undefined;

        const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument');
        const node = await client.send<{ nodeId: number }>('DOM.querySelector', {
          nodeId: doc.root.nodeId,
          selector,
        });

        await client.send('Overlay.enable');
        await client.send('Overlay.highlightNode', {
          nodeId: node.nodeId,
          highlightConfig: {
            contentColor: { r: 255, g: 0, b: 0, a: 0.3 },
            paddingColor: { r: 0, g: 255, b: 0, a: 0.3 },
          },
        });

        return { content: [{ type: 'text', text: JSON.stringify({ highlighted: selector, duration: duration ?? 2000 }) }] };
      },
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tools/interact.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/interact.ts tests/tools/interact.test.ts
git commit -m "feat: add interaction tools (click, type, highlight)"
```

---

### Task 10: Windows Tool + Tool Registry

**Files:**
- Create: `src/tools/windows.ts`
- Modify: `src/tools/index.ts`
- Test: `tests/tools/windows.test.ts`
- Test: `tests/tools/index.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/tools/windows.test.ts
import { describe, it, expect } from 'vitest';
import { createWindowsTools } from '../src/tools/windows.js';
import { CdpClient } from '../src/cdp-client.js';

describe('Windows tools', () => {
  const mockClient = { send: () => Promise.resolve({}) } as unknown as CdpClient;
  const tools = createWindowsTools(mockClient);

  it('registers list-windows tool', () => {
    const tool = tools.find(t => t.name === 'list-windows');
    expect(tool).toBeDefined();
  });
});
```

```ts
// tests/tools/index.test.ts
import { describe, it, expect } from 'vitest';
import { registerAllTools } from '../src/tools/index.js';
import { CdpClient } from '../src/cdp-client.js';

describe('Tool registry', () => {
  it('registers all tool definitions', () => {
    const mockClient = { send: () => Promise.resolve({}), discoverTargets: () => Promise.resolve([]) } as unknown as CdpClient;
    const tools = registerAllTools(mockClient);
    const names = tools.map(t => t.name).sort();
    expect(names).toEqual([
      'click-element',
      'get-console-logs',
      'get-dom-snapshot',
      'get-element-box',
      'get-element-styles',
      'get-metrics',
      'highlight-element',
      'list-windows',
      'take-screenshot',
      'type-text',
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/tools/windows.test.ts tests/tools/index.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the windows tool and update registry**

```ts
// src/tools/windows.ts
import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export function createWindowsTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'list-windows',
      description: 'List all open BrowserWindows/targets in the Electron app, with their titles and URLs.',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        const targets = await client.discoverTargets();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(
              targets.map(t => ({ id: t.id, title: t.title, url: t.url, type: t.type })),
              null, 2
            ),
          }],
        };
      },
    },
  ];
}
```

Update `src/tools/index.ts`:

```ts
import type { CdpClient } from '../cdp-client.js';
import { createDomTools } from './dom.js';
import { createStylesTools } from './styles.js';
import { createScreenshotTools } from './screenshot.js';
import { createConsoleTools } from './console.js';
import { createMetricsTools } from './metrics.js';
import { createInteractTools } from './interact.js';
import { createWindowsTools } from './windows.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

export function registerAllTools(client: CdpClient): ToolDefinition[] {
  return [
    ...createDomTools(client),
    ...createStylesTools(client),
    ...createScreenshotTools(client),
    ...createConsoleTools(client),
    ...createMetricsTools(client),
    ...createInteractTools(client),
    ...createWindowsTools(client),
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/tools/windows.test.ts tests/tools/index.test.ts`
Expected: Both PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/windows.ts src/tools/index.ts tests/tools/windows.test.ts tests/tools/index.test.ts
git commit -m "feat: add list-windows tool and tool registry"
```

---

### Task 11: MCP Server

**Files:**
- Create: `src/mcp-server.ts`
- Test: `tests/mcp-server.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/mcp-server.test.ts
import { describe, it, expect } from 'vitest';
import { McpServer } from '../src/mcp-server.js';

describe('McpServer', () => {
  it('creates server with name and version', () => {
    const server = new McpServer();
    expect(server).toBeDefined();
    expect(server.name).toBe('electron-debugger');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mcp-server.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the MCP server**

```ts
// src/mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CdpClient } from './cdp-client.js';
import { registerAllTools, type ToolDefinition } from './tools/index.js';
import type { ConfigOverrides } from './config.js';

export class McpServer {
  name = 'electron-debugger';
  private server: Server;
  private tools: ToolDefinition[] = [];

  constructor(config?: ConfigOverrides) {
    this.server = new Server(
      { name: this.name, version: '0.1.0' },
      { capabilities: { tools: {} } },
    );
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = this.tools.find(t => t.name === request.params.name);
      if (!tool) {
        return {
          content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }],
          isError: true,
        };
      }
      try {
        return await tool.handler(request.params.arguments ?? {});
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    });
  }

  async connect(client: CdpClient): Promise<void> {
    this.tools = registerAllTools(client);
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  async close(): Promise<void> {
    await this.server.close();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mcp-server.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/mcp-server.ts tests/mcp-server.test.ts
git commit -m "feat: add MCP server"
```

---

### Task 12: CLI Entry Point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Write the entry point**

```ts
// src/index.ts
#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CdpClient } from './cdp-client.js';
import { McpServer } from './mcp-server.js';

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .command('mcp', 'Start the MCP server on stdio', (y) =>
      y.option('port', { type: 'number', description: 'CDP port', default: 9222 })
       .option('host', { type: 'string', description: 'CDP host', default: '127.0.0.1' }),
    )
    .command('screenshot', 'Take a screenshot and output base64 data', (y) =>
      y.option('port', { type: 'number', default: 9222 })
       .option('output', { type: 'string', description: 'Save to file path' }),
    )
    .command('get-dom', 'Dump the DOM tree', (y) =>
      y.option('port', { type: 'number', default: 9222 })
       .option('selector', { type: 'string', default: 'body' })
       .option('depth', { type: 'number' }),
    )
    .demandCommand(1)
    .strict()
    .parse();

  const cmd = argv._[0] as string;

  if (cmd === 'mcp') {
    const port = (argv as unknown as { port: number }).port ?? 9222;
    const host = (argv as unknown as { host: string }).host ?? '127.0.0.1';

    const client = new CdpClient({ port, host });
    await client.connect();

    const server = new McpServer({ port, host });
    await server.connect(client);

    process.stdin.on('end', async () => {
      await server.close();
      await client.disconnect();
    });
  } else if (cmd === 'screenshot') {
    const { port, output } = argv as unknown as { port: number; output?: string };
    const client = new CdpClient({ port });
    await client.connect();
    const result = await client.send<{ data: string }>('Page.captureScreenshot', { format: 'png', fromSurface: true });
    if (output) {
      const fs = await import('fs');
      fs.writeFileSync(output, Buffer.from(result.data, 'base64'));
      console.log(`Screenshot saved to ${output}`);
    } else {
      console.log(result.data);
    }
    await client.disconnect();
  } else if (cmd === 'get-dom') {
    const { port, selector, depth } = argv as unknown as { port: number; selector?: string; depth?: number };
    const client = new CdpClient({ port });
    await client.connect();
    const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument', { depth: depth ?? -1 });
    const node = await client.send<{ nodeId: number }>('DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: selector ?? 'body',
    });
    const detail = await client.send('DOM.describeNode', { nodeId: node.nodeId, depth: depth ?? -1 });
    console.log(JSON.stringify(detail, null, 2));
    await client.disconnect();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add CLI entry point with mcp, screenshot, get-dom commands"
```

---

### Task 13: README, .gitignore, Final Build

**Files:**
- Create: `README.md`
- Create: `.gitignore`

- [ ] **Step 1: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
.vite/
```

- [ ] **Step 2: Create README.md**

```markdown
# electron-debugger

An MCP server for debugging Electron apps via Chrome DevTools Protocol (CDP). Works with **any** Electron app — no code changes required.

## Usage

### 1. Start your Electron app with remote debugging

```bash
electron . --remote-debugging-port=9222
```

### 2. Configure opencode

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

### 3. Debug

Now opencode can inspect your app:

- "What does the app look like?" → takes a screenshot
- "Find the login button and highlight it" → highlights element
- "What styles are on the sidebar?" → returns computed CSS
- "Click the Settings button and show me the result" → interacts and screenshots
- "Are there any JS errors?" → fetches console logs
- "Is the app UI performing well?" → returns performance metrics

## CLI Commands

```bash
# Start MCP server (for opencode)
npx electron-debugger mcp --port=9222

# One-off screenshot
npx electron-debugger screenshot --output app.png

# Dump DOM tree
npx electron-debugger get-dom --selector="body" --depth=5
```

## Requirements

- Node.js 18+
- Electron app started with `--remote-debugging-port`
```

- [ ] **Step 3: Build the package**

Run: `npm run build`
Expected: dist/ directory created with compiled JS

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add README.md .gitignore
git commit -m "docs: add README and .gitignore"
```
