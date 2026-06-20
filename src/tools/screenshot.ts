import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export function createScreenshotTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'take-screenshot',
      description: 'Take a screenshot of the current page or a specific element. Returns base64-encoded PNG data.',
      inputSchema: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['png', 'jpeg'], description: 'Image format (default: png)' },
          quality: { type: 'number', description: 'JPEG quality (0-100, default: 80, only for jpeg)' },
          selector: { type: 'string', description: 'CSS selector to capture a specific element (optional)' },
        },
      },
      handler: async (args: Record<string, unknown>) => {
        const format = args.format as string | undefined;
        const quality = args.quality as number | undefined;
        const selector = args.selector as string | undefined;

        let clip: Record<string, unknown> | undefined;
        if (selector) {
          const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument', { depth: 0 });
          const node = await client.send<{ nodeId: number }>('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
          if (!node.nodeId) throw new Error(`Element not found: "${selector}"`);
          const model = await client.send<{ model: { content: number[]; width: number; height: number } }>('DOM.getBoxModel', { nodeId: node.nodeId });
          clip = { x: model.model.content[0], y: model.model.content[1], width: model.model.width, height: model.model.height, scale: 1 };
        }

        const result = await client.send<{ data: string }>('Page.captureScreenshot', {
          format: format ?? 'png',
          quality: format === 'jpeg' ? (quality ?? 80) : undefined,
          clip, fromSurface: true,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ format: format ?? 'png', data: result.data, mimeType: `image/${format ?? 'png'}` }) }] };
      },
    },
  ];
}
