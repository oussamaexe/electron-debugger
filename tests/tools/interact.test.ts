import { describe, it, expect } from 'vitest';
import { createInteractTools } from '../../src/tools/interact.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('Interact tools', () => {
  const mockClient = { send: () => Promise.resolve({ root: { nodeId: 1 } }) } as unknown as CdpClient;
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
