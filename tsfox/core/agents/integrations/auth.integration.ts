/**
 * @fileoverview Auth integration for agents
 * @module tsfox/core/agents/integrations
 *
 * Provides:
 * - AuthenticatedAgent: wraps an IAgent and validates a bearer token
 *   before each run. Throws AuthError if token is invalid.
 * - AgentRateLimit: simple per-userId rate limiter for agent runs.
 */

import type { IAgent, AgentRunResult } from '../interfaces/agent.interface';

// ── Minimal auth interface (avoids hard dep on auth package) ──────────────────

export interface ITokenValidator {
  /** Returns the userId if valid, throws on invalid/expired token */
  validate(token: string): Promise<{ userId: string; roles: string[] }>;
}

export class AuthError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// ── AuthenticatedAgent ────────────────────────────────────────────────────────

export interface AuthenticatedAgentOptions {
  /** Required roles — at least one must be present (default: none) */
  requiredRoles?: string[];
}

/**
 * Wraps an agent and requires a valid bearer token to be present in context.
 *
 * ```ts
 * const secure = new AuthenticatedAgent(myAgent, tokenValidator, { requiredRoles: ['admin'] });
 * await secure.run('hello', { variables: { token: 'Bearer eyJ...' } });
 * ```
 */
export class AuthenticatedAgent implements IAgent {
  readonly id: string;
  readonly name: string;

  constructor(
    private readonly _agent: IAgent,
    private readonly _validator: ITokenValidator,
    private readonly _options: AuthenticatedAgentOptions = {},
  ) {
    this.id = _agent.id;
    this.name = _agent.name;
  }

  get status() { return this._agent.status; }
  abort() { return this._agent.abort(); }

  async run(input: string, context?: any): Promise<AgentRunResult> {
    const token: string | undefined = context?.variables?.token;
    if (!token) {
      throw new AuthError('No token provided', 'MISSING_TOKEN');
    }

    const bearer = token.startsWith('Bearer ') ? token.slice(7) : token;
    const { userId, roles } = await this._validator.validate(bearer);

    if (this._options.requiredRoles?.length) {
      const hasRole = this._options.requiredRoles.some(r => roles.includes(r));
      if (!hasRole) {
        throw new AuthError(
          `User "${userId}" lacks required roles: ${this._options.requiredRoles.join(', ')}`,
          'INSUFFICIENT_ROLES',
        );
      }
    }

    return this._agent.run(input, {
      ...context,
      variables: { ...context?.variables, userId, roles },
    });
  }
}

// ── AgentRateLimit ────────────────────────────────────────────────────────────

export interface RateLimitOptions {
  /** Max requests allowed within the window (default: 10) */
  maxRequests?: number;
  /** Window duration in ms (default: 60_000 = 1 minute) */
  windowMs?: number;
}

export class RateLimitError extends Error {
  constructor(userId: string, limit: number) {
    super(`Rate limit exceeded for user "${userId}": max ${limit} requests per window`);
    this.name = 'RateLimitError';
  }
}

/**
 * Rate-limits agent runs per userId (read from context.variables.userId).
 *
 * ```ts
 * const limited = new AgentRateLimit(myAgent, { maxRequests: 5, windowMs: 60_000 });
 * ```
 */
export class AgentRateLimit implements IAgent {
  readonly id: string;
  readonly name: string;
  private readonly _windows = new Map<string, { count: number; resetAt: number }>();
  private readonly _opts: Required<RateLimitOptions>;

  constructor(
    private readonly _agent: IAgent,
    options: RateLimitOptions = {},
  ) {
    this.id = _agent.id;
    this.name = _agent.name;
    this._opts = {
      maxRequests: options.maxRequests ?? 10,
      windowMs: options.windowMs ?? 60_000,
    };
  }

  get status() { return this._agent.status; }
  abort() { return this._agent.abort(); }

  async run(input: string, context?: any): Promise<AgentRunResult> {
    const userId: string = context?.variables?.userId ?? 'anonymous';
    const now = Date.now();

    let window = this._windows.get(userId);
    if (!window || now >= window.resetAt) {
      window = { count: 0, resetAt: now + this._opts.windowMs };
      this._windows.set(userId, window);
    }

    if (window.count >= this._opts.maxRequests) {
      throw new RateLimitError(userId, this._opts.maxRequests);
    }

    window.count++;
    return this._agent.run(input, context);
  }

  /** Expose window state for testing */
  getWindowState(userId: string) {
    return this._windows.get(userId) ?? null;
  }
}
