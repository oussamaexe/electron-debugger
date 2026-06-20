import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export function createConsoleTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'get-console-logs',
      description: 'Get recent console.log/warn/error entries from the Electron renderer process.',
      inputSchema: {
        type: 'object',
        properties: {
          maxEntries: { type: 'number', description: 'Maximum entries to return (default: 50)' },
          level: { type: 'string', enum: ['all', 'error', 'warn', 'info', 'debug'], description: 'Filter by log level (default: all)' },
        },
      },
      handler: async (args: Record<string, unknown>) => {
        const maxEntries = args.maxEntries as number | undefined;
        const level = args.level as string | undefined;
        const limit = maxEntries ?? 50;

        await client.send('Console.enable');
        const result = await client.send<{ messages: Array<{ level: string; text: string; source?: string; timestamp: number }> }>('Console.getMessages');

        let messages = result.messages ?? [];
        if (level && level !== 'all') messages = messages.filter(m => m.level === level);
        messages = messages.slice(-limit);

        return { content: [{ type: 'text', text: JSON.stringify(messages, null, 2) }] };
      },
    },
  ];
}
