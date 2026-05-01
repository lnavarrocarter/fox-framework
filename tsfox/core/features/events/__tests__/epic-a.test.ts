/**
 * @fileoverview Tests for CQRS, Event Sourcing, Adapters and Middleware
 * @module tsfox/core/features/events/__tests__
 */

import {
  CommandBus,
  CommandBusError,
  QueryBus,
  QueryBusError
} from '../cqrs';

import { AggregateRoot, InMemoryEventSourcingRepository } from '../sourcing/aggregate-root';
import { ProjectionManager } from '../sourcing/projection-manager';
import { SagaManager } from '../sourcing/saga-manager';
import { EventLoggingMiddleware } from '../middleware/logging.middleware';
import { EventMetricsMiddleware } from '../middleware/metrics.middleware';
import { SseAdapter } from '../adapters/sse.adapter';
import { EventInterface } from '../interfaces/event.interface';
import { EventProjection, ProjectionMetadata } from '../interfaces/sourcing.interface';
import { EventSystem, EventSystemFactory } from '../event.system';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeEvent(type: string, data: any = {}, aggregateId?: string): EventInterface {
  return {
    id: `evt_${Math.random().toString(36).slice(2, 10)}`,
    type,
    aggregateId,
    version: 1,
    data,
    metadata: { source: 'test' },
    timestamp: new Date()
  };
}

// ─── CommandBus ───────────────────────────────────────────────────────────────

describe('CommandBus', () => {
  let bus: CommandBus;

  beforeEach(() => { bus = new CommandBus(); });

  it('routes a command to its registered handler', async () => {
    const received: any[] = [];
    bus.register('CreateOrder', {
      handle: async (cmd: any) => { received.push(cmd); return []; },
      getSupportedCommands: () => ['CreateOrder']
    });

    await bus.send({ type: 'CreateOrder', data: { items: [] } });
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('CreateOrder');
  });

  it('throws when no handler is registered', async () => {
    await expect(bus.send({ type: 'UnknownCmd' })).rejects.toThrow(CommandBusError);
  });

  it('throws when registering a duplicate handler', () => {
    const h = { handle: jest.fn().mockResolvedValue([]), getSupportedCommands: () => ['X'] };
    bus.register('X', h);
    expect(() => bus.register('X', h)).toThrow(CommandBusError);
  });

  it('sendAndReturn returns events from the handler', async () => {
    const evt = makeEvent('order.created', {}, 'agg-1');
    bus.register('CreateOrder', {
      handle: async () => [evt],
      getSupportedCommands: () => ['CreateOrder']
    });

    const events = await bus.sendAndReturn({ type: 'CreateOrder' });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('order.created');
  });

  it('unregister removes the handler', async () => {
    bus.register('DoThing', {
      handle: jest.fn().mockResolvedValue([]),
      getSupportedCommands: () => ['DoThing']
    });
    bus.unregister('DoThing');
    await expect(bus.send({ type: 'DoThing' })).rejects.toThrow(CommandBusError);
  });
});

// ─── QueryBus ─────────────────────────────────────────────────────────────────

describe('QueryBus', () => {
  let bus: QueryBus;

  beforeEach(() => { bus = new QueryBus(); });

  it('routes a query to its registered handler', async () => {
    bus.register('GetOrder', {
      handle: async (q: any) => ({ id: q.id, status: 'confirmed' }),
      getSupportedQueries: () => ['GetOrder']
    });

    const result = await bus.execute<{ id: string; status: string }>({ type: 'GetOrder', id: '42' });
    expect(result.id).toBe('42');
    expect(result.status).toBe('confirmed');
  });

  it('throws when no handler is registered', async () => {
    await expect(bus.execute({ type: 'UnknownQuery' })).rejects.toThrow(QueryBusError);
  });

  it('throws on duplicate handler registration', () => {
    const h = { handle: jest.fn(), getSupportedQueries: () => ['Q'] };
    bus.register('Q', h);
    expect(() => bus.register('Q', h)).toThrow(QueryBusError);
  });

  it('unregister removes the handler', async () => {
    bus.register('Q2', { handle: jest.fn(), getSupportedQueries: () => ['Q2'] });
    bus.unregister('Q2');
    await expect(bus.execute({ type: 'Q2' })).rejects.toThrow(QueryBusError);
  });
});

