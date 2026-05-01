/**
 * @fileoverview Redis adapter stub — typed integration point for redis peer dep
 * @module tsfox/core/features/events/adapters
 *
 * Install the peer dependency to enable:
 *   npm install ioredis
 *
 * Then create and connect the adapter:
 * ```ts
 * import { RedisEventAdapter } from '@foxframework/core';
 *
 * const adapter = new RedisEventAdapter({
 *   host: 'localhost',
 *   port: 6379,
 *   channels: ['domain-events']
 * });
 * await adapter.connect();
 * eventBus.addAdapter(adapter);
 * ```
 */

import { EventInterface } from '../interfaces/event.interface';
import { EventHandler, SubscriptionOptions, Subscription } from '../interfaces/event.interface';

export interface RedisAdapterConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  /** Redis channels to subscribe to (default: ['fox:events']) */
  channels?: string[];
  /** Channel to publish events to (default: 'fox:events') */
  publishChannel?: string;
  /** Key prefix for Redis keys (default: 'fox:') */
  keyPrefix?: string;
  /** Connection timeout in ms (default: 5000) */
  connectTimeout?: number;
}

/**
 * Redis pub/sub adapter for the Fox event bus.
 * Requires `ioredis` as a peer dependency.
 */
export class RedisEventAdapter {
  readonly name = 'redis';

  private _connected = false;
  private _publisher: any = null;
  private _subscriber: any = null;
  private _subscriptions = new Map<string, EventHandler[]>();
  private config: Required<RedisAdapterConfig>;

  constructor(config: RedisAdapterConfig = {}) {
    this.config = {
      host: config.host ?? 'localhost',
      port: config.port ?? 6379,
      password: config.password ?? '',
      db: config.db ?? 0,
      channels: config.channels ?? ['fox:events'],
      publishChannel: config.publishChannel ?? 'fox:events',
      keyPrefix: config.keyPrefix ?? 'fox:',
      connectTimeout: config.connectTimeout ?? 5_000
    };
  }

  async connect(): Promise<void> {
    let Redis: any;
    try {
      Redis = (await import('ioredis' as any)).default ?? (await import('ioredis' as any));
    } catch {
      throw new Error(
        '[RedisEventAdapter] ioredis is not installed. Run: npm install ioredis'
      );
    }

    const opts = {
      host: this.config.host,
      port: this.config.port,
      password: this.config.password || undefined,
      db: this.config.db,
      connectTimeout: this.config.connectTimeout,
      lazyConnect: true
    };

    this._publisher = new Redis(opts);
    this._subscriber = new Redis(opts);

    await Promise.all([this._publisher.connect(), this._subscriber.connect()]);

    // Subscribe to channels
    await this._subscriber.subscribe(...this.config.channels);

    this._subscriber.on('message', (_channel: string, message: string) => {
      try {
        const raw: any = JSON.parse(message);
        const event: EventInterface = {
          ...raw,
          timestamp: new Date(raw.timestamp) // restore Date without mutating readonly prop
        };
        const handlers = this._subscriptions.get(event.type) ?? [];
        const wildcardHandlers = this._subscriptions.get('*') ?? [];
        [...handlers, ...wildcardHandlers].forEach(h => {
          try { h(event); } catch (e) { console.error('[RedisEventAdapter] handler error', e); }
        });
      } catch (parseError) {
        console.error('[RedisEventAdapter] parse error', parseError);
      }
    });

    this._connected = true;
  }

  async disconnect(): Promise<void> {
    if (this._publisher) await this._publisher.quit();
    if (this._subscriber) await this._subscriber.quit();
    this._connected = false;
  }

  async publish(event: EventInterface): Promise<void> {
    if (!this._connected) throw new Error('[RedisEventAdapter] not connected');
    await this._publisher.publish(this.config.publishChannel, JSON.stringify(event));
  }

  subscribe(eventType: string, handler: EventHandler, _options?: SubscriptionOptions): Subscription {
    const handlers = this._subscriptions.get(eventType) ?? [];
    handlers.push(handler);
    this._subscriptions.set(eventType, handlers);

    const id = `redis_sub_${eventType}_${Date.now()}`;
    return {
      id,
      eventType,
      handler,
      options: _options ?? {},
      unsubscribe: async () => {
        const hs = this._subscriptions.get(eventType) ?? [];
        this._subscriptions.set(eventType, hs.filter(h => h !== handler));
      }
    };
  }

  get isConnected(): boolean {
    return this._connected;
  }

  getStats() {
    return {
      connected: this._connected,
      host: this.config.host,
      port: this.config.port,
      subscriptions: this._subscriptions.size
    };
  }
}
