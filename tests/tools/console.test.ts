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

  it('returns intercepted console entries', async () => {
    const logClient = {
      send: (method: string) => {
        if (method === 'Runtime.evaluate') {
          return Promise.resolve({ result: { value: JSON.stringify([{ level: 'info', text: 'hello', timestamp: 1000 }]) } });
        }
        return Promise.resolve({});
      },
    } as unknown as CdpClient;
    const result = await createConsoleTools(logClient)[0].handler({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].text).toBe('hello');
  });

  it('filters by level', async () => {
    const logClient = {
      send: (method: string) => {
        if (method === 'Runtime.evaluate') {
          return Promise.resolve({ result: { value: JSON.stringify([
            { level: 'info', text: 'log msg', timestamp: 1 },
            { level: 'error', text: 'err msg', timestamp: 2 },
          ]) } });
        }
        return Promise.resolve({});
      },
    } as unknown as CdpClient;
    const result = await createConsoleTools(logClient)[0].handler({ level: 'error' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].level).toBe('error');
  });
});
