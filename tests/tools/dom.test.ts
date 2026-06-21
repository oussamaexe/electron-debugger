import { describe, it, expect } from 'vitest';
import { createDomTools, formatNode } from '../../src/tools/dom.js';
import type { CdpClient } from '../../src/cdp-client.js';

describe('formatNode', () => {
  it('formats a simple element with text child', () => {
    const node = {
      nodeType: 1,
      nodeName: 'SPAN',
      attributes: ['class', 'label'],
      children: [
        { nodeType: 3, nodeName: '#text', nodeValue: 'Hello', children: [] },
      ],
    };
    expect(formatNode(node)).toBe('<span class="label">Hello</span>');
  });

  it('formats nested elements with indentation', () => {
    const node = {
      nodeType: 1,
      nodeName: 'DIV',
      attributes: ['id', 'root', 'class', 'container'],
      children: [
        {
          nodeType: 1,
          nodeName: 'NAV',
          attributes: ['class', 'sidebar'],
          children: [
            { nodeType: 3, nodeName: '#text', nodeValue: 'Menu', children: [] },
          ],
        },
        {
          nodeType: 1,
          nodeName: 'MAIN',
          attributes: [],
          children: [
            {
              nodeType: 1,
              nodeName: 'BUTTON',
              attributes: ['class', 'btn'],
              children: [
                { nodeType: 3, nodeName: '#text', nodeValue: 'Click', children: [] },
              ],
            },
          ],
        },
      ],
    };
    expect(formatNode(node)).toBe(
      '<div id="root" class="container">\n' +
      '  <nav class="sidebar">Menu</nav>\n' +
      '  <main>\n' +
      '    <button class="btn">Click</button>\n' +
      '  </main>\n' +
      '</div>'
    );
  });

  it('handles elements with no children as self-closing', () => {
    const node = {
      nodeType: 1,
      nodeName: 'BR',
      attributes: [],
      children: [],
    };
    expect(formatNode(node)).toBe('<br />');
  });

  it('handles empty text nodes', () => {
    const node = {
      nodeType: 1,
      nodeName: 'DIV',
      attributes: [],
      children: [
        { nodeType: 3, nodeName: '#text', nodeValue: '', children: [] },
      ],
    };
    expect(formatNode(node)).toBe('<div></div>');
  });

  it('formats SVG elements', () => {
    const node = {
      nodeType: 1,
      nodeName: 'svg',
      isSVG: true,
      attributes: ['viewBox', '0 0 24 24', 'class', 'icon'],
      children: [
        {
          nodeType: 1,
          nodeName: 'circle',
          isSVG: true,
          attributes: ['cx', '12', 'cy', '12', 'r', '10'],
          children: [],
        },
      ],
    };
    expect(formatNode(node)).toBe('<svg viewBox="0 0 24 24" class="icon">\n  <circle cx="12" cy="12" r="10" />\n</svg>');
  });
});

describe('DOM tools', () => {
  const mockClient = {
    send: (method: string) => {
      if (method === 'DOM.getDocument') return Promise.resolve({ root: { nodeId: 1 } });
      if (method === 'DOM.querySelector') return Promise.resolve({ nodeId: 5 });
      if (method === 'DOM.describeNode') return Promise.resolve({
        node: {
          nodeType: 1,
          nodeName: 'DIV',
          attributes: ['id', 'root', 'class', 'container'],
          children: [
            { nodeType: 3, nodeName: '#text', nodeValue: 'Hello', children: [] },
          ],
        },
      });
      return Promise.resolve({});
    },
  } as unknown as CdpClient;

  const tools = createDomTools(mockClient);

  it('registers get-dom-snapshot tool', () => {
    const tool = tools.find(t => t.name === 'get-dom-snapshot');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('selector');
  });

  it('get-dom-snapshot returns HTML-like tree', async () => {
    const tool = tools.find(t => t.name === 'get-dom-snapshot')!;
    const result = await tool.handler({ selector: '#root' });
    expect(result.content[0].text).toBe('<div id="root" class="container">Hello</div>');
  });

  it('registers get-element-box tool', () => {
    const tool = tools.find(t => t.name === 'get-element-box');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('selector');
  });
});
