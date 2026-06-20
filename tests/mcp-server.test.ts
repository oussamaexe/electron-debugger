import { describe, it, expect, vi } from 'vitest';
import { createMcpServer } from '../src/mcp-server.js';
import type { CdpClient } from '../src/cdp-client.js';

describe('MCP Server', () => {
  it('returns a Server instance', async () => {
    const mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue({}),
      discoverTargets: vi.fn().mockResolvedValue([]),
    } as unknown as CdpClient;
    const server = await createMcpServer(mockClient, { port: 9222, host: '127.0.0.1' });
    expect(server).toBeDefined();
    expect(typeof server).toBe('object');
  });
});
