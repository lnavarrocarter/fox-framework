/**
 * @fileoverview Epic C2 — Ollama provider test suite
 */

import { OllamaProvider } from '../src/ollama.provider';
import type { ModelMessage } from '../src/types';

const MESSAGES: ModelMessage[] = [
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

function ollamaResponse(content: string, toolCalls?: any[]) {
  return {
    message: { role: 'assistant', content, tool_calls: toolCalls },
    done: true,
    prompt_eval_count: 8,
    eval_count: 4,
  };
}

afterEach(() => jest.restoreAllMocks());

describe('OllamaProvider', () => {
  it('uses default model llama3', () => {
    const p = new OllamaProvider();
    expect(p.name).toBe('ollama');
  });

  it('calls /api/chat and returns parsed response', async () => {
    const spy = mockFetch(ollamaResponse('Hi from Ollama!'));
    const provider = new OllamaProvider();
    const result = await provider.complete(MESSAGES);

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/api/chat'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.content).toBe('Hi from Ollama!');
    expect(result.finishReason).toBe('stop');
    expect(result.usage?.totalTokens).toBe(12);
  });

  it('sends model name in body', async () => {
    const spy = mockFetch(ollamaResponse('ok'));
    const provider = new OllamaProvider({ model: 'mistral' });
    await provider.complete(MESSAGES);
    const body = JSON.parse((spy.mock.calls[0][1] as any).body);
    expect(body.model).toBe('mistral');
  });

  it('sends temperature option as ollama options.temperature', async () => {
    const spy = mockFetch(ollamaResponse('ok'));
    const provider = new OllamaProvider();
    await provider.complete(MESSAGES, { temperature: 0.7 });
    const body = JSON.parse((spy.mock.calls[0][1] as any).body);
    expect(body.options?.temperature).toBe(0.7);
  });

  it('sends maxTokens as num_predict', async () => {
    const spy = mockFetch(ollamaResponse('ok'));
    const provider = new OllamaProvider();
    await provider.complete(MESSAGES, { maxTokens: 512 });
    const body = JSON.parse((spy.mock.calls[0][1] as any).body);
    expect(body.options?.num_predict).toBe(512);
  });

  it('uses custom base URL', async () => {
    const spy = mockFetch(ollamaResponse('ok'));
    const provider = new OllamaProvider({ baseUrl: 'http://gpu-server:11434' });
    await provider.complete(MESSAGES);
    expect(spy.mock.calls[0][0]).toContain('gpu-server:11434');
  });

  it('parses tool calls', async () => {
    const toolCalls = [{ id: 'tc_1', function: { name: 'calculator', arguments: '{"expr":"2+2"}' } }];
    mockFetch(ollamaResponse('', toolCalls));
    const provider = new OllamaProvider();
    const result = await provider.complete(MESSAGES);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls![0].function.name).toBe('calculator');
  });

  it('handles missing usage gracefully', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ message: { content: 'hi' }, done: true }),
      body: null,
    } as any);
    const provider = new OllamaProvider();
    const result = await provider.complete(MESSAGES);
    expect(result.usage).toBeUndefined();
  });

  it('throws on HTTP error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false, status: 500, text: async () => 'Server error', body: null,
    } as any);
    const provider = new OllamaProvider();
    await expect(provider.complete(MESSAGES)).rejects.toThrow('500');
  });

  it('stream() yields chunks', async () => {
    const ndjson = [
      JSON.stringify({ message: { content: 'chunk1' }, done: false }),
      JSON.stringify({ message: { content: ' chunk2' }, done: true }),
    ].join('\n');

    const encoder = new TextEncoder();
    const encoded = encoder.encode(ndjson);
    let pos = 0;
    const mockReader = {
      read: jest.fn(async () => {
        if (pos >= encoded.length) return { done: true, value: undefined };
        const chunk = encoded.slice(pos, pos + 30);
        pos += 30;
        return { done: false, value: chunk };
      }),
    };

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true, status: 200,
      body: { getReader: () => mockReader },
    } as any);

    const provider = new OllamaProvider();
    const chunks: string[] = [];
    for await (const c of provider.stream(MESSAGES)) {
      if (c.delta) chunks.push(c.delta);
    }
    expect(chunks.join('')).toContain('chunk1');
  });
});
