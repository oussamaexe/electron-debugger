export interface DebugConfig {
  port: number;
  host: string;
  reconnect: boolean;
  reconnectDelay: number;
  maxRetries: number;
}

export type ConfigOverrides = Partial<DebugConfig>;

const defaults: DebugConfig = {
  port: 9222,
  host: '127.0.0.1',
  reconnect: true,
  reconnectDelay: 1000,
  maxRetries: 10,
};

export function getConfig(overrides: ConfigOverrides): DebugConfig {
  return { ...defaults, ...overrides };
}
