import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

interface CdpNode {
  nodeType: number;
  nodeName: string;
  nodeValue?: string;
  childNodeCount?: number;
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

    {
      name: 'get-page-summary',
      description: 'Get a lightweight overview of the current page state — title, URL, viewport, scroll position, element counts, and top-level DOM structure. A single call to understand the full window state.',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        const [docInfo, viewport, counts, doc] = await Promise.all([
          client.send<{ result: { value: { title: string; url: string } } }>('Runtime.evaluate', {
            expression: '({ title: document.title, url: document.location.href })',
            returnByValue: true,
          }),
          client.send<{ result: { value: { width: number; height: number; scrollX: number; scrollY: number } } }>('Runtime.evaluate', {
            expression: '({ width: window.innerWidth, height: window.innerHeight, scrollX: window.scrollX, scrollY: window.scrollY })',
            returnByValue: true,
          }),
          client.send<{ result: { value: { buttons: number; inputs: number; links: number; images: number } } }>('Runtime.evaluate', {
            expression: `({
              buttons: document.querySelectorAll('button, [role="button"]').length,
              inputs: document.querySelectorAll('input, textarea, select').length,
              links: document.querySelectorAll('a[href]').length,
              images: document.querySelectorAll('img').length,
            })`,
            returnByValue: true,
          }),
          client.send<{ root: CdpNode }>('DOM.getDocument', { depth: 1 }),
        ]);

        const structure = formatNode(doc.root);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              title: docInfo.result.value.title,
              url: docInfo.result.value.url,
              viewport: {
                width: viewport.result.value.width,
                height: viewport.result.value.height,
              },
              scroll: {
                x: viewport.result.value.scrollX,
                y: viewport.result.value.scrollY,
              },
              elements: {
                total: doc.root.childNodeCount ?? 0,
                buttons: counts.result.value.buttons,
                inputs: counts.result.value.inputs,
                links: counts.result.value.links,
                images: counts.result.value.images,
              },
              structure,
            }, null, 2),
          }],
        };
      },
    },
  ];
}
