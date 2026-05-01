/**
 * Shared tracer interfaces — mirrored from tsfox/core/agents/telemetry/tracer.interface.ts
 * Kept here so the package has zero runtime dep on @foxframework/core.
 */

export type SpanStatus = 'unset' | 'ok' | 'error';

export interface ISpan {
  setAttribute(key: string, value: string | number | boolean): this;
  recordException(err: unknown): this;
  setStatus(status: SpanStatus, message?: string): this;
  end(): void;
}

export interface SpanOptions {
  attributes?: Record<string, string | number | boolean>;
}

export interface ITracer {
  startSpan(name: string, options?: SpanOptions): ISpan;
}
