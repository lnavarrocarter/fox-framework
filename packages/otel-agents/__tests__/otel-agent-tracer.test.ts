/**
 * @foxframework/otel-agents — unit tests
 * Mocks @opentelemetry/api to avoid needing a real OTel SDK.
 */

import { OtelAgentTracer } from '../src/otel-agent-tracer';
import type { Tracer, Span } from '@opentelemetry/api';

function makeOtelSpan(): jest.Mocked<Span> {
  return {
    setAttribute: jest.fn().mockReturnThis(),
    recordException: jest.fn().mockReturnThis(),
    setStatus: jest.fn().mockReturnThis(),
    end: jest.fn(),
    addEvent: jest.fn(),
    isRecording: jest.fn().mockReturnValue(true),
    updateName: jest.fn(),
    spanContext: jest.fn(),
  } as unknown as jest.Mocked<Span>;
}

function makeOtelTracer(span: Span): jest.Mocked<Tracer> {
  return {
    startSpan: jest.fn().mockReturnValue(span),
    startActiveSpan: jest.fn(),
  } as unknown as jest.Mocked<Tracer>;
}

describe('OtelAgentTracer', () => {
  it('calls otelTracer.startSpan with the span name', () => {
    const otelSpan = makeOtelSpan();
    const otelTracer = makeOtelTracer(otelSpan);
    const tracer = new OtelAgentTracer(otelTracer);

    tracer.startSpan('agent.run');
    expect(otelTracer.startSpan).toHaveBeenCalledWith('agent.run', expect.any(Object));
  });

  it('passes initial attributes to startSpan', () => {
    const otelSpan = makeOtelSpan();
    const otelTracer = makeOtelTracer(otelSpan);
    const tracer = new OtelAgentTracer(otelTracer);

    tracer.startSpan('agent.run', { attributes: { 'agent.id': 'a1', 'step.number': 1 } });
    const call = (otelTracer.startSpan as jest.Mock).mock.calls[0];
    expect(call[1].attributes['agent.id']).toBe('a1');
    expect(call[1].attributes['step.number']).toBe(1);
  });

  it('setAttribute delegates to underlying OTel span', () => {
    const otelSpan = makeOtelSpan();
    const tracer = new OtelAgentTracer(makeOtelTracer(otelSpan));
    const span = tracer.startSpan('test');

    span.setAttribute('key', 'value');
    expect(otelSpan.setAttribute).toHaveBeenCalledWith('key', 'value');
  });

  it('recordException wraps non-Error values in Error', () => {
    const otelSpan = makeOtelSpan();
    const tracer = new OtelAgentTracer(makeOtelTracer(otelSpan));
    const span = tracer.startSpan('test');

    span.recordException('something went wrong');
    const recorded = (otelSpan.recordException as jest.Mock).mock.calls[0][0];
    expect(recorded).toBeInstanceOf(Error);
    expect(recorded.message).toBe('something went wrong');
  });

  it('recordException passes Error directly', () => {
    const otelSpan = makeOtelSpan();
    const tracer = new OtelAgentTracer(makeOtelTracer(otelSpan));
    const span = tracer.startSpan('test');

    const err = new Error('real error');
    span.recordException(err);
    expect((otelSpan.recordException as jest.Mock).mock.calls[0][0]).toBe(err);
  });

  it('setStatus maps "ok" to SpanStatusCode 1', () => {
    const otelSpan = makeOtelSpan();
    const tracer = new OtelAgentTracer(makeOtelTracer(otelSpan));
    const span = tracer.startSpan('test');

    span.setStatus('ok');
    expect(otelSpan.setStatus).toHaveBeenCalledWith({ code: 1, message: undefined });
  });

  it('setStatus maps "error" to SpanStatusCode 2 with message', () => {
    const otelSpan = makeOtelSpan();
    const tracer = new OtelAgentTracer(makeOtelTracer(otelSpan));
    const span = tracer.startSpan('test');

    span.setStatus('error', 'agent failed');
    expect(otelSpan.setStatus).toHaveBeenCalledWith({ code: 2, message: 'agent failed' });
  });

  it('setStatus maps "unset" to SpanStatusCode 0', () => {
    const otelSpan = makeOtelSpan();
    const tracer = new OtelAgentTracer(makeOtelTracer(otelSpan));
    const span = tracer.startSpan('test');

    span.setStatus('unset');
    expect(otelSpan.setStatus).toHaveBeenCalledWith({ code: 0, message: undefined });
  });

  it('end() calls otelSpan.end()', () => {
    const otelSpan = makeOtelSpan();
    const tracer = new OtelAgentTracer(makeOtelTracer(otelSpan));
    const span = tracer.startSpan('test');

    span.end();
    expect(otelSpan.end).toHaveBeenCalled();
  });

  it('span methods are chainable', () => {
    const otelSpan = makeOtelSpan();
    const tracer = new OtelAgentTracer(makeOtelTracer(otelSpan));
    const span = tracer.startSpan('test');

    expect(() => {
      span.setAttribute('a', 1).recordException(new Error('x')).setStatus('error').end();
    }).not.toThrow();
  });
});
