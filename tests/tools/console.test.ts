import { describe, it, expect } from 'vitest';
import { createConsoleTools } from '../../src/tools/console.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('Console tools', () => {
  const mockClient = { send: () => Promise.resolve({}) } as unknown as CdpClient;
  const tools = createConsoleTools(mockClient);

  it('registers get-console-logs tool', () => {
    const tool = tools.find(t => t.name === 'get-console-logs');
    expect(tool).toBeDefined();
  });
});
