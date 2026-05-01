/**
 * @fileoverview Epic C3 — Agent integrations test suite
 */

import {
  AgentEventBus,
  AgentEventSubscriber,
  AGENT_EVENTS,
  AuthenticatedAgent,
  AuthError,
  AgentRateLimit,
  RateLimitError,
  CachedAgent,
  InMemoryAgentCache,
  AgentMetrics,
  AgentMetricsRegistry,
} from '../integrations';
import type { IAgent, AgentRunResult, AgentContext } from '../interfaces/agent.interface';

// ── Mock agent ─────────────────────────────────────────────────────────────────

function makeAgent(id: string, answer: string, failWith?: Error): IAgent {
  return {
    id,
    name: id,
    status: 'idle',
    abort: () => {},
    async run(_input: string, ctx?: Partial<AgentContext>): Promise<AgentRunResult> {
      if (failWith) throw failWith;
      return {
        runId: ctx?.runId ?? 'r1',
        answer,
        steps: [{ stepNumber: 1, type: 'final_answer', content: answer, timestamp: new Date() }],
        usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
        status: 'completed',
      };
    },
  };
}

// ── AgentEventBus ─────────────────────────────────────────────────────────────

describe('AgentEventBus', () => {
  function makeEmitter() {
    const events: { type: string; payload: unknown }[] = [];
    return {
      emitter: { emit: async (type: string, payload: unknown) => { events.push({ type, payload }); } },
      events,
    };
  }

  it('emits run.started and run.completed on success', async () => {
    const { emitter, events } = makeEmitter();
    const bus = new AgentEventBus(makeAgent('a1', 'hello'), emitter);
    await bus.run('test input');

    expect(events[0].type).toBe(AGENT_EVENTS.RUN_STARTED);
    expect(events[1].type).toBe(AGENT_EVENTS.RUN_COMPLETED);
    expect((events[0].payload as any).input).toBe('test input');
    expect((events[1].payload as any).answer).toBe('hello');
  });

  it('emits run.failed when agent throws', async () => {
    const { emitter, events } = makeEmitter();
    const bus = new AgentEventBus(makeAgent('a2', '', new Error('oops')), emitter);
    await expect(bus.run('fail')).rejects.toThrow('oops');

    expect(events[1].type).toBe(AGENT_EVENTS.RUN_FAILED);
    expect((events[1].payload as any).error).toContain('oops');
  });

  it('proxies id, name, status, abort', () => {
    const { emitter } = makeEmitter();
    const agent = makeAgent('proxy-id', 'x');
    const bus = new AgentEventBus(agent, emitter);
    expect(bus.id).toBe('proxy-id');
    expect(bus.name).toBe('proxy-id');
    expect(bus.status).toBe('idle');
    expect(() => bus.abort()).not.toThrow();
  });
});

// ── AgentEventSubscriber ──────────────────────────────────────────────────────

describe('AgentEventSubscriber', () => {
  it('runs agent when event is received', async () => {
    const runs: string[] = [];
    const agent: IAgent = { ...makeAgent('sub-a', 'ok'), run: async (input) => { runs.push(input); return makeAgent('sub-a', 'ok').run(input); } };

    const handlers = new Map<string, ((e: any) => void)[]>();
    const bus = {
      subscribe: (type: string, handler: (e: any) => void) => {
        const list = handlers.get(type) ?? [];
        list.push(handler);
        handlers.set(type, list);
        return { unsubscribe: async () => { handlers.set(type, (handlers.get(type) ?? []).filter(h => h !== handler)); } };
      },
    };

    const sub = new AgentEventSubscriber(agent, bus);
    sub.listen('order.created', e => `process: ${JSON.stringify(e)}`);

    const handler = handlers.get('order.created')![0];
    await handler({ id: 'order-1' });

    expect(runs).toHaveLength(1);
    expect(runs[0]).toContain('order-1');
  });

  it('stop() unsubscribes', async () => {
    const handlers = new Map<string, ((e: any) => void)[]>();
    const bus = {
      subscribe: (type: string, handler: (e: any) => void) => {
        const list = handlers.get(type) ?? [];
        list.push(handler);
        handlers.set(type, list);
        return { unsubscribe: async () => { handlers.set(type, []); } };
      },
    };
    const sub = new AgentEventSubscriber(makeAgent('x', 'y'), bus);
    sub.listen('test.event');
    await sub.stop();
    expect(handlers.get('test.event')).toHaveLength(0);
  });
});

// ── AuthenticatedAgent ────────────────────────────────────────────────────────

