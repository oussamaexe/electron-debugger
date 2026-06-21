import { describe, it, expect, vi } from 'vitest';
import { createStylesTools } from '../../src/tools/styles.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('Styles tools', () => {
  const mockClient = {
    send: vi.fn((method: string) => {
      if (method === 'DOM.getDocument') return Promise.resolve({ root: { nodeId: 1 } });
      if (method === 'DOM.querySelector') return Promise.resolve({ nodeId: 5 });
      if (method === 'CSS.enable') return Promise.resolve({});
      if (method === 'CSS.getComputedStyleForNode') return Promise.resolve({ computedStyle: [] });
      return Promise.resolve({});
    }),
  } as unknown as CdpClient;

  const tools = createStylesTools(mockClient);

  it('registers get-element-styles tool', () => {
    const tool = tools.find(t => t.name === 'get-element-styles');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('selector');
  });

  it('enables CSS agent before fetching styles', async () => {
    const tool = tools.find(t => t.name === 'get-element-styles')!;
    await tool.handler({ selector: 'body' });
    const calls = (mockClient.send as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
    expect(calls).toContain('CSS.enable');
    const cssEnableIdx = calls.indexOf('CSS.enable');
    const getStylesIdx = calls.indexOf('CSS.getComputedStyleForNode');
    expect(cssEnableIdx).toBeLessThan(getStylesIdx);
  });
});
