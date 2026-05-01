/**
 * @fileoverview BaseAgent — abstract foundation for all Fox agents
 * @module tsfox/core/agents
 *
 * Provides:
 * - ID generation
 * - Status tracking
 * - AbortController integration
 * - Tool registry helpers
 * - Abstract `_execute()` hook for subclasses
 */

import { randomUUID } from 'crypto';
import type {
  IAgent,
  AgentConfig,
  AgentContext,
  AgentRunResult,
  AgentStatus,
  ITool,
  IModelProvider,
} from '../interfaces/agent.interface';
import { AgentAbortedError } from '../errors/agent.errors';

export abstract class BaseAgent implements IAgent {
  readonly id: string;
  readonly name: string;

  protected _status: AgentStatus = 'idle';
  protected _controller: AbortController | null = null;
  protected readonly _config: AgentConfig;
  protected readonly _model: IModelProvider;
  protected readonly _toolMap: Map<string, ITool>;

  constructor(model: IModelProvider, config: AgentConfig) {
    this.id = randomUUID();
    this.name = config.name;
    this._config = config;
    this._model = model;
    this._toolMap = new Map((config.tools ?? []).map(t => [t.definition.name, t]));
  }

  get status(): AgentStatus {
    return this._status;
  }

  abort(): void {
    this._controller?.abort();
  }

  async run(input: string, contextOverrides: Partial<AgentContext> = {}): Promise<AgentRunResult> {
    if (this._status === 'running') {
      throw new Error(`Agent "${this.id}" is already running`);
    }

    this._controller = new AbortController();
    this._status = 'running';

    const context: AgentContext = {
      runId: randomUUID(),
      variables: {},
      ...contextOverrides,
      signal: this._controller.signal,
    };

    try {
      const result = await this._execute(input, context);
      this._status = 'completed';
      return result;
    } catch (err) {
      this._status = 'failed';
      if (err instanceof AgentAbortedError) {
        return {
          runId: context.runId,
          answer: '',
          steps: [],
          status: 'failed',
          error: err.message,
        };
      }
      throw err;
    } finally {
      this._controller = null;
    }
  }

  /** Override in subclass to implement the agent's reasoning loop */
  protected abstract _execute(input: string, context: AgentContext): Promise<AgentRunResult>;

  /** Check abort and throw if aborted */
  protected _checkAbort(context: AgentContext): void {
    if (context.signal?.aborted) {
      throw new AgentAbortedError(this.id);
    }
  }

  /** Build tool definitions for the model */
  protected _toolDefinitions() {
    return [...this._toolMap.values()].map(t => t.definition);
  }
}
