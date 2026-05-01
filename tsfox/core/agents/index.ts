/**
 * @fileoverview Public API for tsfox/core/agents
 * @module tsfox/core/agents
 */

export type {
  ModelMessage,
  ToolCall,
  ModelOptions,
  ModelResponse,
  StreamChunk,
  IModelProvider,
  ToolParameterSchema,
  ToolDefinition,
  ToolResult,
  ITool,
  MemoryEntry,
  IMemoryStore,
  AgentStatus,
  AgentContext,
  AgentStep,
  AgentRunResult,
  AgentConfig,
  IAgent,
  AgentDefinition,
  OrchestratorPlan,
  IOrchestrator,
} from './interfaces/agent.interface';

export {
  AgentError,
  MaxIterationsError,
  ToolExecutionError,
  ModelError,
  AgentAbortedError,
  OrchestratorError,
} from './errors/agent.errors';

export { InMemoryStore } from './base/memory.store';
export { BaseAgent } from './base/base.agent';
export { ReActAgent } from './react/react.agent';
export { Orchestrator } from './orchestrator/orchestrator';
export type { OrchestratorConfig } from './orchestrator/orchestrator';

// Integrations
export {
  AgentEventBus,
  AgentEventSubscriber,
  AGENT_EVENTS,
  AuthenticatedAgent,
  AgentRateLimit,
  AuthError,
  RateLimitError,
  CachedAgent,
  InMemoryAgentCache,
  AgentMetrics,
  AgentMetricsRegistry,
} from './integrations';
export type {
  IEventEmitter,
  IEventBus,
  AgentRunStartedPayload,
  AgentRunCompletedPayload,
  AgentRunFailedPayload,
  ITokenValidator,
  AuthenticatedAgentOptions,
  RateLimitOptions,
  IAgentCache,
  CachedAgentOptions,
  AgentMetricSnapshot,
} from './integrations';
