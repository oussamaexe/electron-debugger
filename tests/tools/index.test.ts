import { describe, it, expect } from 'vitest';
import { registerAllTools } from '../../src/tools/index.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('Tool registry', () => {
  it('registers all 15 tool definitions', () => {
    const mockClient = { send: () => Promise.resolve({}), discoverTargets: () => Promise.resolve([]) } as unknown as CdpClient;
    const tools = registerAllTools(mockClient);
    const names = tools.map(t => t.name).sort();
    expect(names).toEqual([
      'assert-visual-regression',
      'click-element',
      'evaluate-script',
      'get-console-logs',
      'get-dom-snapshot',
      'get-element-box',
      'get-element-styles',
      'get-metrics',
      'get-page-summary',
      'get-react-fiber-tree',
      'highlight-element',
      'invoke-ipc-main',
      'list-windows',
      'take-screenshot',
      'type-text',
    ]);
  });
});
