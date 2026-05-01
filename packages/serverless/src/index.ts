/**
 * @fileoverview Public API for @foxframework/serverless
 * @module @foxframework/serverless
 */

export type {
  ServerlessProvider,
  ServerlessContext,
  ServerlessAdapterOptions,
  LambdaHandler,
  VercelHandler,
  GcpHandler,
  IServerlessAdapter,
} from './interfaces/serverless.interface';

export { LambdaAdapter, _resetLambdaColdStart } from './adapters/lambda.adapter';
export { VercelAdapter, _resetVercelColdStart } from './adapters/vercel.adapter';
export { GcpAdapter, _resetGcpColdStart } from './adapters/gcp.adapter';

export {
  coldStartMiddleware,
  onColdStart,
  _resetColdStart,
} from './middleware/cold-start.middleware';

// ── convenience factory ───────────────────────────────────────────────────────

import type { Application } from 'express';
import { LambdaAdapter } from './adapters/lambda.adapter';
import { VercelAdapter } from './adapters/vercel.adapter';
import { GcpAdapter } from './adapters/gcp.adapter';
import type { ServerlessAdapterOptions, ServerlessProvider, IServerlessAdapter } from './interfaces/serverless.interface';

/**
 * Create a serverless handler for the given provider.
 *
 * ```ts
 * import express from 'express';
 * import { createServerlessHandler } from '@foxframework/serverless';
 *
 * const app = express();
 * app.get('/hello', (_req, res) => res.json({ hello: 'world' }));
 *
 * export const handler = createServerlessHandler('aws-lambda', app);
 * ```
 */
export function createServerlessHandler(
  provider: ServerlessProvider,
  app: Application,
  options?: ServerlessAdapterOptions,
): ReturnType<IServerlessAdapter['adapt']> {
  switch (provider) {
    case 'aws-lambda': return new LambdaAdapter().adapt(app, options);
    case 'vercel':     return new VercelAdapter().adapt(app, options);
    case 'gcp':        return new GcpAdapter().adapt(app, options);
    default:
      throw new Error(`[FoxServerless] unknown provider: "${provider as string}"`);
  }
}
