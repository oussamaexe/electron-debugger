#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CdpClient } from './cdp-client.js';
import { getConfig } from './config.js';
import { createMcpServer } from './mcp-server.js';
import { registerAllTools } from './tools/index.js';

export async function main(): Promise<void> {
  const config = getConfig({});

  yargs(hideBin(process.argv))
    .command('mcp', 'Start MCP server', async () => {
      const client = new CdpClient();
      await createMcpServer(client, config);
    })
    .command('exec <tool> [args..]', 'Execute a tool directly', (yargs) => {
      yargs.positional('tool', { type: 'string', describe: 'Tool name', demandOption: true });
      yargs.positional('args', { type: 'string', array: true, describe: 'Key=value arguments' });
    }, async (argv) => {
      const client = new CdpClient();
      await client.connect();
      const tools = registerAllTools(client);
      const tool = tools.find(t => t.name === argv.tool);
      if (!tool) throw new Error(`Unknown tool: ${argv.tool}`);
      const parsedArgs: Record<string, unknown> = {};
      const rawArgs = argv.args as string[] | undefined;
      if (rawArgs) {
        for (const arg of rawArgs) {
          const [key, ...rest] = arg.split('=');
          const value = rest.join('=');
          parsedArgs[key] = value;
        }
      }
      const result = await tool.handler(parsedArgs);
      console.log(JSON.stringify(result, null, 2));
      await client.disconnect();
    })
    .demandCommand(1, 'Usage: electron-debugger <mcp|exec>')
    .strict()
    .parse();
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
