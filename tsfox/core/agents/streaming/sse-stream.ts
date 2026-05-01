/**
 * @fileoverview Low-level SSE stream writer.
 * Works with any Node.js `ServerResponse`-compatible object.
 */

export interface SseEvent {
  /** SSE event type (maps to `event:` field) */
  event: string;
  /** Data payload — will be JSON-serialised */
  data: unknown;
  /** Optional SSE id */
  id?: string | number;
}

export interface ISseStream {
  send(event: SseEvent): void;
  close(): void;
  readonly closed: boolean;
}

/** Minimal interface for a Node.js / Express ServerResponse */
export interface ServerResponseLike {
  headersSent: boolean;
  writableEnded: boolean;
  writeHead?(statusCode: number, headers: Record<string, string>): void;
  setHeader(name: string, value: string): void;
  write(chunk: string): boolean;
  end(): void;
}

/**
 * SseStream — wraps a `ServerResponseLike` and provides a typed `send()` API.
 *
 * @example
 * ```ts
 * const sse = new SseStream(res);
 * sse.send({ event: 'step', data: { content: 'Thinking...' } });
 * sse.close();
 * ```
 */
export class SseStream implements ISseStream {
  private _closed = false;

  constructor(private readonly res: ServerResponseLike) {
    if (!res.headersSent) {
      if (res.writeHead) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
      } else {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
      }
    }
  }

  get closed(): boolean {
    return this._closed || this.res.writableEnded;
  }

  send(event: SseEvent): void {
    if (this.closed) return;

    let payload = '';
    if (event.id !== undefined) payload += `id: ${event.id}\n`;
    payload += `event: ${event.event}\n`;

    const json = JSON.stringify(event.data);
    // Multi-line data: each line must start with "data: "
    for (const line of json.split('\n')) {
      payload += `data: ${line}\n`;
    }
    payload += '\n';

    this.res.write(payload);
  }

  close(): void {
    if (this.closed) return;
    this._closed = true;
    this.res.end();
  }
}
