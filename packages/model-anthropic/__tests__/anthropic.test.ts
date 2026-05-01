/**
 * @fileoverview Epic C2 — Anthropic provider test suite
 */

import { AnthropicProvider } from '../src/anthropic.provider';
import type { ModelMessage } from '../src/types';

const MESSAGES: ModelMessage[] = [
  { role: 'system', content: 'You are helpful.' },
  { role: 'user', content: 'Hello' },
];

function mockFetch(body: unknown, status = 200) {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    body: null,
  } as any);
}

function anthropicResponse(text: string, toolUse?: any[]) {
  const content: any[] = [{ type: 'text', text }];
  if (toolUse) content.push(...toolUse);
  return {
    content,
    stop_reason: toolUse ? 'tool_use' : 'end_turn',
    usage: { input_tokens: 10, output_tokens: 5 },
  };
}

afterEach(() => jest.restoreAllMocks());

describe('AnthropicProvider', () => {
  it('uses default model', () => {
    const p = new AnthropicProvider({ apiKey: 'test' });
    expect(p.name).toBe('anthropic');
  });

  it('calls /messages and returns parsed response', async () => {
    const spy = mockFetch(anthropicResponse('Hi there!'));
    const provider = new AnthropicProvider({ apiKey: 'sk-ant-test' });
    const result = await provider.complete(MESSAGES);

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/messages'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.content).toBe('Hi there!');
    expect(result.finishReason).toBe('stop');
    expect(result.usage?.totalTokens).toBe(15);
  });

  it('sets x-api-key header', async () => {
    const spy = mockFetch(anthropicResponse('ok'));
    const provider = new AnthropicProvider({ apiKey: 'ant-secret' });
    await provider.complete(MESSAGES);
    const headers = (spy.mock.calls[0][1] as any).headers;
    expect(headers['x-api-key']).toBe('ant-secret');
  });

  it('sets anthropic-version header', async () => {
    const spy = mockFetch(anthropicResponse('ok'));
    const provider = new AnthropicProvider({ apiKey: 'k', apiVersion: '2024-01-01' });
    await provider.complete(MESSAGES);
    const headers = (spy.mock.calls[0][1] as any).headers;
    expect(headers['anthropic-version']).toBe('2024-01-01');
  });

  it('strips system messages from messages array and sends as system field', async () => {
    const spy = mockFetch(anthropicResponse('ok'));
    const provider = new AnthropicProvider({ apiKey: 'k' });
    await provider.complete(MESSAGES);
    const body = JSON.parse((spy.mock.calls[0][1] as any).body);
    expect(body.system).toBe('You are helpful.');
    expect(body.messages.every((m: any) => m.role !== 'system')).toBe(true);
  });

  it('parses tool_use blocks', async () => {
    const toolUse = [{ type: 'tool_use', id: 'tu_1', name: 'search', input: { q: 'fox' } }];
    mockFetch(anthropicResponse('', toolUse));
    const provider = new AnthropicProvider({ apiKey: 'k' });
    const result = await provider.complete(MESSAGES);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls![0].function.name).toBe('search');
    expect(result.finishReason).toBe('tool_calls');
  });

  it('sends temperature option', async () => {
    const spy = mockFetch(anthropicResponse('ok'));
    const provider = new AnthropicProvider({ apiKey: 'k' });
    await provider.complete(MESSAGES, { temperature: 0.3 });
    const body = JSON.parse((spy.mock.calls[0][1] as any).body);
    expect(body.temperature).toBe(0.3);
  });

  it('throws on HTTP error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false, status: 429, text: async () => 'Rate limit', body: null,
    } as any);
    const provider = new AnthropicProvider({ apiKey: 'k' });
    await expect(provider.complete(MESSAGES)).rejects.toThrow('429');
  });
});