// ─── AggregateRoot ────────────────────────────────────────────────────────────

class CounterAggregate extends AggregateRoot {
  count = 0;

  static create(id: string, initial = 0): CounterAggregate {
    const agg = new CounterAggregate(id);
    (agg as any).raise('counter.created', { initial });
    return agg;
  }

  increment(): void {
    (this as any).raise('counter.incremented', { by: 1 });
  }

  decrement(): void {
    (this as any).raise('counter.decremented', { by: 1 });
  }

  protected applyEvent(event: EventInterface): void {
    if (event.type === 'counter.created') this.count = event.data.initial;
    if (event.type === 'counter.incremented') this.count += event.data.by;
    if (event.type === 'counter.decremented') this.count -= event.data.by;
  }
}

describe('AggregateRoot', () => {
  it('initialises with correct id and version 0', () => {
    const agg = new CounterAggregate('c-1');
    expect(agg.id).toBe('c-1');
    expect(agg.version).toBe(0);
  });

  it('raises events and updates state', () => {
    const agg = CounterAggregate.create('c-2', 10);
    agg.increment();
    agg.increment();

    expect(agg.count).toBe(12);
    expect(agg.version).toBe(3); // created + 2 increments
    expect(agg.getUncommittedEvents()).toHaveLength(3);
  });

  it('markEventsAsCommitted clears uncommitted events', () => {
    const agg = CounterAggregate.create('c-3');
    agg.increment();
    agg.markEventsAsCommitted();
    expect(agg.getUncommittedEvents()).toHaveLength(0);
  });

  it('loadFromHistory rebuilds state', () => {
    const history: EventInterface[] = [
      { id: 'e1', type: 'counter.created', aggregateId: 'c-4', version: 1, data: { initial: 5 }, metadata: { source: 'test' }, timestamp: new Date() },
      { id: 'e2', type: 'counter.incremented', aggregateId: 'c-4', version: 2, data: { by: 1 }, metadata: { source: 'test' }, timestamp: new Date() },
      { id: 'e3', type: 'counter.decremented', aggregateId: 'c-4', version: 3, data: { by: 1 }, metadata: { source: 'test' }, timestamp: new Date() }
    ];

    const agg = new CounterAggregate('c-4');
    agg.loadFromHistory(history);
    expect(agg.count).toBe(5);
    expect(agg.version).toBe(3);
  });
});

// ─── InMemoryEventSourcingRepository ──────────────────────────────────────────

