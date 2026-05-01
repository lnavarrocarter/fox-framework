/**
 * @fileoverview SSE (Server-Sent Events) adapter — no external dependencies
 * @module tsfox/core/features/events/adapters
 *
 * Allows pushing domain events to browser clients over a persistent HTTP connection.
 *
 * ```ts
 * // Express route
 * app.get('/events', (req, res) => {
 *   sseAdapter.addClient(req, res);
 * });
 *
 * // Wire into EventBus
 * eventBus.addAdapter(sseAdapter);
 * await eventBus.connect();
 * ```
 */

import type { Request, Response } from 'express';
import { EventInterface } from '../interfaces/event.interface';

export interface SseAdapterOptions {
  /** Heartbeat interval in ms (default: 30_000) */
  heartbeatInterval?: number;
  /** Filter: only forward events whose type matches this list. Defaults to all. */
  allowedTypes?: string[];
  /** Max clients (default: 1000) */
  maxClients?: number;
}

interface SseClient {
  id: string;
  res: Response;
  connectedAt: Date;
  eventsSent: number;
  allowedTypes?: string[];
}

/**
 * Lightweight SSE adapter. Use it standalone or attach it to an EventBus.
 */
export class SseAdapter {
  readonly name = 'sse';

  private clients = new Map<string, SseClient>();
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private options: Required<SseAdapterOptions>;
  private _connected = false;
  private _clientCounter = 0;

  constructor(options: SseAdapterOptions = {}) {
    this.options = {
      heartbeatInterval: options.heartbeatInterval ?? 30_000,
      allowedTypes: options.allowedTypes ?? [],
      maxClients: options.maxClients ?? 1_000
    };
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  connect(): void {
    if (this._connected) return;
    this._connected = true;
    this.heartbeatTimer = setInterval(() => this._sendHeartbeat(), this.options.heartbeatInterval);
  }

  disconnect(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    for (const client of this.clients.values()) {
      try { client.res.end(); } catch (_) { /* ignore */ }
    }
    this.clients.clear();
    this._connected = false;
  }

  get isConnected(): boolean {
    return this._connected;
  }

  // ─── Client management ───────────────────────────────────────────────────

  /**
   * Register an Express req/res pair as an SSE client.
   * Returns the assigned client ID.
   */
  addClient(req: Request, res: Response, allowedTypes?: string[]): string {
    if (this.clients.size >= this.options.maxClients) {
      res.status(503).end('Too many SSE clients');
      return '';
    }

    const id = `sse_${++this._clientCounter}_${Date.now()}`;

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no' // nginx passthrough
    });
    res.flushHeaders?.();

    const client: SseClient = {
      id,
      res,
      connectedAt: new Date(),
      eventsSent: 0,
      allowedTypes: allowedTypes ?? this.options.allowedTypes
    };
    this.clients.set(id, client);

    // Send welcome event
    this._write(client, 'connected', { clientId: id, timestamp: new Date().toISOString() });

    // Clean up on disconnect
    req.on('close', () => this.removeClient(id));
    req.on('error', () => this.removeClient(id));

    return id;
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try { client.res.end(); } catch (_) { /* ignore */ }
      this.clients.delete(clientId);
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }

  // ─── Publishing ──────────────────────────────────────────────────────────

  /**
   * Publish a domain event to all connected SSE clients.
   */
  async publish(event: EventInterface): Promise<void> {
    if (!this._connected) return;

    const dead: string[] = [];

    for (const client of this.clients.values()) {
      if (client.allowedTypes && client.allowedTypes.length > 0) {
        if (!client.allowedTypes.includes(event.type) && !client.allowedTypes.includes('*')) {
          continue;
        }
      }

      const sent = this._write(client, event.type, {
        id: event.id,
        type: event.type,
        aggregateId: event.aggregateId,
        data: event.data,
        timestamp: event.timestamp
      });

      if (!sent) dead.push(client.id);
      else client.eventsSent++;
    }

    for (const id of dead) this.removeClient(id);
  }

  getStats() {
    return {
      connected: this._connected,
      clientCount: this.clients.size,
      clients: Array.from(this.clients.values()).map(c => ({
        id: c.id,
        connectedAt: c.connectedAt,
        eventsSent: c.eventsSent
      }))
    };
  }

  // ─── private ─────────────────────────────────────────────────────────────

  private _write(client: SseClient, eventType: string, data: unknown): boolean {
    try {
      const payload = JSON.stringify(data);
      client.res.write(`event: ${eventType}\ndata: ${payload}\n\n`);
      return true;
    } catch {
      return false;
    }
  }

  private _sendHeartbeat(): void {
    const dead: string[] = [];
    for (const client of this.clients.values()) {
      try {
        client.res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
      } catch {
        dead.push(client.id);
      }
    }
    for (const id of dead) this.removeClient(id);
  }
}