describe('AuthenticatedAgent', () => {
  const validator = {
    validate: async (token: string) => {
      if (token === 'valid') return { userId: 'u1', roles: ['user'] };
      if (token === 'admin') return { userId: 'u2', roles: ['admin', 'user'] };
      throw new AuthError('Invalid token', 'INVALID_TOKEN');
    },
  };

  it('passes through valid token', async () => {
    const agent = new AuthenticatedAgent(makeAgent('auth-a', 'done'), validator);
    const result = await agent.run('hello', { variables: { token: 'Bearer valid' } });
    expect(result.status).toBe('completed');
  });

  it('injects userId into context variables', async () => {
    let capturedCtx: any;
    const inner: IAgent = { ...makeAgent('auth-b', 'ok'), run: async (_i, ctx) => { capturedCtx = ctx; return makeAgent('auth-b', 'ok').run(_i); } };
    const agent = new AuthenticatedAgent(inner, validator);
    await agent.run('hi', { variables: { token: 'valid' } });
    expect(capturedCtx.variables.userId).toBe('u1');
  });

  it('throws AuthError when no token', async () => {
    const agent = new AuthenticatedAgent(makeAgent('auth-c', 'x'), validator);
    await expect(agent.run('hello')).rejects.toThrow(AuthError);
  });

  it('throws AuthError when token invalid', async () => {
    const agent = new AuthenticatedAgent(makeAgent('auth-d', 'x'), validator);
    await expect(agent.run('hello', { variables: { token: 'bad' } })).rejects.toThrow(AuthError);
  });

  it('throws AuthError when user lacks required roles', async () => {
    const agent = new AuthenticatedAgent(makeAgent('auth-e', 'x'), validator, { requiredRoles: ['admin'] });
    await expect(agent.run('hello', { variables: { token: 'valid' } })).rejects.toThrow(AuthError);
  });

  it('passes when user has required role', async () => {
    const agent = new AuthenticatedAgent(makeAgent('auth-f', 'done'), validator, { requiredRoles: ['admin'] });
    const result = await agent.run('hello', { variables: { token: 'admin' } });
    expect(result.status).toBe('completed');
  });
});

// ── AgentRateLimit ────────────────────────────────────────────────────────────

describe('AgentRateLimit', () => {
  it('allows requests within limit', async () => {
    const limited = new AgentRateLimit(makeAgent('rl-a', 'ok'), { maxRequests: 3, windowMs: 60_000 });
    for (let i = 0; i < 3; i++) {
      const r = await limited.run('test', { variables: { userId: 'u1' } });
      expect(r.status).toBe('completed');
    }
  });

  it('throws RateLimitError when limit exceeded', async () => {
    const limited = new AgentRateLimit(makeAgent('rl-b', 'ok'), { maxRequests: 2, windowMs: 60_000 });
    await limited.run('t', { variables: { userId: 'u1' } });
    await limited.run('t', { variables: { userId: 'u1' } });
    await expect(limited.run('t', { variables: { userId: 'u1' } })).rejects.toThrow(RateLimitError);
  });

  it('resets window after windowMs', async () => {
    const limited = new AgentRateLimit(makeAgent('rl-c', 'ok'), { maxRequests: 1, windowMs: 1 });
    await limited.run('t', { variables: { userId: 'u1' } });
    await new Promise(r => setTimeout(r, 5)); // wait for window to expire
    const r = await limited.run('t', { variables: { userId: 'u1' } });
    expect(r.status).toBe('completed');
  });

  it('tracks different users independently', async () => {
    const limited = new AgentRateLimit(makeAgent('rl-d', 'ok'), { maxRequests: 1, windowMs: 60_000 });
    await limited.run('t', { variables: { userId: 'alice' } });
    const r = await limited.run('t', { variables: { userId: 'bob' } });
    expect(r.status).toBe('completed');
  });

  it('uses anonymous for missing userId', async () => {
    const limited = new AgentRateLimit(makeAgent('rl-e', 'ok'), { maxRequests: 1, windowMs: 60_000 });
    await limited.run('t');
    await expect(limited.run('t')).rejects.toThrow(RateLimitError);
  });
});

// ── CachedAgent ───────────────────────────────────────────────────────────────

