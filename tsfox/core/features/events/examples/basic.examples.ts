/**
 * @fileoverview Event system examples
 * @module tsfox/core/features/events/examples
 */

import {
  EventSystem,
  EventSystemFactory,
  EventInterface,
  EventHandler
} from '../index';

/**
 * Basic usage example
 */
export async function basicUsageExample(): Promise<void> {
  console.log('=== Basic Event System Usage Example ===');

  // Create event system
  const eventSystem = EventSystemFactory.createMemorySystem();

  // Define event handler
  const userCreatedHandler: EventHandler = async (event: EventInterface) => {
    console.log(`User created: ${event.data.name} (${event.data.email})`);
  };

  // Subscribe to events
  eventSystem.on('user.created', userCreatedHandler);

  // Create and emit an event
  const userCreatedEvent: EventInterface = {
    id: 'evt_001',
    type: 'user.created',
    aggregateId: 'user_123',
    data: {
      name: 'John Doe',
      email: 'john@example.com'
    },
    metadata: {
      source: 'user-service',
      correlationId: 'req_001'
    },
    timestamp: new Date()
  };

  await eventSystem.emit(userCreatedEvent);

  // Get statistics
  const stats = eventSystem.getStats();
  console.log('Event system stats:', stats);

  // Shutdown
  await eventSystem.shutdown();
  console.log('Event system shut down successfully');
}

/**
 * Event sourcing example
 */
export async function eventSourcingExample(): Promise<void> {
  console.log('\n=== Event Sourcing Example ===');

  const eventSystem = EventSystemFactory.createMemorySystem();
  const store = eventSystem.getStore();

  // Define events for a user aggregate
  const events: EventInterface[] = [
    {
      id: 'evt_001',
      type: 'user.registered',
      aggregateId: 'user_123',
      version: 1,
      data: { name: 'John Doe', email: 'john@example.com' },
      metadata: { source: 'registration-service' },
      timestamp: new Date()
    },
    {
      id: 'evt_002',
      type: 'user.email_verified',
      aggregateId: 'user_123',
      version: 2,
      data: { email: 'john@example.com' },
      metadata: { source: 'verification-service' },
      timestamp: new Date()
    },
    {
      id: 'evt_003',
      type: 'user.profile_updated',
      aggregateId: 'user_123',
      version: 3,
      data: { name: 'John Smith', phone: '+1234567890' },
      metadata: { source: 'profile-service' },
      timestamp: new Date()
    }
  ];

  // Store events
  await store.append('user_123', events);

  // Read events back
  const storedEvents = await store.read('user_123');
  console.log(`Stored ${storedEvents.length} events for user_123`);

  // Replay events
  console.log('Replaying events...');
  const replayHandler: EventHandler = async (event: EventInterface) => {
    console.log(`Replaying: ${event.type} (v${event.version})`);
  };

  eventSystem.on('user.registered', replayHandler);
  eventSystem.on('user.email_verified', replayHandler);
  eventSystem.on('user.profile_updated', replayHandler);

  await eventSystem.replay('user_123');

  await eventSystem.shutdown();
}

/**
 * Pub/Sub example with multiple subscribers
 */
export async function pubSubExample(): Promise<void> {
  console.log('\n=== Pub/Sub Example ===');

  const eventSystem = EventSystemFactory.createMemorySystem();
  const bus = eventSystem.getBus();

  // Define multiple handlers
  const emailHandler: EventHandler = async (event: EventInterface) => {
    console.log(`📧 Sending welcome email to ${event.data.email}`);
  };

  const analyticsHandler: EventHandler = async (event: EventInterface) => {
    console.log(`📊 Recording user signup analytics for ${event.data.name}`);
  };

  const auditHandler: EventHandler = async (event: EventInterface) => {
    console.log(`📝 Audit log: User ${event.data.name} registered at ${event.timestamp}`);
  };

  // Subscribe all handlers to the same event
  await bus.subscribe('user.registered', emailHandler);
  await bus.subscribe('user.registered', analyticsHandler);
  await bus.subscribe('user.registered', auditHandler);

  // Publish event
  const event: EventInterface = {
    id: 'evt_004',
    type: 'user.registered',
    aggregateId: 'user_456',
    data: {
      name: 'Jane Smith',
      email: 'jane@example.com'
    },
    metadata: {
      source: 'registration-api',
      correlationId: 'req_002'
    },
    timestamp: new Date()
  };

  await bus.publish(event);

  // Get bus statistics
  const busStats = await bus.getStats();
  console.log('Bus stats:', busStats);

  await eventSystem.shutdown();
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  try {
    await basicUsageExample();
    await eventSourcingExample();
    await pubSubExample();
    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}
