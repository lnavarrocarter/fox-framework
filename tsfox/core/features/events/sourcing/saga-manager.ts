/**
 * @fileoverview SagaManager — orchestrates long-running processes via event choreography
 * @module tsfox/core/features/events/sourcing
 */

import { EventInterface } from '../interfaces/event.interface';
import {
  SagaInterface,
  SagaManagerInterface,
  SagaStats,
  SagaCommand
} from '../interfaces/sourcing.interface';

type SagaFactory = (id: string) => SagaInterface;

interface SagaEntry {
  saga: SagaInterface;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * In-memory SagaManager.
 *
 * Register saga factories by type, then call `handle(event)` after each
 * domain event. The manager decides which saga(s) should handle it based
 * on the saga's `type` field and event metadata.
 *
 * ```ts
 * const sm = new SagaManager();
 * sm.registerFactory('OrderShipping', id => new OrderShippingSaga(id));
 *
 * // Wired into EventSystem:
 * eventSystem.on('*', event => sm.handle(event));
 * ```
 */
export class SagaManager implements SagaManagerInterface {
  private sagas = new Map<string, SagaEntry>();
  private factories = new Map<string, SagaFactory>();
  private commandHandlers: Array<(commands: SagaCommand[]) => Promise<void>> = [];

  private _stats = {
    totalSagas: 0,
    completedSagas: 0,
    failedSagas: 0
  };

  /** Register a factory for a saga type */
  registerFactory(sagaType: string, factory: SagaFactory): void {
    this.factories.set(sagaType, factory);
  }

  /** Register a handler that receives commands produced by sagas */
  onCommands(handler: (commands: SagaCommand[]) => Promise<void>): void {
    this.commandHandlers.push(handler);
  }

  async start(sagaType: string, event: EventInterface): Promise<string> {
    const factory = this.factories.get(sagaType);
    if (!factory) throw new Error(`No factory registered for saga type: ${sagaType}`);

    const sagaId = `saga_${sagaType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const saga = factory(sagaId);

    this.sagas.set(sagaId, { saga, createdAt: new Date() });
    this._stats.totalSagas++;

    const commands = await saga.handle(event);
    await this._dispatchCommands(commands);

    return sagaId;
  }

  async handle(event: EventInterface): Promise<void> {
    const dispatches: Promise<void>[] = [];

    for (const [, entry] of this.sagas) {
      const { saga } = entry;
      if (saga.status !== 'running' && saga.status !== 'pending') continue;

      // Match by saga type embedded in event metadata or correlation
      const relatedSagaType = event.metadata?.sagaType as string | undefined;
      const relatedSagaId = event.metadata?.sagaId as string | undefined;

      // If the event targets a specific saga by id, only handle with that one
      if (relatedSagaId && relatedSagaId !== saga.id) continue;

      dispatches.push(
        saga.handle(event).then(commands => this._dispatchCommands(commands))
      );
    }

    await Promise.allSettled(dispatches);
  }

  async getSaga(sagaId: string): Promise<SagaInterface | null> {
    return this.sagas.get(sagaId)?.saga ?? null;
  }

  async complete(sagaId: string): Promise<void> {
    const entry = this.sagas.get(sagaId);
    if (!entry) return;
    entry.saga.complete();
    entry.completedAt = new Date();
    this._stats.completedSagas++;
  }

  async fail(sagaId: string, error: Error): Promise<void> {
    const entry = this.sagas.get(sagaId);
    if (!entry) return;
    entry.saga.fail(error);
    this._stats.failedSagas++;

    // Trigger compensation
    try {
      const compensationCommands = await entry.saga.compensate();
      await this._dispatchCommands(compensationCommands);
    } catch (compensationError) {
      console.error(`Compensation failed for saga ${sagaId}:`, compensationError);
    }
  }

  async getStats(): Promise<SagaStats> {
    const activeSagas = Array.from(this.sagas.values()).filter(
      e => e.saga.status === 'running' || e.saga.status === 'pending'
    ).length;

    const completedEntries = Array.from(this.sagas.values()).filter(e => e.completedAt);
    const avgTime =
      completedEntries.length > 0
        ? completedEntries.reduce(
            (sum, e) => sum + (e.completedAt!.getTime() - e.createdAt.getTime()),
            0
          ) / completedEntries.length
        : 0;

    const sagasByStatus: Record<string, number> = {};
    for (const { saga } of this.sagas.values()) {
      sagasByStatus[saga.status] = (sagasByStatus[saga.status] ?? 0) + 1;
    }

    return {
      totalSagas: this._stats.totalSagas,
      activeSagas,
      completedSagas: this._stats.completedSagas,
      failedSagas: this._stats.failedSagas,
      averageCompletionTime: avgTime,
      sagasByStatus
    };
  }

  // ─── private ────────────────────────────────────────────────────────────

  private async _dispatchCommands(commands: SagaCommand[]): Promise<void> {
    if (commands.length === 0) return;
    for (const handler of this.commandHandlers) {
      await handler(commands);
    }
  }
}
