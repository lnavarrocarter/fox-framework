/**
 * @fileoverview GCP Cloud Functions adapter — wraps an Express app as a GCP HTTP function
 * @module @foxframework/serverless
 *
 * GCP HTTP functions also receive a Node.js-compatible Request/Response pair, similar to
 * Vercel. The main difference is the context metadata available (GCP sets
 * `x-cloud-trace-context` and `function-execution-id`).
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { Application } from 'express';
import type {
  ServerlessAdapterOptions,
  ServerlessContext,
  GcpHandler,
  IServerlessAdapter,
} from '../interfaces/serverless.interface';

let _coldStart = true;

export class GcpAdapter implements IServerlessAdapter {
  readonly provider = 'gcp' as const;

  adapt(app: Application, options: ServerlessAdapterOptions = {}): GcpHandler {
    const log = options.logger ?? console;
    const logCold = options.logColdStart !== false;

    return async (req: IncomingMessage & { [k: string]: any }, res: ServerResponse): Promise<void> => {
      const isCold = _coldStart;
      if (isCold) {
        _coldStart = false;
        if (logCold) log.info('[FoxServerless/GCP] cold start');
      }

      // GCP sets these headers on HTTP triggers
      const requestId =
        String(req.headers['function-execution-id'] ?? req.headers['x-cloud-trace-context'] ?? '').split('/')[0];
      const functionName = String(process.env.K_SERVICE ?? process.env.FUNCTION_NAME ?? 'gcp-function');

      req.serverless = {
        provider: 'gcp',
        requestId,
        functionName,
        remainingTimeMs: undefined, // not exposed by GCP HTTP triggers
        rawEvent: req,
        rawContext: {},
        isColdStart: isCold,
      } satisfies ServerlessContext;

      await new Promise<void>((resolve, reject) => {
        res.on('finish', resolve);
        res.on('error', reject);
        app(req as any, res as any, (err?: any) => {
          if (err) reject(err);
        });
      });
    };
  }
}

/** Reset cold-start flag (test helper) */
export function _resetGcpColdStart(): void { _coldStart = true; }
