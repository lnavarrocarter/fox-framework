/**
 * @fileoverview EventSystem integration for agents
 * @module tsfox/core/agents/integrations
 *
 * Provides:
 * - AgentEventBus: thin wrapper that publishes agent lifecycle events
 *   (run.started, run.completed, run.failed, tool.called, tool.result)
 *   into the Fox EventSystem so other parts of the application can react.
 * - AgentEventSubscriber: listens to EventSystem events and dispatches them
 *   to a registered agent as input (useful for event-driven agents).
 */

import type { AgentRunResult, AgentStep, IAgent } from '../interfaces/agent.interface';

// ── Minimal event interfaces (avoids hard dep on EventSystem types) ───────────

export interface IEventEmitter {
  emit(eventType: string, payload: unknown): void | Promise<void>;
}

export interface IEventBus {
  subscribe(eventType: string, handler: (event: any) => void | Promise<void>): { unsubscribe(): Promise<void> };
}

// ── Event payloads ────────────────────────────────────────────────────────────

export interface AgentRunStartedPayload {
  agentId: string;
  agentName: string;
  runId: string;
  input: string;
  timestamp: Date;
}

export interface AgentRunCompletedPayload {
  agentId: string;
  agentName: string;
  runId: string;
  answer: string;
  steps: AgentStep[];
  durationMs: number;
  timestamp: Date;
}

export interface AgentRunFailedPayload {
  agentId: string;
  agentName: string;
  runId: string;
  error: string;
  durationMs: number;
  timestamp: Date;
}

export interface AgentToolCalledPayload {
  agentId: string;
  runId: string;
  toolName: string;
  args: unknown;
  timestamp: Date;
}

// ── Event type constants ──────────────────────────────────────────────────────

export const AGENT_EVENTS = {
  RUN_STARTED:    'agent.run.started',
  RUN_COMPLETED:  'agent.run.completed',
  RUN_FAILED:     'agent.run.failed',
  TOOL_CALLED:    'agent.tool.called',
} as const;

// ── AgentEventBus ─────────────────────────────────────────────────────────────

/**
 * Wraps an IAgent and publishes lifecycle events to an IEventEmitter.
 *
 * ```ts
 * const tracked = new AgentEventBus(myAgent, eventEmitter);
 * await tracked.run('hello');
 * // EventSystem now received agent.run.started + agent.run.completed
 * ```
 */
export class AgentEventBus implements IAgent {
  readonly id: string;
  readonly name: string;

  constructor(
    private readonly _agent: IAgent,
    private readonly _emitter: IEventEmitter,
  ) {
    this.id = _agent.id;
    this.name = _agent.name;
  }

  get status() { return this._agent.status; }
  abort() { return this._agent.abort(); }

  async run(input: string, context?: any): Promise<AgentRunResult> {
    const startedAt = Date.now();
    const runId = context?.runId ?? `run_${Date.now()}`;

    await this._emitter.emit(AGENT_EVENTS.RUN_STARTED, {
      agentId: this.id,
      agentName: this.name,
      runId,
      input,
      timestamp: new Date(),
    } satisfies AgentRunStartedPayload);

    try {
      const result = await this._agent.run(input, context);
      const durationMs = Date.now() - startedAt;

      await this._emitter.emit(AGENT_EVENTS.RUN_COMPLETED, {
        agentId: this.id,
        agentName: this.name,
        runId: result.runId,
        answer: result.answer,
        steps: result.steps,
        durationMs,
        timestamp: new Date(),
      } satisfies AgentRunCompletedPayload);

      return result;
    } catch (err) {
      const durationMs = Date.now() - startedAt;

      await this._emitter.emit(AGENT_EVENTS.RUN_FAILED, {
        agentId: this.id,
        agentName: this.name,
        runId,
        error: err instanceof Error ? err.message : String(err),
        durationMs,
        timestamp: new Date(),
      } satisfies AgentRunFailedPayload);

      throw err;
    }
  }
}

/**
 * Subscribes to an EventSystem event and triggers an agent run for each event.
 *
 * ```ts
 * const sub = new AgentEventSubscriber(myAgent, eventBus);
 * sub.listen('order.created', event => JSON.stringify(event.payload));
 * ```
 */
export class AgentEventSubscriber {
  private _subscription: { unsubscribe(): Promise<void> } | null = null;

  constructor(
    private readonly _agent: IAgent,
    private readonly _bus: IEventBus,
  ) {}

  listen(
    eventType: string,
    inputMapper: (event: any) => string = e => JSON.stringify(e),
  ): void {
    this._subscription = this._bus.subscribe(eventType, async (event) => {
      const input = inputMapper(event);
      await this._agent.run(input);
    });
  }

  async stop(): Promise<void> {
    await this._subscription?.unsubscribe();
    this._subscription = null;
  }
}
