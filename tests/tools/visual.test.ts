import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createVisualTools } from '../../src/tools/visual.js';
import type { CdpClient } from '../../src/cdp-client.js';
import { writeFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);
const { PNG } = req('pngjs') as { PNG: { sync: { read: (buf: Buffer) => { data: Buffer; width: number; height: number }; write: (png: { data: Buffer; width: number; height: number }) => Buffer } } };

describe('Visual tools', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vis-test-'));
  });

  afterAll(() => {
    try { unlinkSync(join(tmpDir, 'baseline.png')); } catch {}
    try { unlinkSync(join(tmpDir, 'diff.png')); } catch {}
    try { unlinkSync(join(tmpDir, 'current.png')); } catch {}
    try { unlinkSync(tmpDir); } catch {}
  });

  it('registers assert-visual-regression tool', () => {
    const mockClient = { send: () => Promise.resolve({}) } as unknown as CdpClient;
    const tools = createVisualTools(mockClient);
    const tool = tools.find(t => t.name === 'assert-visual-regression');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('baselinePath');
  });

  it('passes identical images', async () => {
    const png = new PNG({ width: 2, height: 2 });
    png.data[0] = 255; png.data[1] = 0; png.data[2] = 0; png.data[3] = 255;
    png.data[4] = 255; png.data[5] = 0; png.data[6] = 0; png.data[7] = 255;
    png.data[8] = 255; png.data[9] = 0; png.data[10] = 0; png.data[11] = 255;
    png.data[12] = 255; png.data[13] = 0; png.data[14] = 0; png.data[15] = 255;
    const baselinePath = join(tmpDir, 'baseline.png');
    writeFileSync(baselinePath, PNG.sync.write(png));

    const mockClient = {
      send: (method: string) => {
        if (method === 'Page.captureScreenshot') {
          const samePng = new PNG({ width: 2, height: 2 });
          samePng.data[0] = 255; samePng.data[1] = 0; samePng.data[2] = 0; samePng.data[3] = 255;
          samePng.data[4] = 255; samePng.data[5] = 0; samePng.data[6] = 0; samePng.data[7] = 255;
          samePng.data[8] = 255; samePng.data[9] = 0; samePng.data[10] = 0; samePng.data[11] = 255;
          samePng.data[12] = 255; samePng.data[13] = 0; samePng.data[14] = 0; samePng.data[15] = 255;
          return Promise.resolve({ data: PNG.sync.write(samePng).toString('base64') });
        }
        return Promise.resolve({});
      },
    } as unknown as CdpClient;

    const tools = createVisualTools(mockClient);
    const result = await tools[0].handler({ baselinePath });
    const data = JSON.parse(result.content[0].text);
    expect(data.pass).toBe(true);
    expect(data.mismatchPercentage).toBe(0);
  });

  it('fails different images', async () => {
    const baselinePath = join(tmpDir, 'baseline.png');

    const mockClient = {
      send: (method: string) => {
        if (method === 'Page.captureScreenshot') {
          const differentPng = new PNG({ width: 2, height: 2 });
          differentPng.data[0] = 0; differentPng.data[1] = 0; differentPng.data[2] = 0; differentPng.data[3] = 255;
          differentPng.data[4] = 0; differentPng.data[5] = 0; differentPng.data[6] = 0; differentPng.data[7] = 255;
          differentPng.data[8] = 0; differentPng.data[9] = 0; differentPng.data[10] = 0; differentPng.data[11] = 255;
          differentPng.data[12] = 0; differentPng.data[13] = 0; differentPng.data[14] = 0; differentPng.data[15] = 255;
          return Promise.resolve({ data: PNG.sync.write(differentPng).toString('base64') });
        }
        return Promise.resolve({});
      },
    } as unknown as CdpClient;

    const tools = createVisualTools(mockClient);
    const result = await tools[0].handler({ baselinePath });
    const data = JSON.parse(result.content[0].text);
    expect(data.pass).toBe(false);
    expect(data.mismatchPercentage).toBeGreaterThan(0);
  });
});
