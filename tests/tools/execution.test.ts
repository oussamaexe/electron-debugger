import { describe, it, expect } from 'vitest';
import { createExecutionTools } from '../../src/tools/execution.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('Execution tools', () => {
  it('registers evaluate-script tool', () => {
    const mockClient = { send: () => Promise.resolve({}) } as unknown as CdpClient;
    const tools = createExecutionTools(mockClient);
    const tool = tools.find(t => t.name === 'evaluate-script');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('expression');
  });

  it('evaluates expression and returns result', async () => {
    const mockClient = {
      send: (method: string) => {
        if (method === 'Runtime.evaluate') return Promise.resolve({ result: { value: 42 }, exceptionDetails: undefined });
        return Promise.resolve({});
      },
    } as unknown as CdpClient;
    const tools = createExecutionTools(mockClient);
    const result = await tools[0].handler({ expression: '1 + 41' });
    expect(result.content[0].text).toBe('42');
  });

  it('handles evaluation errors', async () => {
    const mockClient = {
      send: () => Promise.resolve({ result: { value: undefined }, exceptionDetails: { text: 'ReferenceError: x is not defined' } }),
    } as unknown as CdpClient;
    const tools = createExecutionTools(mockClient);
    const result = await tools[0].handler({ expression: 'x' });
    expect(result.content[0].text).toContain('Error');
  });

  it('requires expression parameter', async () => {
    const mockClient = { send: () => Promise.resolve({}) } as unknown as CdpClient;
    const tools = createExecutionTools(mockClient);
    const tool = tools.find(t => t.name === 'evaluate-script')!;
    await expect(tool.handler({})).rejects.toThrow();
  });
});
