import { describe, it, expect } from 'vitest';
import { createScreenshotTools } from '../../src/tools/screenshot.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('Screenshot tools', () => {
  const mockClient = { send: () => Promise.resolve({ root: { nodeId: 1 } }) } as unknown as CdpClient;
  const tools = createScreenshotTools(mockClient);

  it('registers take-screenshot tool', () => {
    const tool = tools.find(t => t.name === 'take-screenshot');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties).toHaveProperty('format');
  });
});
