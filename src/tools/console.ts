import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

const LEVEL_MAP: Record<string, string> = {
  log: 'info',
  info: 'info',
  warn: 'warning',
  error: 'error',
  debug: 'debug',
  dir: 'info',
  dirxml: 'info',
  table: 'info',
  trace: 'info',
  assert: 'error',
};

interface ConsoleEntry {
  level: string;
  text: string;
  timestamp: number;
}

interface RemoteObject {
  type: string;
  value?: unknown;
  description?: string;
  objectId?: string;
}

function formatRemoteObject(arg: RemoteObject): string {
  switch (arg.type) {
    case 'string': return String(arg.value ?? '');
    case 'number': return String(arg.value);
    case 'boolean': return String(arg.value);
    case 'undefined': return 'undefined';
    case 'object':
      if (arg.value === null) return 'null';
      return arg.description ?? String(arg.value ?? '');
    case 'function': return arg.description ?? 'function()';
    default: return arg.description ?? String(arg.value ?? '');
  }
}

export function createConsoleTools(client: CdpClient): ToolDefinition[] {
  const buffer: ConsoleEntry[] = [];
  let initialized = false;

  async function ensureListening(): Promise<void> {
    if (initialized) return;
    await client.send('Runtime.enable');
    client.on('Runtime.consoleAPICalled', (params: Record<string, unknown>) => {
      const type = params.type as string;
      const args = params.args as RemoteObject[] | undefined;
      const timestamp = params.timestamp as number | undefined;
      buffer.push({
        level: LEVEL_MAP[type] ?? 'info',
        text: (args ?? []).map(formatRemoteObject).join(' '),
        timestamp: timestamp ?? Date.now(),
      });
    });
    initialized = true;
  }

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

        await ensureListening();

        let messages = buffer.splice(0);
        if (level && level !== 'all') messages = messages.filter(m => m.level === level);
        messages = messages.slice(-limit);

        return { content: [{ type: 'text', text: JSON.stringify(messages, null, 2) }] };
      },
    },
  ];
}
