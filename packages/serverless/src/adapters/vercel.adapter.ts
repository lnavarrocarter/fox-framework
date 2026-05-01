/**
 * @fileoverview Vercel serverless adapter — wraps an Express app as a Vercel handler
 * @module @foxframework/serverless
 *
 * Vercel functions receive a Node.js-compatible `IncomingMessage` and `ServerResponse`
 * directly, so this adapter is lighter than Lambda: we only need to enrich the request
 * with a `ServerlessContext` and pipe it through Express.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { Application } from 'express';
import type {
  ServerlessAdapterOptions,
  ServerlessContext,
  VercelHandler,
  IServerlessAdapter,
} from '../interfaces/serverless.interface';

let _coldStart = true;

export class VercelAdapter implements IServerlessAdapter {
  readonly provider = 'vercel' as const;

  adapt(app: Application, options: ServerlessAdapterOptions = {}): VercelHandler {
    const log = options.logger ?? console;
    const logCold = options.logColdStart !== false;

    return async (req: IncomingMessage & { [k: string]: any }, res: ServerResponse): Promise<void> => {
      const isCold = _coldStart;
      if (isCold) {
        _coldStart = false;
        if (logCold) log.info('[FoxServerless/Vercel] cold start');
      }

      // Vercel sets x-vercel-id and x-vercel-deployment-url headers
      const requestId = String(req.headers['x-vercel-id'] ?? req.headers['x-request-id'] ?? '');
      const functionName = String(req.headers['x-vercel-deployment-url'] ?? 'vercel-function');

      req.serverless = {
        provider: 'vercel',
        requestId,
        functionName,
        remainingTimeMs: undefined, // Vercel doesn't expose this
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
export function _resetVercelColdStart(): void { _coldStart = true; }
