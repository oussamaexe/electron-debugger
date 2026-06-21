import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import type { CdpClient } from '../cdp-client.js';
import type { ToolDefinition } from './index.js';

const require = createRequire(import.meta.url);
interface PngImage { data: Buffer; width: number; height: number }
const { PNG } = require('pngjs') as { PNG: { new (options: { width: number; height: number; fill?: boolean }): PngImage; sync: { read: (buf: Buffer) => PngImage; write: (png: PngImage) => Buffer } } };
import pixelmatch from 'pixelmatch';

export function createVisualTools(client: CdpClient): ToolDefinition[] {
  return [
    {
      name: 'assert-visual-regression',
      description: 'Compare a live screenshot against a baseline image. Returns pass/fail with mismatch percentage. Optionally saves a diff overlay.',
      inputSchema: {
        type: 'object',
        properties: {
          baselinePath: { type: 'string', description: 'Path to the baseline PNG file' },
          selector: { type: 'string', description: 'CSS selector to capture a specific element (optional, defaults to full page)' },
          threshold: { type: 'number', description: 'Maximum mismatch ratio to pass (0-1, default: 0.01)' },
          outputDiff: { type: 'string', description: 'Path to save the diff overlay PNG (optional)' },
        },
        required: ['baselinePath'],
      },
      handler: async (args: Record<string, unknown>) => {
        const baselinePath = args.baselinePath as string;
        const selector = args.selector as string | undefined;
        const threshold = (args.threshold as number) ?? 0.01;
        const outputDiff = args.outputDiff as string | undefined;

        let clip: Record<string, unknown> | undefined;
        if (selector) {
          const doc = await client.send<{ root: { nodeId: number } }>('DOM.getDocument', { depth: 0 });
          const queryResult = await client.send<{ nodeId: number }>('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
          if (!queryResult.nodeId) throw new Error(`Element not found: "${selector}"`);
          const model = await client.send<{ model: { content: number[]; width: number; height: number } }>('DOM.getBoxModel', { nodeId: queryResult.nodeId });
          clip = { x: model.model.content[0], y: model.model.content[1], width: model.model.width, height: model.model.height, scale: 1 };
        }
        const screenshot = await client.send<{ data: string }>('Page.captureScreenshot', {
          format: 'png', clip, fromSurface: true,
        });

        const screenshotPng = PNG.sync.read(Buffer.from(screenshot.data, 'base64'));

        let baselineBuffer: Buffer;
        try {
          baselineBuffer = await readFile(baselinePath);
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`Baseline not found: ${baselinePath}`);
          throw err;
        }
        const baselinePng = PNG.sync.read(baselineBuffer);

        const width = Math.min(screenshotPng.width, baselinePng.width);
        const height = Math.min(screenshotPng.height, baselinePng.height);
        const diffPng = new PNG({ width: screenshotPng.width, height: screenshotPng.height });
        const mismatched = pixelmatch(screenshotPng.data, baselinePng.data, diffPng.data, width, height);
        const totalPixels = width * height;
        const mismatchPercentage = totalPixels > 0 ? mismatched / totalPixels : 1;

        if (outputDiff) {
          await writeFile(outputDiff, PNG.sync.write(diffPng));
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              pass: mismatchPercentage <= threshold,
              mismatchPercentage,
              diffPath: outputDiff ?? undefined,
              baselinePath,
            }, null, 2),
          }],
        };
      },
    },
  ];
}
