import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';
import { resolveNodeId } from './dom.js';

export function createStylesTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'get-element-styles',
      description: 'Get computed styles for an element by CSS selector.',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector' },
          properties: {
            type: 'array', items: { type: 'string' },
            description: 'Optional list of specific CSS properties (e.g., ["color", "font-size"]). Returns all if not specified.',
          },
        },
        required: ['selector'],
      },
      handler: async (args: Record<string, unknown>) => {
        const selector = args.selector as string;
        const properties = args.properties as string[] | undefined;
        const nodeId = await resolveNodeId(client, selector);

        const styles = await client.send<{ computedStyle: Array<{ name: string; value: string }> }>('CSS.getComputedStyleForNode', { nodeId });

        let result = styles.computedStyle;
        if (properties && properties.length > 0) {
          const propertySet = new Set(properties);
          result = result.filter(s => propertySet.has(s.name));
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result.reduce((acc, s) => ({ ...acc, [s.name]: s.value }), {}), null, 2) }],
        };
      },
    },
  ];
}
