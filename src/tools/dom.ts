import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

interface CdpNode {
  nodeType: number;
  nodeName: string;
  nodeValue?: string;
  attributes?: string[];
  children?: CdpNode[];
  isSVG?: boolean;
}

export function formatNode(node: CdpNode, depth = 0): string {
  const indent = '  '.repeat(depth);

  if (node.nodeType === 3) {
    const text = (node.nodeValue ?? '').trim();
    return text ? `${indent}${text}` : '';
  }

  const tagName = node.nodeName.toLowerCase();
  const attrs = formatAttributes(node.attributes ?? []);
  const children = node.children ?? [];

  if (children.length === 0) {
    return `${indent}<${tagName}${attrs} />`;
  }

  if (children.length === 1 && children[0].nodeType === 3) {
    const text = (children[0].nodeValue ?? '').trim();
    return `${indent}<${tagName}${attrs}>${text}</${tagName}>`;
  }

  const childLines: string[] = [];
  for (const child of children) {
    const formatted = formatNode(child, depth + 1);
    if (formatted) childLines.push(formatted);
  }

  if (childLines.length === 0) {
    return `${indent}<${tagName}${attrs}></${tagName}>`;
  }

  return `${indent}<${tagName}${attrs}>\n${childLines.join('\n')}\n${indent}</${tagName}>`;
}

function formatAttributes(attributes: string[]): string {
  let result = '';
  for (let i = 0; i < attributes.length; i += 2) {
    const key = attributes[i];
    const value = (attributes[i + 1] ?? '').replace(/"/g, '&quot;');
    result += ` ${key}="${value}"`;
  }
  return result;
}

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
        const nodeDetail = await client.send<{ node: CdpNode }>('DOM.describeNode', {
          nodeId,
          depth: maxDepth ?? -1,
        });

        const tree = formatNode(nodeDetail.node);

        return {
          content: [{ type: 'text', text: tree }],
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
