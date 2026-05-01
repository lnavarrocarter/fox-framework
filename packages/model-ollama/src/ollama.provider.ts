/**
 * @fileoverview Ollama local model provider — native fetch, no SDK
 * @module @foxframework/model-ollama
 *
 * Supports:
 *  - /api/chat endpoint (llama3, mistral, codellama, …)
 *  - Streaming via newline-delimited JSON
 *  - Tool calling (for models that support it)
 *  - Keep-alive control
 */

import type {
  IModelProvider,
  ModelMessage,
  ModelOptions,
  ModelResponse,
  StreamChunk,
  ToolCall,
} from './types';

export interface OllamaProviderConfig {
  /** Model name (default: 'llama3') */
  model?: string;
  /** Ollama base URL (default: 'http://localhost:11434') */
  baseUrl?: string;
  /** Keep model loaded for N seconds after request (default: 300) */
  keepAlive?: number;
  /** Request timeout ms (default: 120_000) */
  timeoutMs?: number;
}

export class OllamaProvider implements IModelProvider {
  readonly name = 'ollama';
  private readonly _config: Required<OllamaProviderConfig>;

  constructor(config: OllamaProviderConfig = {}) {
    this._config = {
      model: 'llama3',
      baseUrl: 'http://localhost:11434',
      keepAlive: 300,
      timeoutMs: 120_000,
      ...config,
    };
  }

  async complete(messages: ModelMessage[], options: ModelOptions = {}): Promise<ModelResponse> {
    const body = this._buildBody(messages, options, false);
    const res = await this._fetch('/api/chat', body);
    const json = await res.json() as any;
    return this._parseResponse(json);
  }

  async *stream(messages: ModelMessage[], options: ModelOptions = {}): AsyncIterable<StreamChunk> {
    const body = this._buildBody(messages, options, true);
    const res = await this._fetch('/api/chat', body);

    if (!res.body) throw new Error('[OllamaProvider] No response body for streaming');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const chunk = JSON.parse(trimmed) as any;
          yield {
            delta: chunk.message?.content ?? '',
            done: chunk.done ?? false,
          };
        } catch { /* skip */ }
      }
    }

    yield { delta: '', done: true };
  }

  // ── private helpers ─────────────────────────────────────────────────────────

  private _buildBody(
    messages: ModelMessage[],
    options: ModelOptions,
    stream: boolean,
  ): Record<string, unknown> {
    const ollamaMessages = messages.map(m => ({
      role: m.role === 'tool' ? 'tool' : m.role,
      content: m.content,
      ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
    }));

    const body: Record<string, unknown> = {
      model: this._config.model,
      messages: ollamaMessages,
      stream,
      keep_alive: this._config.keepAlive,
    };

    const ollama_options: Record<string, unknown> = {};
    if (options.temperature !== undefined) ollama_options.temperature = options.temperature;
    if (options.topP !== undefined) ollama_options.top_p = options.topP;
    if (options.maxTokens !== undefined) ollama_options.num_predict = options.maxTokens;
    if (options.stopSequences?.length) ollama_options.stop = options.stopSequences;
    if (Object.keys(ollama_options).length) body.options = ollama_options;

    return body;
  }

  private async _fetch(path: string, body: Record<string, unknown>): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._config.timeoutMs);

    try {
      const res = await fetch(`${this._config.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`[OllamaProvider] HTTP ${res.status}: ${err}`);
      }
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  private _parseResponse(json: any): ModelResponse {
    const message = json.message;
    const toolCalls: ToolCall[] | undefined = message?.tool_calls?.length
      ? message.tool_calls.map((tc: any) => ({
          id: tc.id ?? `tc_${Date.now()}`,
          type: 'function' as const,
          function: {
            name: tc.function?.name ?? tc.name,
            arguments: typeof tc.function?.arguments === 'string'
              ? tc.function.arguments
              : JSON.stringify(tc.function?.arguments ?? {}),
          },
        }))
      : undefined;

    return {
      content: message?.content ?? '',
      toolCalls,
      usage: json.prompt_eval_count != null
        ? {
            promptTokens: json.prompt_eval_count,
            completionTokens: json.eval_count ?? 0,
            totalTokens: (json.prompt_eval_count ?? 0) + (json.eval_count ?? 0),
          }
        : undefined,
      finishReason: json.done ? 'stop' : undefined,
    };
  }
}
