export interface CdpTarget {
  id: string;
  title: string;
  url: string;
  type: string;
  webSocketDebuggerUrl: string;
}

export interface CdpResponse {
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

export interface DomNode {
  nodeId: number;
  nodeType: number;
  nodeName: string;
  nodeValue?: string;
  attributes?: Record<string, string>;
  children?: DomNode[];
  childNodeCount?: number;
}
