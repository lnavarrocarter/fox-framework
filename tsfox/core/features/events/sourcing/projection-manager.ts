/**
 * @fileoverview ProjectionManager — builds and maintains read models from event streams
 * @module tsfox/core/features/events/sourcing
 */

import { EventInterface } from '../interfaces/event.interface';
import {
  EventProjection,
  ProjectionManagerInterface,
  ProjectionMetadata
} from '../interfaces/sourcing.interface';

interface ProjectionEntry {
  projection: EventProjection;
  state: any;
  metadata: ProjectionMetadata;
}

/**
 * In-memory implementation of ProjectionManagerInterface.
 *
 * Projections are registered once, then receive every event emitted via `process()`.
 * They can be rebuilt from a full event history via `rebuild()`.
 *
 * ```ts
 * const pm = new ProjectionManager();
 * pm.register(new OrderSummaryProjection());
 *
 * // After emitting events through EventSystem:
 * await pm.process(event);
 * const status = await pm.getStatus('OrderSummary');
 * ```
 */
export class ProjectionManager implements ProjectionManagerInterface {
  private projections = new Map<string, ProjectionEntry>();

  async register(projection: EventProjection): Promise<void> {
    const state = projection.initialize();
    this.projections.set(projection.name, {
      projection,
      state,
      metadata: {
        name: projection.name,
        version: projection.version,
        position: 0,
        lastUpdated: new Date(),
        status: 'running',
        stats: { eventsProcessed: 0, eventsPerSecond: 0, averageProcessingTime: 0 }
      }
    });
  }

  async unregister(projectionName: string): Promise<void> {
    this.projections.delete(projectionName);
  }

  async start(projectionName: string): Promise<void> {
    const entry = this._get(projectionName);
    entry.metadata.status = 'running';
  }

  async stop(projectionName: string): Promise<void> {
    const entry = this._get(projectionName);
    entry.metadata.status = 'stopped';
  }

  async restart(projectionName: string): Promise<void> {
    const entry = this._get(projectionName);
    entry.metadata.status = 'running';
    entry.metadata.error = undefined;
  }

  async rebuild(projectionName: string, allEvents: EventInterface[] = []): Promise<void> {
    const entry = this._get(projectionName);
    entry.metadata.status = 'rebuilding';
    entry.state = entry.projection.initialize();
    entry.metadata.position = 0;
    await entry.projection.reset();

    for (const event of allEvents) {
      await this._applyEvent(entry, event);
    }
    entry.metadata.status = 'running';
  }

  /**
   * Process a single event across all running projections that handle its type.
   */
  async process(event: EventInterface): Promise<void> {
    for (const entry of this.projections.values()) {
      if (entry.metadata.status !== 'running') continue;
      if (
        entry.projection.eventTypes.includes(event.type) ||
        entry.projection.eventTypes.includes('*')
      ) {
        await this._applyEvent(entry, event);
      }
    }
  }

  async getStatus(projectionName: string): Promise<ProjectionMetadata> {
    return { ...this._get(projectionName).metadata };
  }

  async getAll(): Promise<ProjectionMetadata[]> {
    return Array.from(this.projections.values()).map(e => ({ ...e.metadata }));
  }

  async reset(projectionName: string): Promise<void> {
    const entry = this._get(projectionName);
    entry.state = entry.projection.initialize();
    entry.metadata.position = 0;
    entry.metadata.stats = { eventsProcessed: 0, eventsPerSecond: 0, averageProcessingTime: 0 };
    await entry.projection.reset();
  }

  /**
   * Get the current read-model state for a projection.
   */
  getState<T = any>(projectionName: string): T {
    return this._get(projectionName).state as T;
  }

  // ─── private ────────────────────────────────────────────────────────────

  private _get(name: string): ProjectionEntry {
    const entry = this.projections.get(name);
    if (!entry) throw new Error(`Projection '${name}' not registered`);
    return entry;
  }

  private async _applyEvent(entry: ProjectionEntry, event: EventInterface): Promise<void> {
    const start = Date.now();
    try {
      entry.state = entry.projection.project(event, entry.state);
      entry.metadata.position++;
      entry.metadata.lastUpdated = new Date();
      const elapsed = Date.now() - start;
      const stats = entry.metadata.stats;
      stats.eventsProcessed++;
      stats.averageProcessingTime =
        (stats.averageProcessingTime * (stats.eventsProcessed - 1) + elapsed) /
        stats.eventsProcessed;
    } catch (error) {
      entry.metadata.status = 'error';
      entry.metadata.error = {
        message: (error as Error).message,
        timestamp: new Date(),
        event
      };
    }
  }
}
