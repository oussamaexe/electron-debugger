import { describe, it, expect } from 'vitest';
import { createDomTools } from '../../src/tools/dom.js';
import type { CdpClient } from '../../src/cdp-client.js';

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