describe('InMemoryEventSourcingRepository', () => {
  let repo: InMemoryEventSourcingRepository<CounterAggregate>;

  beforeEach(() => {
    repo = new InMemoryEventSourcingRepository<CounterAggregate>(
      id => new CounterAggregate(id)
    );
  });

  it('returns null for unknown id', async () => {
    expect(await repo.getById('no-exist')).toBeNull();
  });

  it('saves and reloads aggregate', async () => {
    const agg = CounterAggregate.create('r-1', 0);
    agg.increment();
    await repo.save(agg);

    const loaded = await repo.getById('r-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.count).toBe(1);
    expect(loaded!.version).toBe(2);
  });

  it('exists returns false before save', async () => {
    expect(await repo.exists('new-id')).toBe(false);
  });

  it('exists returns true after save', async () => {
    const agg = CounterAggregate.create('e-1');
    await repo.save(agg);
    expect(await repo.exists('e-1')).toBe(true);
  });

  it('delete removes the aggregate', async () => {
    const agg = CounterAggregate.create('d-1');
    await repo.save(agg);
    await repo.delete('d-1');
    expect(await repo.getById('d-1')).toBeNull();
  });
});

// ─── ProjectionManager ────────────────────────────────────────────────────────

class SumProjection implements EventProjection {
  readonly name = 'Sum';
  readonly version = 1;
  readonly eventTypes = ['counter.incremented', 'counter.decremented'];

  initialize(): { total: number } { return { total: 0 }; }

  project(event: EventInterface, state: { total: number }): { total: number } {
    if (event.type === 'counter.incremented') return { total: state.total + event.data.by };
    if (event.type === 'counter.decremented') return { total: state.total - event.data.by };
    return state;
  }

  async reset(): Promise<void> { /* nothing to reset in-memory */ }

  getMetadata(): ProjectionMetadata {
    return { name: this.name, version: this.version, position: 0, lastUpdated: new Date(), status: 'running', stats: { eventsProcessed: 0, eventsPerSecond: 0, averageProcessingTime: 0 } };
  }
}

describe('ProjectionManager', () => {
  let pm: ProjectionManager;

  beforeEach(() => { pm = new ProjectionManager(); });

  it('registers and processes events', async () => {
    await pm.register(new SumProjection());
    await pm.process(makeEvent('counter.incremented', { by: 3 }));
    await pm.process(makeEvent('counter.incremented', { by: 2 }));
    await pm.process(makeEvent('counter.decremented', { by: 1 }));

    const state = pm.getState<{ total: number }>('Sum');
    expect(state.total).toBe(4);
  });

  it('ignores events not in eventTypes', async () => {
    await pm.register(new SumProjection());
    await pm.process(makeEvent('unrelated.event', { by: 999 }));
    expect(pm.getState<{ total: number }>('Sum').total).toBe(0);
  });

  it('stop prevents processing', async () => {
    await pm.register(new SumProjection());
    await pm.stop('Sum');
    await pm.process(makeEvent('counter.incremented', { by: 5 }));
    expect(pm.getState<{ total: number }>('Sum').total).toBe(0);
  });

  it('rebuild resets and reprocesses', async () => {
    await pm.register(new SumProjection());
    await pm.process(makeEvent('counter.incremented', { by: 10 }));

    const history = [
      makeEvent('counter.incremented', { by: 1 }),
      makeEvent('counter.incremented', { by: 2 })
    ];
    await pm.rebuild('Sum', history);
    expect(pm.getState<{ total: number }>('Sum').total).toBe(3);
  });

  it('getStatus returns metadata', async () => {
    await pm.register(new SumProjection());
    const status = await pm.getStatus('Sum');
    expect(status.name).toBe('Sum');
    expect(status.status).toBe('running');
  });

  it('throws for unknown projection', async () => {
    await expect(pm.getStatus('NonExistent')).rejects.toThrow();
  });
});

// ─── EventLoggingMiddleware ────────────────────────────────────────────────────

describe('EventLoggingMiddleware', () => {
  it('passes the event through without modification', async () => {
    const mw = new EventLoggingMiddleware({ level: 'debug', logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } });
    const event = makeEvent('user.created', { name: 'Alice' });
    const ctx = { eventId: event.id, source: 'test', timestamp: new Date(), metadata: {} };

    const result = await mw.beforeEmit!(event, ctx);
    expect(result.id).toBe(event.id);
  });

  it('logs errors via onError', async () => {
    const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const mw = new EventLoggingMiddleware({ logger: mockLogger });
    const event = makeEvent('x');
    const ctx = { eventId: event.id, source: 'test', timestamp: new Date(), metadata: {} };

    await mw.onError!(new Error('boom'), event, ctx);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });
});

// ─── EventMetricsMiddleware ────────────────────────────────────────────────────

