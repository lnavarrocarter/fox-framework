/**
 * @fileoverview Metrics middleware — tracks event latency and throughput in real time
 * @module tsfox/core/features/events/middleware
 */

import { EventInterface } from '../interfaces/event.interface';
import { EventContext, EventMiddlewareInterface } from '../interfaces/middleware.interface';

export interface EventMetricsSnapshot {
  totalEmitted: number;
  totalHandled: number;
  totalErrors: number;
  averageEmitLatencyMs: number;
  averageHandleLatencyMs: number;
  eventsPerSecond: number;
  byType: Record<string, { emitted: number; handled: number; errors: number; avgLatencyMs: number }>;
}

export interface MetricsMiddlewareOptions {
  /** Middleware priority (default: 10 — runs before logging) */
  priority?: number;
  /** Rolling window for eventsPerSecond calculation in ms (default: 10_000) */
  windowMs?: number;
}

/**
 * Collects real latency and throughput metrics for every event.
 * Call `getSnapshot()` to read current stats.
 *
 * ```ts
 * const metrics = new EventMetricsMiddleware();
 * middlewareChain.add(metrics);
 *
 * // Later:
 * console.log(metrics.getSnapshot());
 * ```
 */
export class EventMetricsMiddleware implements EventMiddlewareInterface {
  readonly name = 'metrics';
  readonly priority: number;

  private emitStarts = new Map<string, number>();   // eventId → hrtime ms
  private handleStarts = new Map<string, number>();

  private totalEmitted = 0;
  private totalHandled = 0;
  private totalErrors = 0;
  private totalEmitLatency = 0;
  private totalHandleLatency = 0;

  // Per-type counters
  private byType = new Map<string, { emitted: number; handled: number; errors: number; latencySum: number }>();

  // Rolling window for RPS
  private windowMs: number;
  private windowTimestamps: number[] = [];

  constructor(options: MetricsMiddlewareOptions = {}) {
    this.priority = options.priority ?? 10;
    this.windowMs = options.windowMs ?? 10_000;
  }

  async beforeEmit(event: EventInterface, _ctx: EventContext): Promise<EventInterface> {
    this.emitStarts.set(event.id, Date.now());
    return event;
  }

  async afterEmit(event: EventInterface, _ctx: EventContext): Promise<void> {
    const start = this.emitStarts.get(event.id);
    const latency = start !== undefined ? Date.now() - start : 0;
    this.emitStarts.delete(event.id);

    this.totalEmitted++;
    this.totalEmitLatency += latency;

    const t = this._typeEntry(event.type);
    t.emitted++;
    t.latencySum += latency;

    // Rolling window
    const now = Date.now();
    this.windowTimestamps.push(now);
    this._pruneWindow(now);
  }

  async onError(_err: Error, event: EventInterface, _ctx: EventContext): Promise<void> {
    this.totalErrors++;
    this._typeEntry(event.type).errors++;
    this.emitStarts.delete(event.id);
  }

  async beforeHandle(event: EventInterface, _ctx: EventContext): Promise<EventInterface> {
    this.handleStarts.set(event.id, Date.now());
    return event;
  }

  async afterHandle(event: EventInterface, _ctx: EventContext): Promise<void> {
    const start = this.handleStarts.get(event.id);
    const latency = start !== undefined ? Date.now() - start : 0;
    this.handleStarts.delete(event.id);

    this.totalHandled++;
    this.totalHandleLatency += latency;
    this._typeEntry(event.type).handled++;
  }

  async onHandleError(_err: Error, event: EventInterface, _ctx: EventContext): Promise<void> {
    this.totalErrors++;
    this._typeEntry(event.type).errors++;
    this.handleStarts.delete(event.id);
  }

  getSnapshot(): EventMetricsSnapshot {
    const now = Date.now();
    this._pruneWindow(now);

    const byType: EventMetricsSnapshot['byType'] = {};
    for (const [type, t] of this.byType) {
      byType[type] = {
        emitted: t.emitted,
        handled: t.handled,
        errors: t.errors,
        avgLatencyMs: t.emitted > 0 ? t.latencySum / t.emitted : 0
      };
    }

    return {
      totalEmitted: this.totalEmitted,
      totalHandled: this.totalHandled,
      totalErrors: this.totalErrors,
      averageEmitLatencyMs: this.totalEmitted > 0 ? this.totalEmitLatency / this.totalEmitted : 0,
      averageHandleLatencyMs: this.totalHandled > 0 ? this.totalHandleLatency / this.totalHandled : 0,
      eventsPerSecond: this.windowTimestamps.length / (this.windowMs / 1_000),
      byType
    };
  }

  reset(): void {
    this.emitStarts.clear();
    this.handleStarts.clear();
    this.totalEmitted = 0;
    this.totalHandled = 0;
    this.totalErrors = 0;
    this.totalEmitLatency = 0;
    this.totalHandleLatency = 0;
    this.byType.clear();
    this.windowTimestamps = [];
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private _typeEntry(type: string) {
    if (!this.byType.has(type)) {
      this.byType.set(type, { emitted: 0, handled: 0, errors: 0, latencySum: 0 });
    }
    return this.byType.get(type)!;
  }

  private _pruneWindow(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.windowTimestamps.length > 0 && this.windowTimestamps[0] < cutoff) {
      this.windowTimestamps.shift();
    }
  }
}