describe('CachedAgent', () => {
  it('caches successful responses', async () => {
    let runCount = 0;
    const inner: IAgent = { ...makeAgent('cache-a', 'cached'), run: async (i, ctx) => { runCount++; return makeAgent('cache-a', 'cached').run(i, ctx); } };
    const cached = new CachedAgent(inner, new InMemoryAgentCache());
    await cached.run('same input');
    await cached.run('same input');
    expect(runCount).toBe(1); // second call from cache
  });

  it('does not cache different inputs', async () => {
    let runCount = 0;
    const inner: IAgent = { ...makeAgent('cache-b', 'x'), run: async (i, ctx) => { runCount++; return makeAgent('cache-b', 'x').run(i, ctx); } };
    const cached = new CachedAgent(inner, new InMemoryAgentCache());
    await cached.run('input-1');
    await cached.run('input-2');
    expect(runCount).toBe(2);
  });

  it('invalidate() clears the cache entry', async () => {
    let runCount = 0;
    const inner: IAgent = { ...makeAgent('cache-c', 'v'), run: async (i, ctx) => { runCount++; return makeAgent('cache-c', 'v').run(i, ctx); } };
    const cached = new CachedAgent(inner, new InMemoryAgentCache());
    await cached.run('q');
    await cached.invalidate('q');
    await cached.run('q');
    expect(runCount).toBe(2);
  });

  it('falls back gracefully when cache.get throws', async () => {
    const brokenCache = {
      get: async () => { throw new Error('redis down'); },
      set: async () => {},
      delete: async () => {},
    };
    const cached = new CachedAgent(makeAgent('cache-d', 'ok'), brokenCache);
    const result = await cached.run('test');
    expect(result.answer).toBe('ok');
  });

  it('respects TTL expiry', async () => {
    const cache = new InMemoryAgentCache();
    let runCount = 0;
    const inner: IAgent = { ...makeAgent('cache-e', 'v'), run: async (i, ctx) => { runCount++; return makeAgent('cache-e', 'v').run(i, ctx); } };
    const cached = new CachedAgent(inner, cache, { ttlMs: 1 });
    await cached.run('q');
    await new Promise(r => setTimeout(r, 5));
    await cached.run('q');
    expect(runCount).toBe(2); // cache expired
  });
});

// ── AgentMetrics ──────────────────────────────────────────────────────────────

describe('AgentMetrics', () => {
  it('tracks successful runs', async () => {
    const m = new AgentMetrics(makeAgent('m-a', 'ok'));
    await m.run('test');
    await m.run('test');
    const s = m.snapshot();
    expect(s.totalRuns).toBe(2);
    expect(s.successfulRuns).toBe(2);
    expect(s.failedRuns).toBe(0);
  });

  it('tracks failed runs', async () => {
    const m = new AgentMetrics(makeAgent('m-b', '', new Error('fail')));
    await expect(m.run('t')).rejects.toThrow();
    const s = m.snapshot();
    expect(s.totalRuns).toBe(1);
    expect(s.failedRuns).toBe(1);
  });

  it('tracks token usage', async () => {
    const m = new AgentMetrics(makeAgent('m-c', 'ok'));
    await m.run('t');
    await m.run('t');
    expect(m.snapshot().totalTokensUsed).toBe(20); // 10 per run
  });

  it('computes averageLatencyMs > 0', async () => {
    const m = new AgentMetrics(makeAgent('m-d', 'ok'));
    await m.run('t');
    expect(m.snapshot().averageLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('reset() clears all stats', async () => {
    const m = new AgentMetrics(makeAgent('m-e', 'ok'));
    await m.run('t');
    m.reset();
    expect(m.snapshot().totalRuns).toBe(0);
    expect(m.snapshot().lastRunAt).toBeNull();
  });

  it('records lastRunAt', async () => {
    const m = new AgentMetrics(makeAgent('m-f', 'ok'));
    expect(m.snapshot().lastRunAt).toBeNull();
    await m.run('t');
    expect(m.snapshot().lastRunAt).toBeInstanceOf(Date);
  });
});

// ── AgentMetricsRegistry ──────────────────────────────────────────────────────

describe('AgentMetricsRegistry', () => {
  it('registers and retrieves agents', async () => {
    const registry = new AgentMetricsRegistry();
    const tracked = registry.register(makeAgent('reg-a', 'ok'));
    await tracked.run('t');
    expect(registry.get('reg-a')?.snapshot().totalRuns).toBe(1);
  });

  it('getAll() returns snapshots for all agents', async () => {
    const registry = new AgentMetricsRegistry();
    registry.register(makeAgent('reg-b', 'x'));
    registry.register(makeAgent('reg-c', 'y'));
    expect(registry.getAll()).toHaveLength(2);
  });

  it('reset() clears specific agent', async () => {
    const registry = new AgentMetricsRegistry();
    const m = registry.register(makeAgent('reg-d', 'ok'));
    await m.run('t');
    registry.reset('reg-d');
    expect(registry.get('reg-d')?.snapshot().totalRuns).toBe(0);
  });

  it('unregister() removes agent', () => {
    const registry = new AgentMetricsRegistry();
    registry.register(makeAgent('reg-e', 'ok'));
    registry.unregister('reg-e');
    expect(registry.get('reg-e')).toBeUndefined();
  });
});
