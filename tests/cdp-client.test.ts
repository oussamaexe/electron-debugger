import { describe, it, expect, beforeEach } from 'vitest';
import { CdpClient } from '../src/cdp-client.js';

describe('CdpClient', () => {
  let client: CdpClient;

  beforeEach(() => {
    client = new CdpClient({ port: 9222, host: '127.0.0.1' });
  });

  it('should be disconnected initially', () => {
    expect(client.isConnected()).toBe(false);
  });

  it('should generate increasing message IDs', () => {
    const id1 = client.nextId();
    const id2 = client.nextId();
    expect(id2).toBe(id1 + 1);
  });

  it('should build discovery URL', () => {
    expect(client.discoveryUrl()).toBe('http://127.0.0.1:9222/json');
  });
});
