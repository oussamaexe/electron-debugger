import { describe, it, expect } from 'vitest';
import { createReactTools } from '../../src/tools/react.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('React tools', () => {
  it('registers get-react-fiber-tree tool', () => {
    const mockClient = { send: () => Promise.resolve({}) } as unknown as CdpClient;
    const tools = createReactTools(mockClient);
    const tool = tools.find(t => t.name === 'get-react-fiber-tree');
    expect(tool).toBeDefined();
  });

  it('returns fiber tree structure', async () => {
    const sampleTree = [
      { name: 'App', type: 'function', props: {}, state: null, children: [
        { name: 'Header', type: 'function', props: { title: 'Hello' }, state: null, children: [] },
      ]},
    ];
    const mockClient = {
      send: (method: string) => {
        if (method === 'Runtime.evaluate') return Promise.resolve({ result: { value: JSON.stringify(sampleTree) } });
        return Promise.resolve({});
      },
    } as unknown as CdpClient;
    const tools = createReactTools(mockClient);
    const result = await tools[0].handler({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('App');
    expect(parsed[0].children[0].props.title).toBe('Hello');
  });

  it('handles no React app gracefully', async () => {
    const mockClient = {
      send: () => Promise.resolve({ result: { value: 'null' } }),
    } as unknown as CdpClient;
    const tools = createReactTools(mockClient);
    const result = await tools[0].handler({});
    expect(result.content[0].text).toContain('No React');
  });
});
