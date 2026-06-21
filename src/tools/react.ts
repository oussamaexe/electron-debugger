import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

const FIBER_WALKER_SCRIPT = `
(function(maxDepth, rootSelector) {
  var rootEl = rootSelector ? document.querySelector(rootSelector) : (document.getElementById('root') || document.body);
  var fiberKey = Object.keys(rootEl).find(function(k) { return k.startsWith('__reactFiber'); });
  if (!fiberKey) return 'null';
  var fiber = rootEl[fiberKey];
  while (fiber && !fiber.memoizedState && fiber.child) fiber = fiber.child;
  if (!fiber) return 'null';

  var TAG_MAP = { 0: 'function', 1: 'class', 2: 'host', 5: 'host', 6: 'host', 7: 'fragment', 8: 'portal', 10: 'memo', 11: 'forward-ref', 13: 'suspense' };

  function walkFiber(f, depth) {
    if (!f || depth > maxDepth) return null;
    var tag = f.tag;
    var name = (f.type && f.type.displayName) || (f.type && f.type.name) || (typeof f.type === 'string' ? f.type : (TAG_MAP[tag] || 'unknown'));
    var props = {};
    if (f.memoizedProps) {
      Object.keys(f.memoizedProps).forEach(function(k) {
        if (k !== 'children' && typeof f.memoizedProps[k] !== 'function') {
          try { props[k] = JSON.parse(JSON.stringify(f.memoizedProps[k])); }
          catch(e) { props[k] = String(f.memoizedProps[k]); }
        }
      });
    }
    var state = null;
    if (f.memoizedState) {
      try { state = JSON.parse(JSON.stringify(f.memoizedState)); }
      catch(e) { state = String(f.memoizedState); }
    }
    var children = [];
    var child = f.child;
    while (child) {
      var childNode = walkFiber(child, depth + 1);
      if (childNode) children.push(childNode);
      child = child.sibling;
    }
    return { name: name, type: TAG_MAP[tag] || 'unknown', props: props, state: state, children: children };
  }

  return JSON.stringify(walkFiber(fiber, 0));
})(%d, %s)
`;

export function createReactTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'get-react-fiber-tree',
      description: 'Walk the React fiber tree to get component hierarchy, props, and state. Works with React 16.8+.',
      inputSchema: {
        type: 'object',
        properties: {
          rootSelector: { type: 'string', description: 'CSS selector for the root React element (default: #root, then body)' },
          maxDepth: { type: 'number', description: 'Maximum depth to traverse (default: 5, max: 20)' },
        },
      },
      handler: async (args: Record<string, unknown>) => {
        const maxDepth = Math.min((args.maxDepth as number) ?? 5, 20);
        const rootSelector = (args.rootSelector as string) ?? 'null';
        const script = FIBER_WALKER_SCRIPT.replace('%d', String(maxDepth)).replace('%s', rootSelector === 'null' ? 'null' : JSON.stringify(rootSelector));
        const result = await client.send<{ result: { value: string } }>('Runtime.evaluate', {
          expression: script,
          returnByValue: true,
        });
        const raw = result.result.value;
        if (raw === 'null') {
          return { content: [{ type: 'text', text: 'No React fiber tree found. Is this a React app using React 16.8+?' }] };
        }
        return { content: [{ type: 'text', text: raw }] };
      },
    },
  ];
}
