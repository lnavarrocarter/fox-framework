/**
 * Epic D3 — Streaming UI
 * Tests for: SseStream, AgentSseEmitter, createAgentSseHandler
 */

import { SseStream } from '../streaming/sse-stream';
import { AgentSseEmitter } from '../streaming/agent-sse-emitter';
import { createAgentSseHandler } from '../streaming/create-agent-sse-handler';
import type {
  IAgent,
  AgentRunResult,
  AgentStatus,
} from '../interfaces/agent.interface';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRes() {
  const chunks: string[] = [];
  return {
    headersSent: false,
    writableEnded: false,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) { this.headers[name] = value; },
    write(chunk: string) { chunks.push(chunk); return true; },
    end() { this.writableEnded = true; },
    get output() { return chunks.join(''); },
    get events(): Array<{ event: string; data: unknown; id?: string }> {
      return parseSSE(chunks.join(''));
    },
  };
}

function parseSSE(raw: string): Array<{ event: string; data: unknown; id?: string }> {
  const results: Array<{ event: string; data: unknown; id?: string }> = [];
  const blocks = raw.split('\n\n').filter(Boolean);
  for (const block of blocks) {
    const lines = block.split('\n');
    let event = '';
    let dataLines: string[] = [];
    let id: string | undefined;
    for (const line of lines) {
      if (line.startsWith('event: ')) event = line.slice(7);
      else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
      else if (line.startsWith('id: ')) id = line.slice(4);
    }
    if (event) {
      try {
        const parsed = JSON.parse(dataLines.join('\n'));
        results.push({ event, data: parsed, ...(id ? { id } : {}) });
      } catch {
        results.push({ event, data: dataLines.join('\n'), ...(id ? { id } : {}) });
      }
    }
  }
  return results;
}

function makeAgent(result: Partial<AgentRunResult> = {}): IAgent {
  const run: AgentRunResult = {
    runId: 'run-1',
    answer: 'The answer is 42.',
    steps: [
      {
        stepNumber: 1,
        type: 'thought',
        content: 'I need to think...',
        timestamp: new Date('2024-01-01T00:00:00Z'),
      },
      {
        stepNumber: 2,
        type: 'final_answer',
        content: 'The answer is 42.',
        timestamp: new Date('2024-01-01T00:00:01Z'),
      },
    ],
    status: 'completed',
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    ...result,
  };

  return {
    id: 'agent-1',
    name: 'TestAgent',
    get status(): AgentStatus { return 'idle'; },
    run: jest.fn().mockResolvedValue(run),
    abort: jest.fn(),
  };
}

// ─── SseStream ────────────────────────────────────────────────────────────────

describe('SseStream', () => {
  it('sets SSE headers on construction', () => {
    const res = makeRes();
    new SseStream(res);
    expect(res.headers['Content-Type']).toBe('text/event-stream');
    expect(res.headers['Cache-Control']).toBe('no-cache');
  });

  it('writes event and data lines', () => {
    const res = makeRes();
    const sse = new SseStream(res);
    sse.send({ event: 'step', data: { msg: 'hello' } });

    expect(res.output).toContain('event: step');
    expect(res.output).toContain('data: {"msg":"hello"}');
    expect(res.output).toContain('\n\n');
  });

  it('includes id when provided', () => {
    const res = makeRes();
    const sse = new SseStream(res);
    sse.send({ event: 'step', data: {}, id: 42 });
    expect(res.output).toContain('id: 42');
  });

  it('calls res.end() on close()', () => {
    const res = makeRes();
    const sse = new SseStream(res);
    sse.close();
    expect(res.writableEnded).toBe(true);
    expect(sse.closed).toBe(true);
  });

  it('silently ignores send() after close()', () => {
    const res = makeRes();
    const sse = new SseStream(res);
    sse.close();
    const before = res.output;
    sse.send({ event: 'late', data: {} });
    expect(res.output).toBe(before);
  });

  it('silently ignores double close()', () => {
    const res = makeRes();
    const sse = new SseStream(res);
    sse.close();
    expect(() => sse.close()).not.toThrow();
  });

  it('uses writeHead when available', () => {
    const res = makeRes() as ReturnType<typeof makeRes> & { writeHead?: jest.Mock };
    res.writeHead = jest.fn();
    new SseStream(res);
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'text/event-stream' }));
  });

  it('handles multi-line JSON (no control chars break SSE)', () => {
    const res = makeRes();
    const sse = new SseStream(res);
    sse.send({ event: 'data', data: { a: 1, b: 2 } });
    // Each line of the JSON must be prefixed with "data: "
    const lines = res.output.split('\n').filter((l) => l.includes('{') || l.includes('}'));
    for (const line of lines) {
      expect(line.startsWith('data: ')).toBe(true);
    }
  });
});

// ─── AgentSseEmitter ──────────────────────────────────────────────────────────

