import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export async function resolveNodeId(client: CdpClient, selector: string): Promise<number> {
  const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument', { depth: 0 });
  const result = await client.send<{ nodeId: number }>('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector,
  });
  if (!result.nodeId) throw new Error(`Element not found: "${selector}"`);
  return result.nodeId;
}

export function createDomTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'get-dom-snapshot',
      description: 'Get a snapshot of the DOM tree starting from a CSS selector. Returns the DOM subtree with node names, attributes, and text content.',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector for the root element' },
          maxDepth: { type: 'number', description: 'Maximum depth (default: all)' },
        },
        required: ['selector'],
      },
      handler: async (args: Record<string, unknown>) => {
        const selector = args.selector as string;
        const maxDepth = args.maxDepth as number | undefined;
        if (!selector) throw new Error('selector is required');

        const nodeId = await resolveNodeId(client, selector);
        const nodeDetail = await client.send<{ node: unknown }>('DOM.describeNode', {
          nodeId,
          depth: maxDepth ?? -1,
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(nodeDetail.node, null, 2) }],
        };
      },
    },

    {
      name: 'get-element-box',
      description: 'Get the box model (position, size, padding, border, margin) of an element by CSS selector.',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector' },
        },
        required: ['selector'],
      },
      handler: async (args: Record<string, unknown>) => {
        const selector = args.selector as string;
        if (!selector) throw new Error('selector is required');

        const nodeId = await resolveNodeId(client, selector);
        const result = await client.send<{
          model: {
            content: number[];
            padding: number[];
            border: number[];
            margin: number[];
            width: number;
            height: number;
          };
        }>('DOM.getBoxModel', { nodeId });
        const { content, padding, border, margin, width, height } = result.model;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ selector, content, padding, border, margin, width, height }, null, 2),
          }],
        };
      },
    },
  ];
}
