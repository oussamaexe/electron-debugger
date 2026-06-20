import WebSocket from 'ws';
import { getConfig, type DebugConfig, type ConfigOverrides } from './config.js';
import type { CdpTarget, CdpResponse } from './types.js';

export class CdpClient {
  private ws: WebSocket | null = null;
  private msgId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private config: DebugConfig;
  private target: CdpTarget | null = null;
  private resolveDisconnect: (() => void) | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(overrides?: ConfigOverrides) {
    this.config = getConfig(overrides ?? {});
  }

  nextId(): number {
    return this.msgId++;
  }

  discoveryUrl(): string {
    return `http://${this.config.host}:${this.config.port}/json`;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    await this.disconnect();
    const targets = await this.discoverTargets();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No page target found in Electron app');
    this.target = page;
    await this.connectToTarget(page.webSocketDebuggerUrl);
  }

  async disconnect(): Promise<void> {
    if (!this.ws) return;
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    return new Promise<void>((resolve) => {
      this.resolveDisconnect = resolve;
      this.ws?.close();
    });
  }

  async send<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    if (!this.ws) throw new Error('Not connected');
    return new Promise((resolve, reject) => {
      const id = this.nextId();
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.ws!.send(JSON.stringify({ id, method, params: params ?? {} }));
    }) as Promise<T>;
  }

  async discoverTargets(): Promise<CdpTarget[]> {
    try {
      const resp = await fetch(this.discoveryUrl());
      return resp.json() as Promise<CdpTarget[]>;
    } catch (err) {
      throw new Error(
        `Failed to connect to Electron debugger at ${this.discoveryUrl()}. ` +
        `Is your app running with --remote-debugging-port=${this.config.port}? ` +
        `Error: ${(err as Error).message}`,
      );
    }
  }

  private async connectToTarget(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let resolved = false;

      this.connectionTimeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.ws?.close();
          this.ws = null;
          reject(new Error(`WebSocket connection timed out connecting to ${wsUrl}`));
        }
      }, 5000);

      this.ws = new WebSocket(wsUrl);
      this.ws.on('open', () => {
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        if (!resolved) {
          resolved = true;
          resolve();
        }
      });
      this.ws.on('message', (data: Buffer) => this.handleMessage(data));
      this.ws.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });
      this.ws.on('close', () => {
        this.ws = null;
        this.target = null;
        this.rejectAllPending(new Error('WebSocket disconnected'));
        if (this.resolveDisconnect) {
          this.resolveDisconnect();
          this.resolveDisconnect = null;
        }
      });
    });
  }

  private handleMessage(data: Buffer): void {
    try {
      const msg = JSON.parse(data.toString()) as CdpResponse;
      if (msg.id && this.pending.has(msg.id)) {
        const cb = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) cb.reject(new Error(msg.error.message));
        else cb.resolve(msg.result);
      }
    } catch {
      // Malformed CDP message — ignore
    }
  }

  private rejectAllPending(err: Error): void {
    for (const [, cb] of this.pending) {
      cb.reject(err);
    }
    this.pending.clear();
  }
}
