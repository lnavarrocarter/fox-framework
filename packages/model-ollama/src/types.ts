/**
 * Re-export of agent interfaces used by model providers.
 * In a real installation these come from @foxframework/core.
 * We duplicate the minimal subset here to keep the package dependency-free.
 */

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
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
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  toolCalls?: ToolCall[];
}

export interface IModelProvider {
  readonly name: string;
  complete(messages: ModelMessage[], options?: ModelOptions): Promise<ModelResponse>;
  stream(messages: ModelMessage[], options?: ModelOptions): AsyncIterable<StreamChunk>;
}
