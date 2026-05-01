/**
 * @fileoverview createAgentSseHandler — Express/Fox route factory for streaming agents.
 *
 * Returns a request handler that:
 *  1. Reads the `input` from the request (query param or JSON body)
 *  2. Runs the agent via AgentSseEmitter
 *  3. Streams SSE steps to the client
 *  4. Ends with a `done` or `error` event
 */

import type { IAgent } from '../interfaces/agent.interface';
import { AgentSseEmitter, type AgentSseEmitterOptions } from './agent-sse-emitter';
import type { ServerResponseLike } from './sse-stream';

/** Minimal Express-compatible Request */
export interface RequestLike {
  query?: Record<string, unknown>;
  body?: unknown;
}

/** Minimal Express-compatible Response (ServerResponseLike + status/json for errors) */
export interface ResponseLike extends ServerResponseLike {
  status?(code: number): this;
  json?(body: unknown): this;
}

export interface AgentSseHandlerOptions extends AgentSseEmitterOptions {
  /**
   * How to extract the user input from the request.
   * Default: first checks `req.query.input`, then `req.body.input`, then `req.body.message`.
   */
  getInput?: (req: RequestLike) => string | undefined;
  /**
   * Called when input is missing (default: sends 400 JSON error if possible, else closes SSE).
   */
  onMissingInput?: (req: RequestLike, res: ResponseLike) => void;
}

/**
 * createAgentSseHandler — factory that returns an Express/Fox request handler.
 *
 * @example
 * ```ts
 * // Express
 * app.get('/stream', createAgentSseHandler(myAgent));
 *
 * // With options
 * app.post('/stream', createAgentSseHandler(myAgent, {
 *   getInput: (req) => (req.body as any).question,
 *   heartbeatIntervalMs: 10_000,
 * }));
 * ```
 */
export function createAgentSseHandler(
  agent: IAgent,
  options: AgentSseHandlerOptions = {},
): (req: RequestLike, res: ResponseLike) => Promise<void> {
  const getInput =
    options.getInput ??
    ((req: RequestLike): string | undefined => {
      if (req.query?.input) return String(req.query.input);
      const body = req.body as Record<string, unknown> | undefined;
      if (body?.input) return String(body.input);
      if (body?.message) return String(body.message);
      return undefined;
    });

  const onMissingInput =
    options.onMissingInput ??
    ((req: RequestLike, res: ResponseLike): void => {
      if (!res.headersSent) {
        if (res.status && res.json) {
          res.status(400);
          res.json({ error: 'Missing input parameter' });
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.write(JSON.stringify({ error: 'Missing input parameter' }));
          res.end();
        }
      }
    });

  return async (req: RequestLike, res: ResponseLike): Promise<void> => {
    const input = getInput(req);
    if (!input) {
      onMissingInput(req, res);
      return;
    }

    const emitter = new AgentSseEmitter(agent, res, {
      heartbeatIntervalMs: options.heartbeatIntervalMs,
    });

    try {
      await emitter.run(input);
    } catch {
      // Error already sent as SSE `error` event; nothing more to do here.
    }
  };
}
