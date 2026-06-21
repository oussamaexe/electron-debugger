import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

function buildIpcScript(channel: string, args: unknown[], timeoutMs: number): string {
  const argExpr = args.length > 0 ? ', ' + args.map(a => JSON.stringify(a)).join(', ') : '';
  return `(async function() {
  try {
    var { ipcRenderer } = require('electron');
    var result = await Promise.race([
      ipcRenderer.invoke(${JSON.stringify(channel)}${argExpr}),
      new Promise(function(_, reject) { setTimeout(function() { reject(new Error('IPC timeout after ' + ${timeoutMs} + 'ms')); }, ${timeoutMs}); })
    ]);
    return JSON.stringify({ success: true, data: result });
  } catch(e) {
    return JSON.stringify({ success: false, error: (e && e.message) || String(e) || 'Unknown error' });
  }
})()`;
}

export function createElectronTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'invoke-ipc-main',
      description: 'Call an Electron IPC handler (ipcRenderer.invoke) and return the response. Works when the renderer has Node.js integration enabled. Best-effort — fails gracefully if ipcRenderer is not available.',
      inputSchema: {
        type: 'object',
        properties: {
          channel: { type: 'string', description: 'IPC channel name' },
          args: { type: 'array', items: {}, description: 'Arguments to pass to the IPC handler (optional)' },
          timeout: { type: 'number', description: 'Response timeout in milliseconds (default: 5000)' },
        },
        required: ['channel'],
      },
      handler: async (args: Record<string, unknown>) => {
        const channel = args.channel as string;
        if (!channel) throw new Error('channel is required');
        const callArgs = (args.args as unknown[]) ?? [];
        const timeout = (args.timeout as number) ?? 5000;

        const script = buildIpcScript(channel, callArgs, timeout);
        const result = await client.send<{ result: { value: string } }>('Runtime.evaluate', {
          expression: script,
          returnByValue: true,
        });

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(result.result.value);
        } catch {
          parsed = { success: false, error: 'Failed to parse IPC response' };
        }

        if (String(parsed.error).includes('require is not defined') || String(parsed.error).includes('ipcRenderer')) {
          parsed.error = 'ipcRenderer not available — app may be sandboxed. Requires Node.js integration.';
        }

        return { content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }] };
      },
    },
  ];
}
