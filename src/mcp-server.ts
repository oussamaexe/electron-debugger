import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { CdpClient } from './cdp-client.js';
import { registerAllTools } from './tools/index.js';
import type { DebugConfig } from './config.js';

export async function createMcpServer(client: CdpClient, config: DebugConfig): Promise<Server> {
  const server = new Server(
    { name: 'electron-debugger', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  const tools = registerAllTools(client);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = tools.find(t => t.name === name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool.handler(args ?? {});
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
