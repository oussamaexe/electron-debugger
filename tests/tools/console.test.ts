import { describe, it, expect, vi } from 'vitest';
import { createConsoleTools } from '../../src/tools/console.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('Console tools', () => {
  it('registers get-console-logs tool', () => {
    const client = { send: () => Promise.resolve({}), on: vi.fn(), off: vi.fn() } as unknown as CdpClient;
    const tools = createConsoleTools(client);
    const tool = tools.find(t => t.name === 'get-console-logs');
    expect(tool).toBeDefined();
  });

  it('enables Runtime domain and listens for consoleAPICalled events', async () => {
    const onFn = vi.fn();
    let sendMethod = '';
    const client = {
      send: (method: string) => {
        sendMethod = method;
        return Promise.resolve({});
      },
      on: onFn,
      off: vi.fn(),
    } as unknown as CdpClient;
    const tool = createConsoleTools(client).find(t => t.name === 'get-console-logs')!;
    await tool.handler({});

    expect(sendMethod).toBe('Runtime.enable');
    expect(onFn).toHaveBeenCalledWith('Runtime.consoleAPICalled', expect.any(Function));
  });

  it('returns entries accumulated from Runtime.consoleAPICalled events', async () => {
    let eventCallback: ((params: Record<string, unknown>) => void) | undefined;
    const client = {
      send: () => Promise.resolve({}),
      on: (_method: string, cb: (params: Record<string, unknown>) => void) => { eventCallback = cb; },
      off: vi.fn(),
    } as unknown as CdpClient;
    const tool = createConsoleTools(client).find(t => t.name === 'get-console-logs')!;

    // First call to set up listener
    await tool.handler({});

    // Simulate some console events
    eventCallback!({ type: 'log', args: [{ type: 'string', value: 'hello' }], timestamp: 1000 });
    eventCallback!({ type: 'warn', args: [{ type: 'string', value: 'caution' }], timestamp: 2000 });
    eventCallback!({ type: 'error', args: [{ type: 'string', value: 'fail' }], timestamp: 3000 });

    const result = await tool.handler({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({ level: 'info', text: 'hello', timestamp: 1000 });
    expect(parsed[1]).toEqual({ level: 'warning', text: 'caution', timestamp: 2000 });
    expect(parsed[2]).toEqual({ level: 'error', text: 'fail', timestamp: 3000 });
  });

  it('filters by level', async () => {
    let eventCallback: ((params: Record<string, unknown>) => void) | undefined;
    const client = {
      send: () => Promise.resolve({}),
      on: (_method: string, cb: (params: Record<string, unknown>) => void) => { eventCallback = cb; },
      off: vi.fn(),
    } as unknown as CdpClient;
    const tool = createConsoleTools(client).find(t => t.name === 'get-console-logs')!;

    await tool.handler({});
    eventCallback!({ type: 'log', args: [{ type: 'string', value: 'log msg' }], timestamp: 1000 });
    eventCallback!({ type: 'error', args: [{ type: 'string', value: 'err msg' }], timestamp: 2000 });

    const result = await tool.handler({ level: 'error' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].level).toBe('error');
  });

  it('clears buffer after returning entries', async () => {
    let eventCallback: ((params: Record<string, unknown>) => void) | undefined;
    const client = {
      send: () => Promise.resolve({}),
      on: (_method: string, cb: (params: Record<string, unknown>) => void) => { eventCallback = cb; },
      off: vi.fn(),
    } as unknown as CdpClient;
    const tool = createConsoleTools(client).find(t => t.name === 'get-console-logs')!;

    await tool.handler({});
    eventCallback!({ type: 'log', args: [{ type: 'string', value: 'first' }], timestamp: 1000 });

    const first = await tool.handler({});
    expect(JSON.parse(first.content[0].text)).toHaveLength(1);

    eventCallback!({ type: 'log', args: [{ type: 'string', value: 'second' }], timestamp: 2000 });

    const second = await tool.handler({});
    const parsed = JSON.parse(second.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].text).toBe('second');
  });
});
