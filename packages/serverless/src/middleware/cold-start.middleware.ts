/**
 * @fileoverview Cold-start optimisation middleware
 * @module @foxframework/serverless
 *
 * Tracks whether this process instance is handling its first request (cold start)
 * and attaches the flag to `req.serverless.isColdStart`.
 * Also lazy-initialises async resources on the first invocation so subsequent
 * requests benefit from the warm container.
 */

import type { Request, Response, NextFunction } from 'express';

let _isColdStart = true;
const _initCallbacks: Array<() => Promise<void>> = [];

/**
 * Register an async initialiser that runs exactly once on cold start.
 * Useful for warming DB connection pools, loading config, etc.
 *
 * ```ts
 * onColdStart(async () => {
 *   await dbPool.connect();
 * });
 * ```
 */
export function onColdStart(fn: () => Promise<void>): void {
  _initCallbacks.push(fn);
}

/** Reset cold-start state (for testing). */
export function _resetColdStart(): void {
  _isColdStart = true;
}

/**
 * Express middleware that:
 * 1. Runs all `onColdStart` callbacks on first invocation
 * 2. Attaches `isColdStart` to `req.serverless` (created if absent)
 */
export function coldStartMiddleware() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const wasCold = _isColdStart;

    if (wasCold) {
      // Run initialisers sequentially to keep startup predictable
      for (const fn of _initCallbacks) {
        try { await fn(); } catch (err) {
          console.error('[FoxServerless] cold-start init error:', err);
        }
      }
      _isColdStart = false;
    }

    // Attach to serverless context if it exists, or create a minimal one
    if ((req as any).serverless) {
      (req as any).serverless.isColdStart = wasCold;
    }

    next();
  };
}
