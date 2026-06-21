import { describe, it, expect } from 'vitest';

describe('CLI entry', () => {
  it('exports main function', async () => {
    const mod = await import('../src/index.js');
    expect(typeof mod.main).toBe('function');
  });
});

describe('parseExecArgs', () => {
  it('parses numbers', async () => {
    const { parseExecArgs } = await import('../src/index.js');
    expect(parseExecArgs(['maxDepth=5'])).toEqual({ maxDepth: 5 });
  });

  it('parses negative numbers', async () => {
    const { parseExecArgs } = await import('../src/index.js');
    expect(parseExecArgs(['offset=-1'])).toEqual({ offset: -1 });
  });

  it('parses booleans', async () => {
    const { parseExecArgs } = await import('../src/index.js');
    expect(parseExecArgs(['clearFirst=true', 'flag=false'])).toEqual({ clearFirst: true, flag: false });
  });

  it('keeps strings as strings', async () => {
    const { parseExecArgs } = await import('../src/index.js');
    expect(parseExecArgs(['selector=body'])).toEqual({ selector: 'body' });
  });

  it('handles empty input', async () => {
    const { parseExecArgs } = await import('../src/index.js');
    expect(parseExecArgs([])).toEqual({});
  });
});
