/**
 * @foxframework/vector-pinecone — unit tests
 * All HTTP calls are mocked via global.fetch.
 */

import { PineconeProvider } from '../src/pinecone.provider';

const INDEX_HOST = 'https://test-index.svc.us-east1-gcp.pinecone.io';
const API_KEY = 'test-api-key';

function mockFetch(body: unknown, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  }) as unknown as typeof fetch;
}

const embed = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

describe('PineconeProvider', () => {
  afterEach(() => jest.clearAllMocks());

  it('throws if apiKey is missing', () => {
    expect(() => new PineconeProvider({ apiKey: '', indexHost: INDEX_HOST })).toThrow(/apiKey/);
  });

  it('throws if indexHost is missing', () => {
    expect(() => new PineconeProvider({ apiKey: API_KEY, indexHost: '' })).toThrow(/indexHost/);
  });

  it('throws on search without embed function', async () => {
    const provider = new PineconeProvider({ apiKey: API_KEY, indexHost: INDEX_HOST });
    await expect(provider.search('test')).rejects.toThrow(/embed function/);
  });

  it('queries the correct endpoint with vector and topK', async () => {
    mockFetch({ matches: [] });
    const provider = new PineconeProvider({ apiKey: API_KEY, indexHost: INDEX_HOST, embed });
    await provider.search('hello', { topK: 5 });

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toBe(`${INDEX_HOST}/query`);
    const body = JSON.parse(call[1].body);
    expect(body.topK).toBe(5);
    expect(body.vector).toEqual([0.1, 0.2, 0.3]);
    expect(call[1].headers['Api-Key']).toBe(API_KEY);
  });

  it('maps matches to VectorSearchResult', async () => {
    mockFetch({
      matches: [
        { id: 'doc1', score: 0.95, metadata: { text: 'Fox Framework', source: 'wiki' } },
        { id: 'doc2', score: 0.80, metadata: { text: 'Agent tools' } },
      ],
    });
    const provider = new PineconeProvider({ apiKey: API_KEY, indexHost: INDEX_HOST, embed });
    const results = await provider.search('fox');

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ id: 'doc1', score: 0.95, text: 'Fox Framework' });
    expect(results[0].metadata?.source).toBe('wiki');
    expect(results[1]).toMatchObject({ id: 'doc2', score: 0.80, text: 'Agent tools' });
  });

  it('filters results below minScore', async () => {
    mockFetch({
      matches: [
        { id: 'a', score: 0.9, metadata: { text: 'high' } },
        { id: 'b', score: 0.5, metadata: { text: 'low' } },
      ],
    });
    const provider = new PineconeProvider({ apiKey: API_KEY, indexHost: INDEX_HOST, embed });
    const results = await provider.search('q', { minScore: 0.7 });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('a');
  });

  it('sends namespace and filter when provided', async () => {
    mockFetch({ matches: [] });
    const provider = new PineconeProvider({ apiKey: API_KEY, indexHost: INDEX_HOST, embed });
    await provider.search('q', { namespace: 'ns1', filter: { category: 'docs' } });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.namespace).toBe('ns1');
    expect(body.filter).toEqual({ category: 'docs' });
  });

  it('throws on non-2xx query response', async () => {
    mockFetch({ message: 'Unauthorized' }, 401);
    const provider = new PineconeProvider({ apiKey: API_KEY, indexHost: INDEX_HOST, embed });
    await expect(provider.search('q')).rejects.toThrow(/401/);
  });

  it('upserts a vector', async () => {
    mockFetch({ upsertedCount: 1 });
    const provider = new PineconeProvider({ apiKey: API_KEY, indexHost: INDEX_HOST, embed });
    await provider.upsert('doc1', 'hello world', { source: 'test' });

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toBe(`${INDEX_HOST}/vectors/upsert`);
    const body = JSON.parse(call[1].body);
    expect(body.vectors[0].id).toBe('doc1');
    expect(body.vectors[0].values).toEqual([0.1, 0.2, 0.3]);
    expect(body.vectors[0].metadata.text).toBe('hello world');
    expect(body.vectors[0].metadata.source).toBe('test');
  });

  it('deletes a vector', async () => {
    mockFetch({});
    const provider = new PineconeProvider({ apiKey: API_KEY, indexHost: INDEX_HOST, embed });
    await provider.delete('doc1');

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toBe(`${INDEX_HOST}/vectors/delete`);
    expect(JSON.parse(call[1].body).ids).toEqual(['doc1']);
  });
});
