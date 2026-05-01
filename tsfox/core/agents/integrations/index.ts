/**
 * @fileoverview Public exports for agent integrations
 * @module tsfox/core/agents/integrations
 */

export {
  AgentEventBus,
  AgentEventSubscriber,
  AGENT_EVENTS,
} from './event.integration';
export type {
  IEventEmitter,
  IEventBus,
  AgentRunStartedPayload,
  AgentRunCompletedPayload,
  AgentRunFailedPayload,
  AgentToolCalledPayload,
} from './event.integration';

export {
  AuthenticatedAgent,
  AgentRateLimit,
  AuthError,
  RateLimitError,
} from './auth.integration';
export type {
  ITokenValidator,
  AuthenticatedAgentOptions,
  RateLimitOptions,
} from './auth.integration';

export {
  CachedAgent,
  InMemoryAgentCache,
} from './cache.integration';
export type {
  IAgentCache,
  CachedAgentOptions,
} from './cache.integration';

export {
  AgentMetrics,
  AgentMetricsRegistry,
} from './metrics.integration';
export type {
  AgentMetricSnapshot,
} from './metrics.integration';