describe('AgentSseEmitter', () => {
  it('emits a step event for each agent step', async () => {
    const res = makeRes();
    const agent = makeAgent();
    const emitter = new AgentSseEmitter(agent, res, { heartbeatIntervalMs: 0 });
    await emitter.run('What is 6 * 7?');

    const stepEvents = res.events.filter((e) => e.event === 'step');
    expect(stepEvents).toHaveLength(2);
    expect((stepEvents[0].data as any).type).toBe('thought');
    expect((stepEvents[1].data as any).type).toBe('final_answer');
  });

  it('emits a done event with answer and usage', async () => {
    const res = makeRes();
    const emitter = new AgentSseEmitter(makeAgent(), res, { heartbeatIntervalMs: 0 });
    await emitter.run('test');

    const done = res.events.find((e) => e.event === 'done');
    expect(done).toBeDefined();
    expect((done!.data as any).answer).toBe('The answer is 42.');
    expect((done!.data as any).status).toBe('completed');
    expect((done!.data as any).usage.totalTokens).toBe(150);
  });

  it('closes the SSE stream after run', async () => {
    const res = makeRes();
    const emitter = new AgentSseEmitter(makeAgent(), res, { heartbeatIntervalMs: 0 });
    await emitter.run('test');
    expect(res.writableEnded).toBe(true);
  });

  it('emits error event and rethrows on agent failure', async () => {
    const agent = makeAgent();
    (agent.run as jest.Mock).mockRejectedValue(new Error('agent exploded'));

    const res = makeRes();
    const emitter = new AgentSseEmitter(agent, res, { heartbeatIntervalMs: 0 });

    await expect(emitter.run('test')).rejects.toThrow('agent exploded');
    const errEvent = res.events.find((e) => e.event === 'error');
    expect(errEvent).toBeDefined();
    expect((errEvent!.data as any).message).toBe('agent exploded');
    expect(res.writableEnded).toBe(true);
  });

  it('includes stepNumber as SSE id on step events', async () => {
    const res = makeRes();
    const emitter = new AgentSseEmitter(makeAgent(), res, { heartbeatIntervalMs: 0 });
    await emitter.run('test');

    const stepEvents = res.events.filter((e) => e.event === 'step');
    expect(stepEvents[0].id).toBe('1');
    expect(stepEvents[1].id).toBe('2');
  });

  it('sends heartbeat events on interval', async () => {
    jest.useFakeTimers();

    const res = makeRes();
    const agent = makeAgent();

    // The agent resolves after fake timers advance
    let resolveRun!: (v: AgentRunResult) => void;
    (agent.run as jest.Mock).mockReturnValue(
      new Promise<AgentRunResult>((resolve) => { resolveRun = resolve; }),
    );

    const emitter = new AgentSseEmitter(agent, res, { heartbeatIntervalMs: 10 });
    const emitPromise = emitter.run('test');

    // Advance fake timers to trigger ≥3 heartbeats, then resolve the agent
    jest.advanceTimersByTime(35);
    resolveRun({
      runId: 'r', answer: 'ok', steps: [], status: 'completed',
    } as AgentRunResult);

    await emitPromise;
    jest.useRealTimers();

    const heartbeats = res.events.filter((e) => e.event === 'heartbeat');
    expect(heartbeats.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── createAgentSseHandler ────────────────────────────────────────────────────

describe('createAgentSseHandler', () => {
  it('reads input from query string', async () => {
    const agent = makeAgent();
    const handler = createAgentSseHandler(agent, { heartbeatIntervalMs: 0 });
    const res = makeRes();
    await handler({ query: { input: 'hello from query' } }, res);

    expect(agent.run).toHaveBeenCalledWith('hello from query', expect.any(Object));
  });

  it('reads input from body.input', async () => {
    const agent = makeAgent();
    const handler = createAgentSseHandler(agent, { heartbeatIntervalMs: 0 });
    const res = makeRes();
    await handler({ body: { input: 'hello from body' } }, res);

    expect(agent.run).toHaveBeenCalledWith('hello from body', expect.any(Object));
  });

  it('reads input from body.message', async () => {
    const agent = makeAgent();
    const handler = createAgentSseHandler(agent, { heartbeatIntervalMs: 0 });
    const res = makeRes();
    await handler({ body: { message: 'hello from message' } }, res);

    expect(agent.run).toHaveBeenCalledWith('hello from message', expect.any(Object));
  });

  it('calls onMissingInput when no input is found', async () => {
    const onMissingInput = jest.fn();
    const agent = makeAgent();
    const handler = createAgentSseHandler(agent, { heartbeatIntervalMs: 0, onMissingInput });
    const res = makeRes();
    await handler({}, res);

    expect(onMissingInput).toHaveBeenCalledWith({}, res);
    expect(agent.run).not.toHaveBeenCalled();
  });

  it('returns 400 JSON by default when input missing (res.status/json available)', async () => {
    const agent = makeAgent();
    const handler = createAgentSseHandler(agent, { heartbeatIntervalMs: 0 });

    const chunks: string[] = [];
    const res = {
      headersSent: false,
      writableEnded: false,
      headers: {} as Record<string, string>,
      setHeader(k: string, v: string) { this.headers[k] = v; },
      write(c: string) { chunks.push(c); return true; },
      end() { this.writableEnded = true; },
      status(code: number) { (this as any)._status = code; return this; },
      json(body: unknown) { chunks.push(JSON.stringify(body)); return this; },
    };

    await handler({}, res);
    expect(chunks.join('')).toContain('Missing input');
    expect(agent.run).not.toHaveBeenCalled();
  });

  it('supports custom getInput extractor', async () => {
    const agent = makeAgent();
    const handler = createAgentSseHandler(agent, {
      heartbeatIntervalMs: 0,
      getInput: (req) => (req.body as any)?.question,
    });
    const res = makeRes();
    await handler({ body: { question: 'custom question' } }, res);

    expect(agent.run).toHaveBeenCalledWith('custom question', expect.any(Object));
  });

  it('emits full SSE event sequence for a complete run', async () => {
    const agent = makeAgent();
    const handler = createAgentSseHandler(agent, { heartbeatIntervalMs: 0 });
    const res = makeRes();
    await handler({ query: { input: 'test' } }, res);

    const events = res.events.map((e) => e.event);
    expect(events).toContain('step');
    expect(events).toContain('done');
    expect(events[events.length - 1]).toBe('done');
    expect(res.writableEnded).toBe(true);
  });
});
