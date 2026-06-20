import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export function createInteractTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'click-element',
      description: 'Click an element identified by CSS selector.',
      inputSchema: {
        type: 'object', properties: { selector: { type: 'string', description: 'CSS selector' } }, required: ['selector'],
      },
      handler: async (args: Record<string, unknown>) => {
        const selector = args.selector as string;
        const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument', { depth: 0 });
        const node = await client.send<{ nodeId: number }>('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
        if (!node.nodeId) throw new Error(`Element not found: "${selector}"`);
        const model = await client.send<{ model: { content: number[] } }>('DOM.getBoxModel', { nodeId: node.nodeId });
        const [x, y] = model.model.content;

        await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x + 1, y: y + 1, button: 'left', clickCount: 1 });
        await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 1, y: y + 1, button: 'left', clickCount: 1 });

        return { content: [{ type: 'text', text: JSON.stringify({ clicked: selector, x: x + 1, y: y + 1 }) }] };
      },
    },
    {
      name: 'type-text',
      description: 'Type text into an input field identified by CSS selector.',
      inputSchema: {
        type: 'object', properties: {
          selector: { type: 'string', description: 'CSS selector' },
          text: { type: 'string', description: 'Text to type' },
          clearFirst: { type: 'boolean', description: 'Clear the field before typing (default: true)' },
        }, required: ['selector', 'text'],
      },
      handler: async (args: Record<string, unknown>) => {
        const selector = args.selector as string;
        const text = args.text as string;
        const clearFirst = args.clearFirst as boolean | undefined;

        const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument', { depth: 0 });
        const node = await client.send<{ nodeId: number }>('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
        if (!node.nodeId) throw new Error(`Element not found: "${selector}"`);
        const model = await client.send<{ model: { content: number[] } }>('DOM.getBoxModel', { nodeId: node.nodeId });
        const [x, y] = model.model.content;

        await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x + 1, y: y + 1, button: 'left', clickCount: 1 });
        await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 1, y: y + 1, button: 'left', clickCount: 1 });

        if (clearFirst !== false) {
          await client.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 2, windowsVirtualKeyCode: 65, code: 'KeyA', key: 'a' });
          await client.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 2, windowsVirtualKeyCode: 65, code: 'KeyA', key: 'a' });
          await client.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 0, windowsVirtualKeyCode: 46, code: 'Delete', key: 'Delete' });
          await client.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 0, windowsVirtualKeyCode: 46, code: 'Delete', key: 'Delete' });
        }

        await client.send('Input.insertText', { text });
        return { content: [{ type: 'text', text: JSON.stringify({ typed: text, into: selector }) }] };
      },
    },
    {
      name: 'highlight-element',
      description: 'Visually highlight an element in the Electron app window with a colored outline.',
      inputSchema: {
        type: 'object', properties: {
          selector: { type: 'string', description: 'CSS selector' },
          color: { type: 'string', description: 'rgba color (default: "rgba(255,0,0,0.3)")' },
          duration: { type: 'number', description: 'Duration in ms (default: 2000, 0 = permanent)' },
        }, required: ['selector'],
      },
      handler: async (args: Record<string, unknown>) => {
        const selector = args.selector as string;
        const duration = args.duration as number | undefined;

        const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument', { depth: 0 });
        const node = await client.send<{ nodeId: number }>('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
        if (!node.nodeId) throw new Error(`Element not found: "${selector}"`);

        await client.send('Overlay.enable');
        await client.send('Overlay.highlightNode', {
          nodeId: node.nodeId,
          highlightConfig: { contentColor: { r: 255, g: 0, b: 0, a: 0.3 }, paddingColor: { r: 0, g: 255, b: 0, a: 0.3 } },
        });

        return { content: [{ type: 'text', text: JSON.stringify({ highlighted: selector, duration: duration ?? 2000 }) }] };
      },
    },
  ];
}
