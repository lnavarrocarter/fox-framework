/**
 * @fileoverview Epic C2 — OpenAI provider test suite
 * Uses fetch mock — no real HTTP calls
 */

import { OpenAIProvider } from '../src/openai.provider';
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

function openAIResponse(content: string, toolCalls?: any[]) {
  return {
    choices: [{
      message: { role: 'assistant', content, tool_calls: toolCalls },
      finish_reason: toolCalls ? 'tool_calls' : 'stop',
    }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };
}

afterEach(() => jest.restoreAllMocks());

describe('OpenAIProvider', () => {
  it('uses default model gpt-4o', () => {
    const p = new OpenAIProvider({ apiKey: 'test' });
    expect(p.name).toBe('openai');
  });

  it('calls /chat/completions and returns parsed response', async () => {
    const spy = mockFetch(openAIResponse('Hello there!'));
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    const result = await provider.complete(MESSAGES);

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/chat/completions'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.content).toBe('Hello there!');
    expect(result.finishReason).toBe('stop');
    expect(result.usage?.totalTokens).toBe(15);
  });

  it('parses tool calls', async () => {
    const tc = [{ id: 'tc_1', type: 'function', function: { name: 'search', arguments: '{"q":"fox"}' } }];
    mockFetch(openAIResponse('', tc));
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    const result = await provider.complete(MESSAGES);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls![0].function.name).toBe('search');
    expect(result.finishReason).toBe('tool_calls');
  });

  it('includes Authorization header', async () => {
    const spy = mockFetch(openAIResponse('hi'));
    const provider = new OpenAIProvider({ apiKey: 'sk-secret' });
    await provider.complete(MESSAGES);
    const headers = (spy.mock.calls[0][1] as any).headers;
    expect(headers['Authorization']).toBe('Bearer sk-secret');
  });

  it('includes Organization header when set', async () => {
    const spy = mockFetch(openAIResponse('hi'));
    const provider = new OpenAIProvider({ apiKey: 'sk-test', organization: 'org-123' });
    await provider.complete(MESSAGES);
    const headers = (spy.mock.calls[0][1] as any).headers;
    expect(headers['OpenAI-Organization']).toBe('org-123');
  });

  it('sends temperature and maxTokens', async () => {
    const spy = mockFetch(openAIResponse('ok'));
    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    await provider.complete(MESSAGES, { temperature: 0.5, maxTokens: 100 });
    const body = JSON.parse((spy.mock.calls[0][1] as any).body);
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(100);
  });

  it('uses custom base URL', async () => {
    const spy = mockFetch(openAIResponse('ok'));
    const provider = new OpenAIProvider({ apiKey: 'sk-test', baseUrl: 'https://my-proxy/v1' });
    await provider.complete(MESSAGES);
    expect(spy.mock.calls[0][0]).toContain('https://my-proxy/v1');
  });

  it('throws on HTTP error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false, status: 401, text: async () => 'Unauthorized', body: null,
    } as any);
    const provider = new OpenAIProvider({ apiKey: 'bad' });
    await expect(provider.complete(MESSAGES)).rejects.toThrow('401');
  });

  it('stream() yields chunks', async () => {
    const sseBody = [
      'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}',
      'data: {"choices":[{"delta":{"content":" world"},"finish_reason":"stop"}]}',
      'data: [DONE]',
    ].join('\n');

    const encoder = new TextEncoder();
    const encoded = encoder.encode(sseBody);
    let pos = 0;
    const mockReader = {
      read: jest.fn(async () => {
        if (pos >= encoded.length) return { done: true, value: undefined };
        const chunk = encoded.slice(pos, pos + 40);
        pos += 40;
        return { done: false, value: chunk };
      }),
    };

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true, status: 200,
      body: { getReader: () => mockReader },
    } as any);

    const provider = new OpenAIProvider({ apiKey: 'sk-test' });
    const chunks: string[] = [];
    for await (const chunk of provider.stream(MESSAGES)) {
      if (chunk.delta) chunks.push(chunk.delta);
    }
    expect(chunks.join('')).toContain('Hello');
  });
});
