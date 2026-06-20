import { describe, it, expect } from 'vitest';
import { createStylesTools } from '../../src/tools/styles.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('Styles tools', () => {
  const mockClient = { send: () => Promise.resolve({ root: { nodeId: 1 } }) } as unknown as CdpClient;
  const tools = createStylesTools(mockClient);

  it('registers get-element-styles tool', () => {
    const tool = tools.find(t => t.name === 'get-element-styles');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('selector');
  });
});
