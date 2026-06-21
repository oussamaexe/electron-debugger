#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CdpClient } from './cdp-client.js';
import { getConfig } from './config.js';
import { createMcpServer } from './mcp-server.js';
import { registerAllTools } from './tools/index.js';

export function parseExecArgs(rawArgs: string[]): Record<string, unknown> {
  const parsedArgs: Record<string, unknown> = {};
  for (const arg of rawArgs) {
    const [key, ...rest] = arg.split('=');
    let value: string | boolean | number = rest.join('=');
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    parsedArgs[key] = value;
  }
  return parsedArgs;
}

export async function main(): Promise<void> {
  const config = getConfig({});

  await yargs(hideBin(process.argv))
    .command('mcp', 'Start MCP server (stdio)', async () => {
      const client = new CdpClient();
      await createMcpServer(client, config);
    })
    .command('exec <tool> [args..]', 'Execute a tool directly', (yargs) => {
      yargs.positional('tool', { type: 'string', describe: 'Tool name', demandOption: true });
      yargs.positional('args', { type: 'string', array: true, describe: 'Key=value arguments' });
    }, async (argv) => {
      const client = new CdpClient();
      const tools = registerAllTools(client);
      const tool = tools.find(t => t.name === argv.tool);
      if (!tool) throw new Error(`Unknown tool: ${argv.tool}`);
      const parsedArgs = parseExecArgs((argv.args ?? []) as string[]);
      const result = await tool.handler(parsedArgs);
      for (const item of result.content) {
        if (item.type === 'text') console.log(item.text);
      }
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
