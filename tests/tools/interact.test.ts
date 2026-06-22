import { describe, it, expect } from 'vitest';
import { createInteractTools } from '../../src/tools/interact.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('Interact tools', () => {
  const mockClient = { send: () => Promise.resolve({ root: { nodeId: 1 } }) } as unknown as CdpClient;
  const tools = createInteractTools(mockClient);

  it('registers click-element tool', () => {
    const tool = tools.find(t => t.name === 'click-element');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('selector');
  });

  it('click-element dispatches mouse events at element center', async () => {
    const events: Array<{ type: string; x: number; y: number }> = [];
    const clickClient = {
      send: (method: string, params?: Record<string, unknown>) => {
        if (method === 'DOM.getDocument') return Promise.resolve({ root: { nodeId: 1 } });
        if (method === 'DOM.querySelector') return Promise.resolve({ nodeId: 5 });
        if (method === 'DOM.getBoxModel') return Promise.resolve({
          model: { content: [100, 200, 400, 200, 400, 600, 100, 600] },
        });
        if (method === 'Input.dispatchMouseEvent') {
          events.push({ type: (params as Record<string, unknown>).type as string, x: (params as Record<string, unknown>).x as number, y: (params as Record<string, unknown>).y as number });
          return Promise.resolve({});
        }
        return Promise.resolve({});
      },
    } as unknown as CdpClient;
    const clickTool = createInteractTools(clickClient).find(t => t.name === 'click-element')!;
    await clickTool.handler({ selector: 'button' });
    // Box model content is [x1,y1, x2,y2, x3,y3, x4,y4]; center = midpoint of (x1,y1) and (x3,y3)
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: 'mousePressed', x: 250, y: 400 });
    expect(events[1]).toEqual({ type: 'mouseReleased', x: 250, y: 400 });
  });

  it('registers type-text tool', () => {
    const tool = tools.find(t => t.name === 'type-text');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('selector');
  });

  it('registers highlight-element tool', () => {
    const tool = tools.find(t => t.name === 'highlight-element');
    expect(tool).toBeDefined();
  });
});
