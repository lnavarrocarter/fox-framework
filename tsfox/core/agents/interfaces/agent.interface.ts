/**
 * @fileoverview Core interfaces for the Fox Agent system
 * @module tsfox/core/agents
 */

// ── Model / LLM layer ─────────────────────────────────────────────────────────

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** For role='tool': the tool call id this message is responding to */
  toolCallId?: string;
  /** For role='assistant': tool calls requested by the model */
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    /** JSON string */
    arguments: string;
  };
}

export interface ModelOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface ModelResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  toolCalls?: ToolCall[];
}

/** A language model provider (OpenAI, Anthropic, Ollama, …) */
export interface IModelProvider {
  readonly name: string;
  complete(messages: ModelMessage[], options?: ModelOptions): Promise<ModelResponse>;
  stream(messages: ModelMessage[], options?: ModelOptions): AsyncIterable<StreamChunk>;
}

// ── Tool layer ────────────────────────────────────────────────────────────────

export interface ToolParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: (string | number)[];
  items?: ToolParameterSchema;
  properties?: Record<string, ToolParameterSchema>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameterSchema>;
    required?: string[];
  };
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

export interface ITool {
  readonly definition: ToolDefinition;
  execute(args: Record<string, unknown>, context: AgentContext): Promise<unknown>;
}

// ── Memory layer ──────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface IMemoryStore {
  add(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): Promise<MemoryEntry>;
  search(query: string, limit?: number): Promise<MemoryEntry[]>;
  getAll(): Promise<MemoryEntry[]>;
  clear(): Promise<void>;
}

// ── Agent layer ───────────────────────────────────────────────────────────────

export type AgentStatus =
  | 'idle'
  | 'running'
  | 'waiting_for_tool'
  | 'waiting_for_input'
  | 'completed'
  | 'failed';

export interface AgentContext {
  /** Unique run identifier */
  runId: string;
  /** Parent agent (if this is a sub-agent in an orchestration) */
  parentAgentId?: string;
  /** Shared key-value store for passing data across steps */
  variables: Record<string, unknown>;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface AgentStep {
  stepNumber: number;
  type: 'thought' | 'tool_call' | 'tool_result' | 'final_answer';
  content: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  timestamp: Date;
}

export interface AgentRunResult {
  runId: string;
  answer: string;
  steps: AgentStep[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  status: 'completed' | 'failed';
  error?: string;
}

export interface AgentConfig {
  /** Agent display name */
  name: string;
  /** System prompt */
  systemPrompt: string;
  /** Available tools */
  tools?: ITool[];
  /** Memory store (optional) */
  memory?: IMemoryStore;
  /** Model options override */
  modelOptions?: ModelOptions;
  /** Max reasoning iterations (default: 10) */
  maxIterations?: number;
}

export interface IAgent {
  readonly id: string;
  readonly name: string;
  readonly status: AgentStatus;
  run(input: string, context?: Partial<AgentContext>): Promise<AgentRunResult>;
  abort(): void;
}

// ── Orchestrator layer ────────────────────────────────────────────────────────

export interface AgentDefinition {
  id: string;
  agent: IAgent;
  description: string;
}

export interface OrchestratorPlan {
  steps: Array<{
    agentId: string;
    input: string;
    dependsOn?: string[];
  }>;
}

export interface IOrchestrator {
  registerAgent(definition: AgentDefinition): void;
  unregisterAgent(id: string): void;
  run(goal: string, context?: Partial<AgentContext>): Promise<AgentRunResult>;
}
