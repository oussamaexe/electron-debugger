import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

const INTERCEPT_SCRIPT = `
(function() {
  if (window.__consoleLogs) return;
  window.__consoleLogs = [];
  var levels = ['log', 'warn', 'error', 'info', 'debug'];
  levels.forEach(function(level) {
    var orig = console[level];
    console[level] = function() {
      window.__consoleLogs.push({
        level: level === 'log' ? 'info' : level === 'warn' ? 'warning' : level === 'error' ? 'error' : level === 'debug' ? 'debug' : 'info',
        text: Array.from(arguments).map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' '),
        timestamp: Date.now(),
      });
      return orig.apply(console, arguments);
    };
  });
})();
`;

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

        await client.send('Runtime.evaluate', { expression: INTERCEPT_SCRIPT, returnByValue: true });

        const result = await client.send<{ result: { value: string } }>('Runtime.evaluate', {
          expression: 'JSON.stringify(window.__consoleLogs.splice(0))',
          returnByValue: true,
        });

        let messages: Array<{ level: string; text: string; timestamp: number }> = [];
        try {
          messages = JSON.parse(result.result.value);
        } catch {
          // malformed response — return empty
        }

        if (level && level !== 'all') messages = messages.filter(m => m.level === level);
        messages = messages.slice(-limit);

        return { content: [{ type: 'text', text: JSON.stringify(messages, null, 2) }] };
      },
    },
  ];
}
