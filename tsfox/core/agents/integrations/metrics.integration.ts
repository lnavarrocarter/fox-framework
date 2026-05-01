/**
 * @fileoverview Metrics integration for agents
 * @module tsfox/core/agents/integrations
 *
 * Provides:
 * - AgentMetrics: wraps an agent and collects per-agent runtime statistics
 *   (call count, success/failure count, latency histograms, token usage).
 * - AgentMetricsRegistry: global registry of all tracked agents.
 */

import type { IAgent, AgentRunResult } from '../interfaces/agent.interface';

export interface AgentMetricSnapshot {
  agentId: string;
  agentName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalTokensUsed: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  lastRunAt: Date | null;
}

/**
 * Wraps an agent and tracks runtime metrics.
 *
 * ```ts
 * const tracked = new AgentMetrics(myAgent);
 * await tracked.run('hello');
 * console.log(tracked.snapshot());
 * ```
 */
export class AgentMetrics implements IAgent {
  readonly id: string;
  readonly name: string;

  private _totalRuns = 0;
  private _successfulRuns = 0;
  private _failedRuns = 0;
  private _totalTokens = 0;
  private _latencies: number[] = [];
  private _lastRunAt: Date | null = null;

  constructor(private readonly _agent: IAgent) {
    this.id = _agent.id;
    this.name = _agent.name;
  }

  get status() { return this._agent.status; }
  abort() { return this._agent.abort(); }

  async run(input: string, context?: any): Promise<AgentRunResult> {
    const startedAt = Date.now();
    this._totalRuns++;

    try {
      const result = await this._agent.run(input, context);
      const latency = Date.now() - startedAt;

      this._successfulRuns++;
      this._lastRunAt = new Date();
      this._latencies.push(latency);
      this._totalTokens += result.usage?.totalTokens ?? 0;

      return result;
    } catch (err) {
      this._failedRuns++;
      this._lastRunAt = new Date();
      this._latencies.push(Date.now() - startedAt);
      throw err;
    }
  }

  snapshot(): AgentMetricSnapshot {
    return {
      agentId: this.id,
      agentName: this.name,
      totalRuns: this._totalRuns,
      successfulRuns: this._successfulRuns,
      failedRuns: this._failedRuns,
      totalTokensUsed: this._totalTokens,
      averageLatencyMs: this._avg(this._latencies),
      p95LatencyMs: this._p95(this._latencies),
      lastRunAt: this._lastRunAt,
    };
  }

  reset(): void {
    this._totalRuns = 0;
    this._successfulRuns = 0;
    this._failedRuns = 0;
    this._totalTokens = 0;
    this._latencies = [];
    this._lastRunAt = null;
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private _avg(arr: number[]): number {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private _p95(arr: number[]): number {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(idx, sorted.length - 1)];
  }
}

// ── AgentMetricsRegistry ──────────────────────────────────────────────────────

/**
 * Global registry for AgentMetrics instances.
 *
 * ```ts
 * const registry = new AgentMetricsRegistry();
 * const tracked = registry.register(myAgent);
 * // later:
 * registry.getAll().forEach(s => console.log(s));
 * ```
 */
export class AgentMetricsRegistry {
  private readonly _metrics = new Map<string, AgentMetrics>();

  register(agent: IAgent): AgentMetrics {
    const m = new AgentMetrics(agent);
    this._metrics.set(agent.id, m);
    return m;
  }

  get(agentId: string): AgentMetrics | undefined {
    return this._metrics.get(agentId);
  }

  getAll(): AgentMetricSnapshot[] {
    return [...this._metrics.values()].map(m => m.snapshot());
  }

  reset(agentId?: string): void {
    if (agentId) {
      this._metrics.get(agentId)?.reset();
    } else {
      this._metrics.forEach(m => m.reset());
    }
  }

  unregister(agentId: string): void {
    this._metrics.delete(agentId);
  }
}
