/**
 * @fileoverview Minimal tracing interfaces for Fox Agent telemetry.
 *
 * Intentionally vendor-neutral — no @opentelemetry/* imports.
 * Implement ITracer with any backend (OTel, Datadog, console, no-op, …).
 */

export type SpanStatus = 'unset' | 'ok' | 'error';

export interface ISpan {
  /** Add a string/number/boolean attribute to the span */
  setAttribute(key: string, value: string | number | boolean): this;
  /** Record an exception / error on the span */
  recordException(err: unknown): this;
  /** Set the span status */
  setStatus(status: SpanStatus, message?: string): this;
  /** End the span (required to flush it) */
  end(): void;
}

export interface SpanOptions {
  /** Key/value attributes to set on span creation */
  attributes?: Record<string, string | number | boolean>;
}

export interface ITracer {
  /**
   * Start a new span. Caller is responsible for calling `span.end()`.
   * Pass a `SpanOptions.attributes` map to set initial attributes.
   */
  startSpan(name: string, options?: SpanOptions): ISpan;
}

/** No-op implementations — useful for testing or when tracing is disabled */

export class NoOpSpan implements ISpan {
  setAttribute(_key: string, _value: string | number | boolean): this { return this; }
  recordException(_err: unknown): this { return this; }
  setStatus(_status: SpanStatus, _message?: string): this { return this; }
  end(): void {}
}

export class NoOpTracer implements ITracer {
  startSpan(_name: string, _options?: SpanOptions): ISpan { return new NoOpSpan(); }
}
