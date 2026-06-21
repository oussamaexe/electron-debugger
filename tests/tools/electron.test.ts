import { describe, it, expect } from 'vitest';
import { createElectronTools } from '../../src/tools/electron.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('Electron tools', () => {
  it('registers invoke-ipc-main tool', () => {
    const mockClient = { send: () => Promise.resolve({}) } as unknown as CdpClient;
    const tools = createElectronTools(mockClient);
    const tool = tools.find(t => t.name === 'invoke-ipc-main');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('channel');
  });

  it('invokes IPC and returns result', async () => {
    const mockClient = {
      send: (method: string) => {
        if (method === 'Runtime.evaluate') {
          return Promise.resolve({ result: { value: JSON.stringify({ success: true, data: { user: 'test' } }) } });
        }
        return Promise.resolve({});
      },
    } as unknown as CdpClient;
    const tools = createElectronTools(mockClient);
    const result = await tools[0].handler({ channel: 'get-user', args: [1] });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.data.user).toBe('test');
  });

  it('handles IPC errors', async () => {
    const mockClient = {
      send: () => Promise.resolve({ result: { value: JSON.stringify({ success: false, error: 'Channel not found' }) } }),
    } as unknown as CdpClient;
    const tools = createElectronTools(mockClient);
    const result = await tools[0].handler({ channel: 'invalid' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe('Channel not found');
  });

  it('requires channel parameter', async () => {
    const mockClient = { send: () => Promise.resolve({}) } as unknown as CdpClient;
    const tools = createElectronTools(mockClient);
    const tool = tools.find(t => t.name === 'invoke-ipc-main')!;
    await expect(tool.handler({})).rejects.toThrow();
  });
});
