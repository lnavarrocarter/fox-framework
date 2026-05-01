/**
 * @fileoverview Logging middleware for the event pipeline
 * @module tsfox/core/features/events/middleware
 */

import { EventInterface } from '../interfaces/event.interface';
import { EventContext, EventMiddlewareInterface } from '../interfaces/middleware.interface';

export interface LoggingMiddlewareOptions {
  /** Log level: 'debug' | 'info' | 'warn' (default: 'info') */
  level?: 'debug' | 'info' | 'warn';
  /** Include event payload in logs (default: false — avoids leaking PII) */
  includeData?: boolean;
  /** Custom logger. Defaults to console. */
  logger?: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
  /** Middleware priority (default: 100) */
  priority?: number;
}

/**
 * Logs every event at emit and handle boundaries.
 *
 * ```ts
 * middlewareChain.add(new EventLoggingMiddleware({ level: 'debug', includeData: true }));
 * ```
 */
export class EventLoggingMiddleware implements EventMiddlewareInterface {
  readonly name = 'logging';
  readonly priority: number;

  private level: 'debug' | 'info' | 'warn';
  private includeData: boolean;
  private log: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;

  constructor(options: LoggingMiddlewareOptions = {}) {
    this.priority = options.priority ?? 100;
    this.level = options.level ?? 'info';
    this.includeData = options.includeData ?? false;
    this.log = options.logger ?? console;
  }

  async beforeEmit(event: EventInterface, context: EventContext): Promise<EventInterface> {
    this._log(`[EventSystem] emit  → ${event.type} | id=${event.id} | agg=${event.aggregateId ?? '-'} | corr=${context.correlationId ?? '-'}`, event);
    return event;
  }

  async afterEmit(event: EventInterface, context: EventContext): Promise<void> {
    this._log(`[EventSystem] emit  ✓ ${event.type} | id=${event.id}`, event);
  }

  async onError(error: Error, event: EventInterface, _context: EventContext): Promise<void> {
    this.log.error(`[EventSystem] emit  ✗ ${event.type} | id=${event.id} | error=${error.message}`);
  }

  async beforeHandle(event: EventInterface, context: EventContext): Promise<EventInterface> {
    this._log(`[EventSystem] handle→ ${event.type} | id=${event.id} | corr=${context.correlationId ?? '-'}`, event);
    return event;
  }

  async afterHandle(event: EventInterface, _context: EventContext): Promise<void> {
    this._log(`[EventSystem] handle✓ ${event.type} | id=${event.id}`, event);
  }

  async onHandleError(error: Error, event: EventInterface, _context: EventContext): Promise<void> {
    this.log.error(`[EventSystem] handle✗ ${event.type} | id=${event.id} | error=${error.message}`);
  }

  private _log(msg: string, event: EventInterface): void {
    const extra = this.includeData ? ` | data=${JSON.stringify(event.data)}` : '';
    this.log[this.level](msg + extra);
  }
}
