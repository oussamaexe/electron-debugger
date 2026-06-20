import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export function createWindowsTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'list-windows',
      description: 'List all open BrowserWindows/targets in the Electron app, with their titles and URLs.',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        const targets = await client.discoverTargets();
        return {
          content: [{ type: 'text', text: JSON.stringify(targets.map(t => ({ id: t.id, title: t.title, url: t.url, type: t.type })), null, 2) }],
        };
      },
    },
  ];
}
