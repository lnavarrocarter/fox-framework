/**
 * @fileoverview Agent-specific error types
 * @module tsfox/core/agents
 */

export class AgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly agentId?: string,
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class MaxIterationsError extends AgentError {
  constructor(agentId: string, iterations: number) {
    super(
      `Agent "${agentId}" exceeded max iterations (${iterations})`,
      'MAX_ITERATIONS_EXCEEDED',
      agentId,
    );
    this.name = 'MaxIterationsError';
  }
}

export class ToolExecutionError extends AgentError {
  constructor(agentId: string, toolName: string, cause: unknown) {
    super(
      `Tool "${toolName}" failed in agent "${agentId}": ${cause instanceof Error ? cause.message : String(cause)}`,
      'TOOL_EXECUTION_FAILED',
      agentId,
    );
    this.name = 'ToolExecutionError';
  }
}

export class ModelError extends AgentError {
  constructor(agentId: string, cause: unknown) {
    super(
      `Model call failed in agent "${agentId}": ${cause instanceof Error ? cause.message : String(cause)}`,
      'MODEL_CALL_FAILED',
      agentId,
    );
    this.name = 'ModelError';
  }
}

export class AgentAbortedError extends AgentError {
  constructor(agentId: string) {
    super(`Agent "${agentId}" was aborted`, 'AGENT_ABORTED', agentId);
    this.name = 'AgentAbortedError';
  }
}

export class OrchestratorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'OrchestratorError';
  }
}
