/**
 * @fileoverview Anthropic (Claude) model provider — native fetch, no SDK
 * @module @foxframework/model-anthropic
 *
 * Supports:
 *  - Messages API (claude-3-5-sonnet, claude-3-opus, …)
 *  - Streaming via Server-Sent Events
 *  - Tool use (function calling)
 */

import type {
  IModelProvider,
  ModelMessage,
  ModelOptions,
  ModelResponse,
  StreamChunk,
  ToolCall,
} from './types';

export interface AnthropicProviderConfig {
  /** Anthropic API key */
  apiKey: string;
  /** Model ID (default: 'claude-3-5-sonnet-20241022') */
  model?: string;
  /** Base URL (default: 'https://api.anthropic.com/v1') */
  baseUrl?: string;
  /** Anthropic API version header (default: '2023-06-01') */
  apiVersion?: string;
  /** Default request timeout ms (default: 60_000) */
  timeoutMs?: number;
}

export class AnthropicProvider implements IModelProvider {
  readonly name = 'anthropic';
  private readonly _config: Required<AnthropicProviderConfig>;

  constructor(config: AnthropicProviderConfig) {
    this._config = {
      model: 'claude-3-5-sonnet-20241022',
      baseUrl: 'https://api.anthropic.com/v1',
      apiVersion: '2023-06-01',
      timeoutMs: 60_000,
      ...config,
    };
  }

  async complete(messages: ModelMessage[], options: ModelOptions = {}): Promise<ModelResponse> {
    const { system, anthropicMessages } = this._splitMessages(messages);
    const body = this._buildBody(anthropicMessages, system, options, false);
    const res = await this._fetch('/messages', body);
    const json = await res.json() as any;
    return this._parseResponse(json);
  }

  async *stream(messages: ModelMessage[], options: ModelOptions = {}): AsyncIterable<StreamChunk> {
    const { system, anthropicMessages } = this._splitMessages(messages);
    const body = this._buildBody(anthropicMessages, system, options, true);
    const res = await this._fetch('/messages', body);

    if (!res.body) throw new Error('[AnthropicProvider] No response body for streaming');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let eventType = '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('event: ')) { eventType = trimmed.slice(7); continue; }
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(trimmed.slice(6)) as any;
          if (eventType === 'content_block_delta') {
            yield { delta: data.delta?.text ?? '', done: false };
          } else if (eventType === 'message_stop') {
            yield { delta: '', done: true };
          }
        } catch { /* skip */ }
      }
    }
    yield { delta: '', done: true };
  }

  // ── private helpers ─────────────────────────────────────────────────────────

  private _splitMessages(messages: ModelMessage[]) {
    const systemMessages = messages.filter(m => m.role === 'system');
    const system = systemMessages.map(m => m.content).join('\n');
    const anthropicMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content: m.role === 'tool'
          ? [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.content }]
          : m.content,
      }));
    return { system, anthropicMessages };
  }

  private _buildBody(
    messages: any[],
    system: string,
    options: ModelOptions,
    stream: boolean,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this._config.model,
      messages,
      max_tokens: options.maxTokens ?? 4096,
      stream,
    };
    if (system) body.system = system;
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.stopSequences?.length) body.stop_sequences = options.stopSequences;
    return body;
  }

  private async _fetch(path: string, body: Record<string, unknown>): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._config.timeoutMs);

    try {
      const res = await fetch(`${this._config.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this._config.apiKey,
          'anthropic-version': this._config.apiVersion,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`[AnthropicProvider] HTTP ${res.status}: ${err}`);
      }
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  private _parseResponse(json: any): ModelResponse {
    const content = json.content ?? [];
    const textBlock = content.find((b: any) => b.type === 'text');
    const toolUseBlocks = content.filter((b: any) => b.type === 'tool_use');

    const toolCalls: ToolCall[] | undefined = toolUseBlocks.length
      ? toolUseBlocks.map((b: any) => ({
          id: b.id,
          type: 'function' as const,
          function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
        }))
      : undefined;

    return {
      content: textBlock?.text ?? '',
      toolCalls,
      usage: json.usage
        ? {
            promptTokens: json.usage.input_tokens,
            completionTokens: json.usage.output_tokens,
            totalTokens: json.usage.input_tokens + json.usage.output_tokens,
          }
        : undefined,
      finishReason: json.stop_reason === 'end_turn'
        ? 'stop'
        : json.stop_reason === 'tool_use' ? 'tool_calls' : json.stop_reason,
    };
  }
}
