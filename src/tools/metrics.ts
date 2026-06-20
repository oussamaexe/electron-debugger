import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

export function createMetricsTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'get-metrics',
      description: 'Get performance metrics from the Electron app — FPS, memory usage, DOM node count, and more.',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        await client.send('Performance.enable');
        const result = await client.send<{ metrics: Array<{ name: string; value: number }> }>('Performance.getMetrics');
        const doc = await client.send<{ root: { childNodeCount: number } }>('DOM.getDocument', { depth: 0 });
        const memory = await client.send<{ result: { value: Record<string, number> } }>('Runtime.evaluate', {
          expression: 'JSON.stringify(process.memoryUsage ? process.memoryUsage() : performance.memory || {})',
          returnByValue: true,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ performance: result.metrics, domNodeCount: doc.root.childNodeCount, memory: memory.result.value }, null, 2) }] };
      },
    },
  ];
}
