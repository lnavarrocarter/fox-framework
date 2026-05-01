/**
 * @fileoverview OpenAI model provider — native fetch, no SDK
 * @module @foxframework/model-openai
 *
 * Supports:
 *  - Chat completions (gpt-4o, gpt-4-turbo, gpt-3.5-turbo, …)
 *  - Streaming via Server-Sent Events
 *  - Function/tool calling
 *  - Configurable base URL (Azure OpenAI compatible)
 */

import type {
  IModelProvider,
  ModelMessage,
  ModelOptions,
  ModelResponse,
  StreamChunk,
  ToolCall,
} from './types';

export interface OpenAIProviderConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model ID (default: 'gpt-4o') */
  model?: string;
  /** Base URL (default: 'https://api.openai.com/v1') */
  baseUrl?: string;
  /** Organisation ID */
  organization?: string;
  /** Default request timeout ms (default: 30_000) */
  timeoutMs?: number;
}

export class OpenAIProvider implements IModelProvider {
  readonly name = 'openai';
  private readonly _config: Required<OpenAIProviderConfig>;

  constructor(config: OpenAIProviderConfig) {
    this._config = {
      model: 'gpt-4o',
      baseUrl: 'https://api.openai.com/v1',
      organization: '',
      timeoutMs: 30_000,
      ...config,
    };
  }

  async complete(messages: ModelMessage[], options: ModelOptions = {}): Promise<ModelResponse> {
    const body = this._buildBody(messages, options, false);
    const res = await this._fetch('/chat/completions', body, options);
    const json = await res.json() as any;
    return this._parseResponse(json);
  }

  async *stream(messages: ModelMessage[], options: ModelOptions = {}): AsyncIterable<StreamChunk> {
    const body = this._buildBody(messages, options, true);
    const res = await this._fetch('/chat/completions', body, options);

    if (!res.body) throw new Error('[OpenAIProvider] No response body for streaming');

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
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const chunk = JSON.parse(trimmed.slice(6)) as any;
          const delta = chunk.choices?.[0]?.delta;
          const finishReason = chunk.choices?.[0]?.finish_reason;
          yield {
            delta: delta?.content ?? '',
            done: finishReason === 'stop',
            toolCalls: delta?.tool_calls,
          };
        } catch { /* skip malformed SSE chunk */ }
      }
    }

    yield { delta: '', done: true };
  }

  // ── private helpers ─────────────────────────────────────────────────────────

  private _buildBody(messages: ModelMessage[], options: ModelOptions, stream: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this._config.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
        ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
      })),
      stream,
    };

    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens;
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.stopSequences?.length) body.stop = options.stopSequences;

    return body;
  }

  private async _fetch(path: string, body: Record<string, unknown>, _options: ModelOptions): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._config.timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this._config.apiKey}`,
    };
    if (this._config.organization) {
      headers['OpenAI-Organization'] = this._config.organization;
    }

    try {
      const res = await fetch(`${this._config.baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`[OpenAIProvider] HTTP ${res.status}: ${err}`);
      }
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  private _parseResponse(json: any): ModelResponse {
    const choice = json.choices?.[0];
    const message = choice?.message;
    const toolCalls: ToolCall[] | undefined = message?.tool_calls?.map((tc: any) => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.function.name, arguments: tc.function.arguments },
    }));

    return {
      content: message?.content ?? '',
      toolCalls: toolCalls?.length ? toolCalls : undefined,
      usage: json.usage
        ? {
            promptTokens: json.usage.prompt_tokens,
            completionTokens: json.usage.completion_tokens,
            totalTokens: json.usage.total_tokens,
          }
        : undefined,
      finishReason: choice?.finish_reason as ModelResponse['finishReason'],
    };
  }
}
