/**
 * Epic D4 — OpenTelemetry
 * Tests for: ITracer/ISpan interfaces, NoOpTracer, AgentTracer
 */

import { NoOpSpan, NoOpTracer, AgentTracer } from '../telemetry';
import type { ITracer, ISpan, SpanOptions } from '../telemetry';
import type {
  IAgent,
  AgentContext,
  AgentRunResult,
  AgentStatus,
} from '../interfaces/agent.interface';

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface SpanCall {
  name: string;
  attributes: Record<string, string | number | boolean>;
  ended: boolean;
  status?: { code: string; message?: string };
  exception?: unknown;
}

/** Mock tracer that records all span interactions */
class MockTracer implements ITracer {
  spans: SpanCall[] = [];

  startSpan(name: string, options: SpanOptions = {}): ISpan {
    const call: SpanCall = {
      name,
      attributes: { ...(options.attributes ?? {}) },
      ended: false,
    };
    this.spans.push(call);

    const span: ISpan = {
      setAttribute(k, v) { call.attributes[k] = v; return this; },
      recordException(err) { call.exception = err; return this; },
      setStatus(code, msg) { call.status = { code, message: msg }; return this; },
      end() { call.ended = true; },
    };
    return span;
  }
}

function makeAgent(overrides: Partial<AgentRunResult> = {}): IAgent {
  const result: AgentRunResult = {
    runId: 'run-42',
    answer: 'The answer is 42.',
    steps: [
      {
        stepNumber: 1,
        type: 'thought',
        content: 'Thinking...',
        timestamp: new Date(),
      },
      {
        stepNumber: 2,
        type: 'tool_call',
        content: 'Calling calculator',
        toolCall: {
          id: 'call-1',
          type: 'function',
          function: { name: 'calculator', arguments: '{"expression":"6*7"}' },
        },
        toolResult: { toolCallId: 'call-1', result: '42' },
        timestamp: new Date(),
      },
      {
        stepNumber: 3,
        type: 'final_answer',
        content: 'The answer is 42.',
        timestamp: new Date(),
      },
    ],
    status: 'completed',
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    ...overrides,
  };

  return {
    id: 'agent-1',
    name: 'TestAgent',
    get status(): AgentStatus { return 'idle'; },
    run: jest.fn().mockResolvedValue(result),
    abort: jest.fn(),
  };
}

// ─── NoOpTracer / NoOpSpan ────────────────────────────────────────────────────

describe('NoOpTracer / NoOpSpan', () => {
  it('NoOpTracer.startSpan returns a NoOpSpan', () => {
    const tracer = new NoOpTracer();
    const span = tracer.startSpan('test');
    expect(span).toBeInstanceOf(NoOpSpan);
  });

  it('NoOpSpan methods are chainable and do not throw', () => {
    const span = new NoOpSpan();
    expect(() => {
      span
        .setAttribute('key', 'value')
        .setAttribute('num', 42)
        .recordException(new Error('oops'))
        .setStatus('error', 'failed')
        .end();
    }).not.toThrow();
  });
});

// ─── AgentTracer ──────────────────────────────────────────────────────────────

