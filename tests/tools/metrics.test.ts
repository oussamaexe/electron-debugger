import { describe, it, expect } from 'vitest';
import { createMetricsTools } from '../../src/tools/metrics.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('Metrics tools', () => {
  const mockClient = { send: () => Promise.resolve({}) } as unknown as CdpClient;
  const tools = createMetricsTools(mockClient);

  it('registers get-metrics tool', () => {
    const tool = tools.find(t => t.name === 'get-metrics');
    expect(tool).toBeDefined();
  });
});
