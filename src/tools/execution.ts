import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export function createExecutionTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'evaluate-script',
      description: 'Execute arbitrary JavaScript in the page context and return the result. Useful for reading Redux/Context state, triggering errors, modifying stores, or any programmatic control.',
      inputSchema: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'JavaScript expression to evaluate' },
        },
        required: ['expression'],
      },
      handler: async (args: Record<string, unknown>) => {
        const expression = args.expression as string;
        if (!expression) throw new Error('expression is required');
        const result = await client.send<{ result: { value: unknown }; exceptionDetails?: unknown }>('Runtime.evaluate', {
          expression,
          returnByValue: true,
        });
        if (result.exceptionDetails) {
          return { content: [{ type: 'text', text: `Error: ${JSON.stringify(result.exceptionDetails, null, 2)}` }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify(result.result.value, null, 2) }] };
      },
    },
  ];
}