describe('AgentTracer', () => {
  it('proxies id, name, status, and abort to inner agent', () => {
    const inner = makeAgent();
    const traced = new AgentTracer(inner);
    expect(traced.id).toBe('agent-1');
    expect(traced.name).toBe('TestAgent');
    expect(traced.status).toBe('idle');
    traced.abort();
    expect(inner.abort).toHaveBeenCalledTimes(1);
  });

  it('creates an agent.run span for each run', async () => {
    const tracer = new MockTracer();
    const traced = new AgentTracer(makeAgent(), { tracer });
    await traced.run('What is 6*7?');

    const runSpan = tracer.spans.find((s) => s.name === 'agent.run');
    expect(runSpan).toBeDefined();
    expect(runSpan!.ended).toBe(true);
  });

  it('sets agent.id and agent.name on run span', async () => {
    const tracer = new MockTracer();
    await new AgentTracer(makeAgent(), { tracer }).run('test');

    const runSpan = tracer.spans.find((s) => s.name === 'agent.run')!;
    expect(runSpan.attributes['agent.id']).toBe('agent-1');
    expect(runSpan.attributes['agent.name']).toBe('TestAgent');
  });

  it('sets run.id, run.status, stepCount, and answer on run span', async () => {
    const tracer = new MockTracer();
    await new AgentTracer(makeAgent(), { tracer }).run('test');

    const runSpan = tracer.spans.find((s) => s.name === 'agent.run')!;
    expect(runSpan.attributes['run.id']).toBe('run-42');
    expect(runSpan.attributes['run.status']).toBe('completed');
    expect(runSpan.attributes['run.stepCount']).toBe(3);
    expect(runSpan.attributes['run.answer']).toBe('The answer is 42.');
  });

  it('sets llm token usage attributes on run span', async () => {
    const tracer = new MockTracer();
    await new AgentTracer(makeAgent(), { tracer }).run('test');

    const runSpan = tracer.spans.find((s) => s.name === 'agent.run')!;
    expect(runSpan.attributes['llm.prompt_tokens']).toBe(100);
    expect(runSpan.attributes['llm.completion_tokens']).toBe(50);
    expect(runSpan.attributes['llm.total_tokens']).toBe(150);
  });

  it('creates an agent.tool_call span for each tool_call step', async () => {
    const tracer = new MockTracer();
    await new AgentTracer(makeAgent(), { tracer }).run('test');

    const toolSpans = tracer.spans.filter((s) => s.name === 'agent.tool_call');
    expect(toolSpans).toHaveLength(1);
    expect(toolSpans[0].attributes['tool.name']).toBe('calculator');
    expect(toolSpans[0].attributes['tool.call_id']).toBe('call-1');
    expect(toolSpans[0].ended).toBe(true);
  });

  it('sets run span status to ok on success', async () => {
    const tracer = new MockTracer();
    await new AgentTracer(makeAgent(), { tracer }).run('test');
    const runSpan = tracer.spans.find((s) => s.name === 'agent.run')!;
    expect(runSpan.status?.code).toBe('ok');
  });

  it('sets run span status to error when agent fails (status=failed)', async () => {
    const tracer = new MockTracer();
    const agent = makeAgent({ status: 'failed', error: 'max iterations' });
    await new AgentTracer(agent, { tracer }).run('test');
    const runSpan = tracer.spans.find((s) => s.name === 'agent.run')!;
    expect(runSpan.status?.code).toBe('error');
    expect(runSpan.status?.message).toBe('max iterations');
  });

  it('records exception and sets error status when agent throws', async () => {
    const tracer = new MockTracer();
    const agent = makeAgent();
    (agent.run as jest.Mock).mockRejectedValue(new Error('network error'));

    const traced = new AgentTracer(agent, { tracer });
    await expect(traced.run('test')).rejects.toThrow('network error');

    const runSpan = tracer.spans.find((s) => s.name === 'agent.run')!;
    expect(runSpan.exception).toBeInstanceOf(Error);
    expect(runSpan.status?.code).toBe('error');
    expect(runSpan.ended).toBe(true);
  });

  it('truncates long input strings to maxAttrLength', async () => {
    const tracer = new MockTracer();
    const longInput = 'a'.repeat(500);
    await new AgentTracer(makeAgent(), { tracer, maxAttrLength: 64 }).run(longInput);
    const runSpan = tracer.spans.find((s) => s.name === 'agent.run')!;
    expect((runSpan.attributes['agent.input'] as string).length).toBeLessThanOrEqual(65); // 64 + ellipsis
  });

  it('does not create tool_call spans for non-tool steps', async () => {
    const tracer = new MockTracer();
    const agent = makeAgent();
    // Override to only return thought + final_answer steps
    (agent.run as jest.Mock).mockResolvedValue({
      runId: 'r', answer: 'ok', status: 'completed',
      steps: [
        { stepNumber: 1, type: 'thought', content: 'thinking', timestamp: new Date() },
        { stepNumber: 2, type: 'final_answer', content: 'done', timestamp: new Date() },
      ],
    } as AgentRunResult);

    await new AgentTracer(agent, { tracer }).run('test');
    const toolSpans = tracer.spans.filter((s) => s.name === 'agent.tool_call');
    expect(toolSpans).toHaveLength(0);
  });

  it('uses NoOpTracer by default (no throws, no spans recorded)', async () => {
    const traced = new AgentTracer(makeAgent());
    await expect(traced.run('silent run')).resolves.toBeDefined();
  });

  it('sets tool_call span status to error when tool result has error', async () => {
    const tracer = new MockTracer();
    const agent = makeAgent();
    (agent.run as jest.Mock).mockResolvedValue({
      runId: 'r', answer: 'n/a', status: 'completed',
      steps: [
        {
          stepNumber: 1, type: 'tool_call', content: 'call',
          toolCall: { id: 'c1', type: 'function', function: { name: 'calc', arguments: '{}' } },
          toolResult: { toolCallId: 'c1', result: null, error: 'divide by zero' },
          timestamp: new Date(),
        },
      ],
    } as AgentRunResult);

    await new AgentTracer(agent, { tracer }).run('test');
    const toolSpan = tracer.spans.find((s) => s.name === 'agent.tool_call')!;
    expect(toolSpan.status?.code).toBe('error');
    expect(toolSpan.status?.message).toBe('divide by zero');
  });
});
