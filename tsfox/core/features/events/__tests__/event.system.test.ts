/**
 * @fileoverview Event system basic tests
 * @module tsfox/core/features/events/__tests__
 */

import {
  EventSystem,
  EventSystemFactory,
  EventInterface,
  EventHandler,
  EventEmitterFactory,
  EventStoreFactory,
  EventBusFactory
} from '../index';

describe('Event System', () => {
  let eventSystem: EventSystem;

  beforeEach(() => {
    eventSystem = EventSystemFactory.createMemorySystem() as EventSystem;
  });

  afterEach(async () => {
    await eventSystem.shutdown();
  });

  describe('Basic Event Emission', () => {
    it('should emit and handle events', async () => {
      const receivedEvents: EventInterface[] = [];
      
      const handler: EventHandler = async (event: EventInterface) => {
        receivedEvents.push(event);
      };

      eventSystem.on('test.event', handler);

      const testEvent: EventInterface = {
        id: 'test_001',
        type: 'test.event',
        data: { message: 'Hello World' },
        metadata: { source: 'test' },
        timestamp: new Date()
      };

      await eventSystem.emit(testEvent);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].id).toBe('test_001');
      expect(receivedEvents[0].data.message).toBe('Hello World');
    });

    it('should handle multiple subscribers', async () => {
      const handler1Events: EventInterface[] = [];
      const handler2Events: EventInterface[] = [];

      const handler1: EventHandler = async (event) => {
        handler1Events.push(event);
      };

      const handler2: EventHandler = async (event) => {
        handler2Events.push(event);
      };

      eventSystem.on('multi.event', handler1);
      eventSystem.on('multi.event', handler2);

      const testEvent: EventInterface = {
        id: 'multi_001',
        type: 'multi.event',
        data: { test: true },
        metadata: { source: 'test' },
        timestamp: new Date()
      };

      await eventSystem.emit(testEvent);

      expect(handler1Events).toHaveLength(1);
      expect(handler2Events).toHaveLength(1);
      expect(handler1Events[0].id).toBe('multi_001');
      expect(handler2Events[0].id).toBe('multi_001');
    });
  });

  describe('Event Store', () => {
    it('should store and retrieve events', async () => {
      const store = eventSystem.getStore();
      const events: EventInterface[] = [
        {
          id: 'store_001',
          type: 'user.created',
          aggregateId: 'user_123',
          version: 1,
          data: { name: 'John' },
          metadata: { source: 'test' },
          timestamp: new Date()
        },
        {
          id: 'store_002',
          type: 'user.updated',
          aggregateId: 'user_123',
          version: 2,
          data: { name: 'John Doe' },
          metadata: { source: 'test' },
          timestamp: new Date()
        }
      ];

      await store.append('user_123', events);
      const retrievedEvents = await store.read('user_123');

      expect(retrievedEvents).toHaveLength(2);
      expect(retrievedEvents[0].id).toBe('store_001');
      expect(retrievedEvents[1].id).toBe('store_002');
    });

    it('should handle version conflicts', async () => {
      const store = eventSystem.getStore();
      const event1: EventInterface = {
        id: 'conflict_001',
        type: 'test.event',
        aggregateId: 'test_stream',
        data: {},
        metadata: { source: 'test' },
        timestamp: new Date()
      };

      await store.append('test_stream', [event1]);

      // Try to append with wrong expected version
      const event2: EventInterface = {
        id: 'conflict_002',
        type: 'test.event',
        aggregateId: 'test_stream',
        data: {},
        metadata: { source: 'test' },
        timestamp: new Date()
      };

      await expect(
        store.append('test_stream', [event2], 5) // Wrong expected version
      ).rejects.toThrow();
    });
  });

  describe('Event Bus', () => {
    it('should publish and subscribe to events', async () => {
      const bus = eventSystem.getBus();
      const receivedEvents: EventInterface[] = [];

      const handler: EventHandler = async (event) => {
        receivedEvents.push(event);
      };

      await bus.subscribe('bus.test', handler);

      const testEvent: EventInterface = {
        id: 'bus_001',
        type: 'bus.test',
        data: { message: 'Bus message' },
        metadata: { source: 'test' },
        timestamp: new Date()
      };

      await bus.publish(testEvent);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].id).toBe('bus_001');
    });

    it('should get bus statistics', async () => {
      const bus = eventSystem.getBus();
      const stats = await bus.getStats();

      expect(stats).toHaveProperty('totalPublished');
      expect(stats).toHaveProperty('totalReceived');
      expect(stats).toHaveProperty('activeSubscriptions');
    });
  });

  describe('Event Replay', () => {
    it('should replay events from store', async () => {
      const store = eventSystem.getStore();
      const replayedEvents: EventInterface[] = [];

      const replayHandler: EventHandler = async (event) => {
        replayedEvents.push(event);
      };

      eventSystem.on('replay.test', replayHandler);

      // Store some events
      const events: EventInterface[] = [
        {
          id: 'replay_001',
          type: 'replay.test',
          aggregateId: 'replay_stream',
          data: { step: 1 },
          metadata: { source: 'test' },
          timestamp: new Date()
        },
        {
          id: 'replay_002',
          type: 'replay.test',
          aggregateId: 'replay_stream',
          data: { step: 2 },
          metadata: { source: 'test' },
          timestamp: new Date()
        }
      ];

      await store.append('replay_stream', events);

      // Replay events
      await eventSystem.replay('replay_stream');

      expect(replayedEvents).toHaveLength(2);
      expect(replayedEvents[0].data.step).toBe(1);
      expect(replayedEvents[1].data.step).toBe(2);
    });
  });

  describe('Event System Statistics', () => {
    it('should track event statistics', async () => {
      const testEvent: EventInterface = {
        id: 'stats_001',
        type: 'stats.test',
        data: {},
        metadata: { source: 'test' },
        timestamp: new Date()
      };

      await eventSystem.emit(testEvent);
      await eventSystem.emit(testEvent);

      const stats = eventSystem.getStats();
      expect(stats.totalEvents).toBe(2);
      expect(stats.failedEvents).toBe(0);
      expect(stats.lastProcessed).toBeInstanceOf(Date);
    });
  });
});