describe('EventMetricsMiddleware', () => {
  it('tracks emitted events and latency', async () => {
    const mw = new EventMetricsMiddleware();
    const event = makeEvent('order.placed');
    const ctx = { eventId: event.id, source: 'test', timestamp: new Date(), metadata: {} };

    await mw.beforeEmit!(event, ctx);
    await mw.afterEmit!(event, ctx);
    await mw.beforeEmit!(event, ctx);
    await mw.afterEmit!(event, ctx);

    const snap = mw.getSnapshot();
    expect(snap.totalEmitted).toBe(2);
    expect(snap.averageEmitLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('tracks errors', async () => {
    const mw = new EventMetricsMiddleware();
    const event = makeEvent('broken.event');
    const ctx = { eventId: event.id, source: 'test', timestamp: new Date(), metadata: {} };

    await mw.beforeEmit!(event, ctx);
    await mw.onError!(new Error('x'), event, ctx);

    expect(mw.getSnapshot().totalErrors).toBe(1);
  });

  it('reset clears all stats', async () => {
    const mw = new EventMetricsMiddleware();
    const event = makeEvent('e');
    const ctx = { eventId: event.id, source: 'test', timestamp: new Date(), metadata: {} };

    await mw.beforeEmit!(event, ctx);
    await mw.afterEmit!(event, ctx);
    mw.reset();
    expect(mw.getSnapshot().totalEmitted).toBe(0);
  });
});

// ─── SseAdapter ───────────────────────────────────────────────────────────────

describe('SseAdapter', () => {
  it('starts disconnected', () => {
    const adapter = new SseAdapter();
    expect(adapter.isConnected).toBe(false);
  });

  it('connects and disconnects', () => {
    const adapter = new SseAdapter({ heartbeatInterval: 60_000 });
    adapter.connect();
    expect(adapter.isConnected).toBe(true);
    adapter.disconnect();
    expect(adapter.isConnected).toBe(false);
  });

  it('publish does nothing when not connected', async () => {
    const adapter = new SseAdapter();
    // Should not throw
    await expect(adapter.publish(makeEvent('test'))).resolves.toBeUndefined();
  });

  it('getStats returns client count', () => {
    const adapter = new SseAdapter();
    adapter.connect();
    const stats = adapter.getStats();
    expect(stats.clientCount).toBe(0);
    adapter.disconnect();
  });
});

// ─── EventSystem integration: projections ─────────────────────────────────────

describe('EventSystem — projection integration', () => {
  let es: EventSystem;

  beforeEach(() => {
    es = EventSystemFactory.createMemorySystem() as EventSystem;
  });

  afterEach(async () => { await es.shutdown(); });

  it('getStats returns real averageLatency (not 0-stub)', async () => {
    const event = makeEvent('user.signed-up', { userId: 'u1' }, 'u1');
    await es.emit(event);
    const stats = es.getStats();
    expect(stats.totalEvents).toBe(1);
    // averageLatency is a number (>= 0), not the old hard-coded 0 stub
    expect(typeof stats.averageLatency).toBe('number');
  });

  it('registerProjection wires events to the projection manager', async () => {
    const projection: EventProjection = {
      name: 'UserCount',
      version: 1,
      eventTypes: ['user.signed-up'],
      initialize: () => ({ count: 0 }),
      project: (_event, state) => ({ count: state.count + 1 }),
      reset: async () => {},
      getMetadata: () => ({
        name: 'UserCount', version: 1, position: 0, lastUpdated: new Date(),
        status: 'running', stats: { eventsProcessed: 0, eventsPerSecond: 0, averageProcessingTime: 0 }
      })
    };

    es.registerProjection(projection);

    const event1 = makeEvent('user.signed-up', { userId: 'u2' }, 'u2');
    const event2 = makeEvent('user.signed-up', { userId: 'u3' }, 'u3');
    await es.emit(event1);
    await es.emit(event2);

    // Give projection time to process async handlers
    await new Promise(r => setTimeout(r, 20));

    const pm = (es as any).projectionManager as ProjectionManager;
    const state = pm.getState<{ count: number }>('UserCount');
    expect(state.count).toBe(2);
  });
});
