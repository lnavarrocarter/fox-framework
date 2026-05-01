/**
 * @fileoverview AgentTracer — wraps any IAgent and adds span-per-run + span-per-tool-call telemetry.
 *
 * Spans emitted:
 *  - `agent.run`           — one span for the full agent run
 *    attributes: agent.id, agent.name, input (truncated), run.id
 *    events: answer (truncated), stepCount, usage.*
 *  - `agent.tool_call`     — one child span per tool call step
 *    attributes: tool.name, tool.call_id, tool.arguments (truncated)
 */

import type {
  IAgent,
  AgentContext,
  AgentRunResult,
  AgentStatus,
  AgentStep,
} from '../interfaces/agent.interface';
import type { ITracer, ISpan } from './tracer.interface';
import { NoOpTracer } from './tracer.interface';

export interface AgentTracerOptions {
  /** Tracer to use (default: NoOpTracer) */
  tracer?: ITracer;
  /**
   * Max character length for string attributes before truncation (default: 256)
   */
  maxAttrLength?: number;
}

/**
 * AgentTracer — proxy that wraps an IAgent with tracing.
 *
 * @example
 * ```ts
 * const tracedAgent = new AgentTracer(myAgent, { tracer: myOtelTracer });
 * const result = await tracedAgent.run('What is 2+2?');
 * ```
 */
export class AgentTracer implements IAgent {
  private readonly tracer: ITracer;
  private readonly maxLen: number;

  constructor(
    private readonly inner: IAgent,
    opts: AgentTracerOptions = {},
  ) {
    this.tracer = opts.tracer ?? new NoOpTracer();
    this.maxLen = opts.maxAttrLength ?? 256;
  }

  get id(): string { return this.inner.id; }
  get name(): string { return this.inner.name; }
  get status(): AgentStatus { return this.inner.status; }

  abort(): void { this.inner.abort(); }

  async run(input: string, context?: Partial<AgentContext>): Promise<AgentRunResult> {
    const span = this.tracer.startSpan('agent.run', {
      attributes: {
        'agent.id': this.inner.id,
        'agent.name': this.inner.name,
        'agent.input': this.trunc(input),
      },
    });

    try {
      const result = await this.inner.run(input, context);

      // Record per-step tool call spans
      for (const step of result.steps) {
        this.traceStep(step);
      }

      span
        .setAttribute('run.id', result.runId)
        .setAttribute('run.status', result.status)
        .setAttribute('run.stepCount', result.steps.length)
        .setAttribute('run.answer', this.trunc(result.answer));

      if (result.usage) {
        span
          .setAttribute('llm.prompt_tokens', result.usage.promptTokens)
          .setAttribute('llm.completion_tokens', result.usage.completionTokens)
          .setAttribute('llm.total_tokens', result.usage.totalTokens);
      }

      if (result.status === 'failed') {
        span.setStatus('error', result.error ?? 'agent failed');
      } else {
        span.setStatus('ok');
      }

      return result;
    } catch (err: unknown) {
      span.recordException(err).setStatus('error', err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      span.end();
    }
  }

  private traceStep(step: AgentStep): void {
    if (step.type !== 'tool_call' || !step.toolCall) return;

    const span: ISpan = this.tracer.startSpan('agent.tool_call', {
      attributes: {
        'tool.name': step.toolCall.function.name,
        'tool.call_id': step.toolCall.id,
        'tool.arguments': this.trunc(step.toolCall.function.arguments),
        'agent.id': this.inner.id,
        'step.number': step.stepNumber,
      },
    });

    if (step.toolResult) {
      if (step.toolResult.error) {
        span.setStatus('error', step.toolResult.error);
      } else {
        span.setStatus('ok');
      }
    }

    span.end();
  }

  private trunc(value: string): string {
    return value.length > this.maxLen ? value.slice(0, this.maxLen) + '…' : value;
  }
}
