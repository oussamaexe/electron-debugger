import type { CdpClient } from '../cdp-client.js';
import { createDomTools } from './dom.js';
import { createStylesTools } from './styles.js';
import { createScreenshotTools } from './screenshot.js';
import { createConsoleTools } from './console.js';
import { createMetricsTools } from './metrics.js';
import { createInteractTools } from './interact.js';
import { createWindowsTools } from './windows.js';
import { createExecutionTools } from './execution.js';
import { createReactTools } from './react.js';
import { createElectronTools } from './electron.js';
import { createVisualTools } from './visual.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

export function registerAllTools(client: CdpClient): ToolDefinition[] {
  return [
    ...createDomTools(client),
    ...createStylesTools(client),
    ...createScreenshotTools(client),
    ...createConsoleTools(client),
    ...createMetricsTools(client),
    ...createInteractTools(client),
    ...createWindowsTools(client),
    ...createExecutionTools(client),
    ...createReactTools(client),
    ...createElectronTools(client),
    ...createVisualTools(client),
  ];
}
