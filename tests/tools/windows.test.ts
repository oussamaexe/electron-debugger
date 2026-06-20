import { describe, it, expect } from 'vitest';
import { createWindowsTools } from '../../src/tools/windows.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('Windows tools', () => {
  const mockClient = { send: () => Promise.resolve({}), discoverTargets: () => Promise.resolve([]) } as unknown as CdpClient;
  const tools = createWindowsTools(mockClient);

  it('registers list-windows tool', () => {
    const tool = tools.find(t => t.name === 'list-windows');
    expect(tool).toBeDefined();
  });
});
