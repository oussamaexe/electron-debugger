import WebSocket from 'ws';
import { getConfig, type DebugConfig, type ConfigOverrides } from './config.js';
import type { CdpTarget, CdpResponse } from './types.js';

const DEFAULT_REQUEST_TIMEOUT = 15000;

export class CdpClient {
  private ws: WebSocket | null = null;
  private messageId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private timeouts = new Map<number, ReturnType<typeof setTimeout>>();
  private config: DebugConfig;
  private target: CdpTarget | null = null;
  private resolveDisconnect: (() => void) | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Map<string, Set<(params: Record<string, unknown>) => void>>();

  on(method: string, callback: (params: Record<string, unknown>) => void): void {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method)!.add(callback);
  }

  off(method: string, callback: (params: Record<string, unknown>) => void): void {
    this.listeners.get(method)?.delete(callback);
  }

  constructor(overrides?: ConfigOverrides) {
    this.config = getConfig(overrides ?? {});
  }

  nextId(): number {
    return this.messageId++;
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

  async send<T = unknown>(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<T> {
    if (!this.isConnected()) {
      await this.connect();
    }
    if (!this.ws) throw new Error('Not connected');
    const timeout = timeoutMs ?? DEFAULT_REQUEST_TIMEOUT;
    return new Promise((resolve, reject) => {
      const id = this.nextId();
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.timeouts.set(id, setTimeout(() => {
        this.pending.delete(id);
        this.timeouts.delete(id);
        reject(new Error(`CDP request timed out after ${timeout}ms: ${method}`));
      }, timeout));
      this.ws!.send(JSON.stringify({ id, method, params: params ?? {} }));
    }) as Promise<T>;
  }

  async discoverTargets(): Promise<CdpTarget[]> {
    try {
      const response = await fetch(this.discoveryUrl());
      return response.json() as Promise<CdpTarget[]>;
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
      const message = JSON.parse(data.toString()) as CdpResponse;
      if (message.id && this.pending.has(message.id)) {
        const pendingEntry = this.pending.get(message.id)!;
        this.pending.delete(message.id);
        const timeout = this.timeouts.get(message.id);
        if (timeout) { clearTimeout(timeout); this.timeouts.delete(message.id); }
        if (message.error) pendingEntry.reject(new Error(message.error.message));
        else pendingEntry.resolve(message.result);
      } else if (message.method && this.listeners.has(message.method)) {
        const callbacks = this.listeners.get(message.method)!;
        for (const cb of callbacks) {
          cb(message.params ?? {});
        }
      }
    } catch {
      // Malformed CDP message — ignore
    }
  }

  private rejectAllPending(err: Error): void {
    for (const [, pendingEntry] of this.pending) {
      pendingEntry.reject(err);
    }
    this.pending.clear();
    for (const [, timeout] of this.timeouts) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
  }
}
