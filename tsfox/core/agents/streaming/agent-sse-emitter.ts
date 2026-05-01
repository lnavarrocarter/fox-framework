/**
 * @fileoverview AgentSseEmitter — converts AgentStep / AgentRunResult events into SSE.
 *
 * SSE event types emitted:
 *  - `step`        — one AgentStep (thought, tool_call, tool_result, final_answer)
 *  - `done`        — AgentRunResult summary (answer + usage + status)
 *  - `error`       — { message: string } when the run throws
 *  - `heartbeat`   — `{}` sent on a configurable interval to keep the connection alive
 */

import type { AgentRunResult, AgentStep, IAgent } from '../interfaces/agent.interface';
import { SseStream, type ServerResponseLike } from './sse-stream';

export interface AgentSseEmitterOptions {
  /** Heartbeat interval in ms. Set to 0 to disable (default: 15000) */
  heartbeatIntervalMs?: number;
}

/**
 * AgentSseEmitter — runs an `IAgent` and streams each step to the client over SSE.
 *
 * @example
 * ```ts
 * app.get('/agent/run', async (req, res) => {
 *   const emitter = new AgentSseEmitter(myAgent, res);
 *   await emitter.run(req.query.input as string);
 * });
 * ```
 */
export class AgentSseEmitter {
  private readonly sse: SseStream;
  private readonly opts: Required<AgentSseEmitterOptions>;

  constructor(
    private readonly agent: IAgent,
    res: ServerResponseLike,
    opts: AgentSseEmitterOptions = {},
  ) {
    this.sse = new SseStream(res);
    this.opts = {
      heartbeatIntervalMs: opts.heartbeatIntervalMs ?? 15_000,
    };
  }

  async run(input: string): Promise<AgentRunResult> {
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

    if (this.opts.heartbeatIntervalMs > 0) {
      heartbeatTimer = setInterval(() => {
        if (!this.sse.closed) this.sse.send({ event: 'heartbeat', data: {} });
      }, this.opts.heartbeatIntervalMs);
    }

    try {
      const result = await this.agent.run(input, {
        runId: `sse-${Date.now()}`,
        variables: {},
      });

      // Emit each step individually
      for (const step of result.steps) {
        this.emitStep(step);
      }

      // Emit final done event
      this.sse.send({
        event: 'done',
        data: {
          runId: result.runId,
          answer: result.answer,
          status: result.status,
          usage: result.usage,
          stepCount: result.steps.length,
        },
      });

      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.sse.send({ event: 'error', data: { message } });
      throw err;
    } finally {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      this.sse.close();
    }
  }

  private emitStep(step: AgentStep): void {
    this.sse.send({
      event: 'step',
      id: step.stepNumber,
      data: {
        stepNumber: step.stepNumber,
        type: step.type,
        content: step.content,
        toolCall: step.toolCall,
        toolResult: step.toolResult,
        timestamp: step.timestamp.toISOString(),
      },
    });
  }
}
