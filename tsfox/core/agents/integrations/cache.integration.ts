/**
 * @fileoverview Cache integration for agents
 * @module tsfox/core/agents/integrations
 *
 * Provides:
 * - CachedAgent: wraps an agent and caches its responses by input hash.
 *   Cache key is SHA-256(agentId + normalised input).
 *   Falls back gracefully if the cache throws.
 */

import { createHash } from 'crypto';
import type { IAgent, AgentRunResult } from '../interfaces/agent.interface';

// ── Minimal cache interface (avoids hard dep on cache package) ────────────────

export interface IAgentCache {
  get(key: string): Promise<AgentRunResult | null>;
  set(key: string, value: AgentRunResult, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface CachedAgentOptions {
  /** Cache TTL in ms (default: 5 minutes) */
  ttlMs?: number;
  /**
   * Custom key builder.
   * Default: SHA-256(agentId + ':' + normalised input)
   */
  keyBuilder?: (agentId: string, input: string) => string;
  /** Whether to cache failed runs (status='failed'). Default: false */
  cacheFailures?: boolean;
}

/**
 * Wraps an agent with transparent response caching.
 *
 * ```ts
 * const cached = new CachedAgent(myAgent, redisCache, { ttlMs: 300_000 });
 * await cached.run('What is the capital of France?');  // cache miss → runs agent
 * await cached.run('What is the capital of France?');  // cache hit → instant
 * ```
 */
export class CachedAgent implements IAgent {
  readonly id: string;
  readonly name: string;
  private readonly _opts: Required<CachedAgentOptions>;

  constructor(
    private readonly _agent: IAgent,
    private readonly _cache: IAgentCache,
    options: CachedAgentOptions = {},
  ) {
    this.id = _agent.id;
    this.name = _agent.name;
    this._opts = {
      ttlMs: options.ttlMs ?? 5 * 60 * 1000,
      cacheFailures: options.cacheFailures ?? false,
      keyBuilder: options.keyBuilder ?? defaultKeyBuilder,
    };
  }

  get status() { return this._agent.status; }
  abort() { return this._agent.abort(); }

  async run(input: string, context?: any): Promise<AgentRunResult> {
    const key = this._opts.keyBuilder(this.id, input);

    // ── Cache read ─────────────────────────────────────────────────────────
    try {
      const cached = await this._cache.get(key);
      if (cached) return { ...cached, runId: context?.runId ?? cached.runId };
    } catch { /* cache unavailable — fall through to agent */ }

    // ── Agent run ──────────────────────────────────────────────────────────
    const result = await this._agent.run(input, context);

    // ── Cache write ────────────────────────────────────────────────────────
    if (result.status === 'completed' || this._opts.cacheFailures) {
      try {
        await this._cache.set(key, result, this._opts.ttlMs);
      } catch { /* cache write failure is non-fatal */ }
    }

    return result;
  }

  /** Invalidate the cache entry for the given input */
  async invalidate(input: string): Promise<void> {
    const key = this._opts.keyBuilder(this.id, input);
    await this._cache.delete(key);
  }

  /** Build the cache key for a given input (exposed for testing) */
  buildKey(input: string): string {
    return this._opts.keyBuilder(this.id, input);
  }
}

// ── In-memory cache (for testing / dev) ──────────────────────────────────────

interface CacheEntry {
  value: AgentRunResult;
  expiresAt: number;
}

export class InMemoryAgentCache implements IAgentCache {
  private readonly _store = new Map<string, CacheEntry>();

  async get(key: string): Promise<AgentRunResult | null> {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: AgentRunResult, ttlMs = 300_000): Promise<void> {
    this._store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async delete(key: string): Promise<void> {
    this._store.delete(key);
  }

  get size(): number { return this._store.size; }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function defaultKeyBuilder(agentId: string, input: string): string {
  return createHash('sha256')
    .update(`${agentId}:${input.trim().toLowerCase()}`)
    .digest('hex');
}