describe('Component Integration', () => {
  describe('EventEmitter', () => {
    it('should create emitter and handle subscriptions', () => {
      const emitter = EventEmitterFactory.createWithDefaults();
      const events: EventInterface[] = [];

      const subscription = emitter.subscribe('test', async (event) => {
        events.push(event);
      });

      expect(subscription.id).toBeDefined();
      expect(subscription.eventType).toBe('test');
      expect(emitter.getSubscriptions()).toHaveLength(1);
    });
  });

  describe('EventStore', () => {
    it('should create memory store and handle transactions', async () => {
      const store = EventStoreFactory.createMemoryStore();
      const transaction = await store.beginTransaction();

      expect(transaction.id).toBeDefined();
      expect(transaction.status).toBe('pending');

      transaction.append('test_stream', [{
        id: 'tx_001',
        type: 'test',
        data: {},
        metadata: { source: 'test' },
        timestamp: new Date()
      }]);

      await transaction.commit();
      expect(transaction.status).toBe('committed');
    });
  });

  describe('EventBus', () => {
    it('should create bus with emitter', async () => {
      const emitter = EventEmitterFactory.createWithDefaults();
      const bus = EventBusFactory.createMemoryBus(emitter);

      const testEvent: EventInterface = {
        id: 'bus_integration_001',
        type: 'integration.test',
        data: { test: true },
        metadata: { source: 'test' },
        timestamp: new Date()
      };

      await bus.publish(testEvent);
      const stats = await bus.getStats();
      expect(stats.totalPublished).toBe(1);
    });
  });
});
