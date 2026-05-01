/**
 * OtelAgentTracer — implements ITracer using @opentelemetry/api.
 *
 * Each `startSpan` call creates an OTel span that stays active until `.end()` is called.
 * Attributes, exceptions and status are forwarded to the underlying OTel span.
 *
 * @example
 * ```ts
 * import { trace } from '@opentelemetry/api';
 * import { OtelAgentTracer } from '@foxframework/otel-agents';
 * import { AgentTracer } from '@foxframework/core/agents';
 *
 * const tracer = new OtelAgentTracer(trace.getTracer('fox-agents', '1.0.0'));
 * const tracedAgent = new AgentTracer(myAgent, { tracer });
 * ```
 */

import type { Tracer, Span, SpanStatusCode } from '@opentelemetry/api';
import type { ITracer, ISpan, SpanOptions, SpanStatus } from './types';

const STATUS_MAP: Record<SpanStatus, SpanStatusCode> = {
  unset: 0,  // SpanStatusCode.UNSET
  ok: 1,     // SpanStatusCode.OK
  error: 2,  // SpanStatusCode.ERROR
};

class OtelSpanAdapter implements ISpan {
  constructor(private readonly span: Span) {}

  setAttribute(key: string, value: string | number | boolean): this {
    this.span.setAttribute(key, value);
    return this;
  }

  recordException(err: unknown): this {
    this.span.recordException(err instanceof Error ? err : new Error(String(err)));
    return this;
  }

  setStatus(status: SpanStatus, message?: string): this {
    this.span.setStatus({ code: STATUS_MAP[status], message });
    return this;
  }

  end(): void {
    this.span.end();
  }
}

export class OtelAgentTracer implements ITracer {
  constructor(private readonly otelTracer: Tracer) {}

  startSpan(name: string, options: SpanOptions = {}): ISpan {
    const span = this.otelTracer.startSpan(name, {
      attributes: options.attributes,
    });
    return new OtelSpanAdapter(span);
  }
}
