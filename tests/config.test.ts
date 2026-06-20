import { describe, it, expect } from 'vitest';
import { getConfig } from '../src/config.js';

describe('config', () => {
  it('returns default values when no overrides', () => {
    const config = getConfig({});
    expect(config.port).toBe(9222);
    expect(config.host).toBe('127.0.0.1');
    expect(config.reconnect).toBe(true);
    expect(config.reconnectDelay).toBe(1000);
    expect(config.maxRetries).toBe(10);
  });

  it('merges provided overrides with defaults', () => {
    const config = getConfig({ port: 9333, reconnect: false });
    expect(config.port).toBe(9333);
    expect(config.host).toBe('127.0.0.1');
    expect(config.reconnect).toBe(false);
  });
});
