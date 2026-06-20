import { describe, it, expect } from 'vitest';

describe('CLI entry', () => {
  it('exports main function', async () => {
    const mod = await import('../src/index.js');
    expect(typeof mod.main).toBe('function');
  });
});
