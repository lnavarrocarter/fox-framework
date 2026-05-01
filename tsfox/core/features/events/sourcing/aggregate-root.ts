/**
 * @fileoverview AggregateRoot base class for Event Sourcing
 * @module tsfox/core/features/events/sourcing
 */

import { EventInterface, EventMetadata } from '../interfaces/event.interface';
import { AggregateRootInterface } from '../interfaces/sourcing.interface';

let _eventIdCounter = 0;
function nextEventId(): string {
  return `evt_${Date.now()}_${++_eventIdCounter}`;
}

/**
 * Abstract base class for all aggregate roots in an event-sourced system.
 *
 * Usage:
 * ```ts
 * class OrderAggregate extends AggregateRoot {
 *   private status: string = 'pending';
 *
 *   static create(id: string, items: Item[]): OrderAggregate {
 *     const agg = new OrderAggregate(id);
 *     agg.raise('order.created', { items });
 *     return agg;
 *   }
 *
 *   protected applyEvent(event: EventInterface): void {
 *     if (event.type === 'order.created') this.status = 'created';
 *     if (event.type === 'order.confirmed') this.status = 'confirmed';
 *   }
 * }
 * ```
 */
export abstract class AggregateRoot implements AggregateRootInterface {
  private _id: string;
  private _version: number = 0;
  private _uncommittedEvents: EventInterface[] = [];

  constructor(id: string) {
    this._id = id;
  }

  get id(): string {
    return this._id;
  }

  get version(): number {
    return this._version;
  }

  /**
   * Apply an already-persisted event (replaying from store).
   * Increments version and calls the subclass hook.
   */
  apply(event: EventInterface): void {
    this.applyEvent(event);
    this._version = event.version ?? this._version + 1;
  }

  /**
   * Raise a new domain event. Builds the full EventInterface, applies it
   * locally, and queues it as uncommitted.
   */
  protected raise(
    type: string,
    data: any,
    meta: Partial<EventMetadata> = {}
  ): void {
    const event: EventInterface = {
      id: nextEventId(),
      type,
      aggregateId: this._id,
      version: this._version + 1,
      data,
      metadata: { source: this.constructor.name, ...meta },
      timestamp: new Date()
    };

    this._uncommittedEvents.push(event);
    this.apply(event);
  }

  /**
   * Override in subclasses to update internal state from an event.
   */
  protected abstract applyEvent(event: EventInterface): void;

  getUncommittedEvents(): EventInterface[] {
    return [...this._uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this._uncommittedEvents = [];
  }

  loadFromHistory(events: EventInterface[]): void {
    for (const event of events) {
      this.apply(event);
    }
  }

  /**
   * Override to return a serialisable snapshot of current state.
   * Default returns `{}`.
   */
  getSnapshot(): Record<string, unknown> {
    return { id: this._id, version: this._version };
  }

  /**
   * Override to restore state from a snapshot object.
   */
  loadFromSnapshot(_snapshot: any, version: number): void {
    this._version = version;
  }
}

/**
 * In-memory event-sourcing repository.
 * Stores events per aggregate; loads by replaying from history.
 */
export class InMemoryEventSourcingRepository<T extends AggregateRoot> {
  private streams = new Map<string, EventInterface[]>();
  private snapshots = new Map<string, { snapshot: any; version: number }>();

  constructor(
    private readonly factory: (id: string) => T,
    private readonly snapshotFrequency: number = 50
  ) {}

  async getById(id: string): Promise<T | null> {
    const snapshotEntry = this.snapshots.get(id);
    const aggregate = this.factory(id);

    if (snapshotEntry) {
      aggregate.loadFromSnapshot(snapshotEntry.snapshot, snapshotEntry.version);
      const events = (this.streams.get(id) ?? []).filter(
        e => (e.version ?? 0) > snapshotEntry.version
      );
      aggregate.loadFromHistory(events);
    } else {
      const events = this.streams.get(id);
      if (!events || events.length === 0) return null;
      aggregate.loadFromHistory(events);
    }

    return aggregate;
  }

  async save(aggregate: T): Promise<void> {
    const uncommitted = aggregate.getUncommittedEvents();
    if (uncommitted.length === 0) return;

    const stream = this.streams.get(aggregate.id) ?? [];
    stream.push(...uncommitted);
    this.streams.set(aggregate.id, stream);

    aggregate.markEventsAsCommitted();

    // Create snapshot every N events
    if (aggregate.version % this.snapshotFrequency === 0) {
      this.snapshots.set(aggregate.id, {
        snapshot: aggregate.getSnapshot(),
        version: aggregate.version
      });
    }
  }

  async exists(id: string): Promise<boolean> {
    return this.streams.has(id) && (this.streams.get(id)?.length ?? 0) > 0;
  }

  async getVersion(id: string): Promise<number> {
    const stream = this.streams.get(id) ?? [];
    if (stream.length === 0) return 0;
    return stream[stream.length - 1].version ?? stream.length;
  }

  async delete(id: string): Promise<void> {
    this.streams.delete(id);
    this.snapshots.delete(id);
  }
}
