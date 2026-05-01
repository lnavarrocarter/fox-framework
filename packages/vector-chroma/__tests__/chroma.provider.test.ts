/**
 * @foxframework/vector-chroma — unit tests
 * All HTTP calls are mocked via global.fetch.
 */

import { ChromaProvider } from '../src/chroma.provider';

const BASE_URL = 'http://localhost:8000';
const COLLECTION = 'test-docs';
const COLLECTION_ID = 'col-uuid-123';
const API_BASE = `${BASE_URL}/api/v1/tenants/default_tenant/databases/default_database/collections`;

const embed = jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]);

function mockFetchSequence(responses: Array<{ body: unknown; status?: number }>) {
  (global.fetch as jest.Mock) = jest.fn();
  for (const r of responses) {
    const status = r.status ?? 200;
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: jest.fn().mockResolvedValue(r.body),
      text: jest.fn().mockResolvedValue(JSON.stringify(r.body)),
    });
  }
}

/** Helper: mock collection GET then an action */
function withCollection(actionResponse: unknown, actionStatus = 200) {
  mockFetchSequence([
    { body: { id: COLLECTION_ID, name: COLLECTION } },    // GET collection
    { body: actionResponse, status: actionStatus },        // actual action
  ]);
}

describe('ChromaProvider', () => {
  afterEach(() => jest.clearAllMocks());

  it('throws if url is missing', () => {
    expect(() => new ChromaProvider({ url: '', collection: COLLECTION })).toThrow(/url/);
  });

  it('throws if collection is missing', () => {
    expect(() => new ChromaProvider({ url: BASE_URL, collection: '' })).toThrow(/collection/);
  });

  it('throws on search without embed function', async () => {
    const provider = new ChromaProvider({ url: BASE_URL, collection: COLLECTION });
    await expect(provider.search('test')).rejects.toThrow(/embed function/);
  });

  it('resolves collection id on first call, caches on second', async () => {
    mockFetchSequence([
      { body: { id: COLLECTION_ID } },           // GET collection
      { body: queryResponse([]) },               // search 1
      { body: queryResponse([]) },               // search 2 (no GET this time)
    ]);
    const provider = new ChromaProvider({ url: BASE_URL, collection: COLLECTION, embed });
    await provider.search('a');
    await provider.search('b');
    // fetch was called 3 times total (1 resolve + 2 queries), not 4
    expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(3);
  });

  it('creates collection if not found (404)', async () => {
    mockFetchSequence([
      { body: { message: 'not found' }, status: 404 },    // GET → 404
      { body: { id: COLLECTION_ID }, status: 200 },        // POST create
      { body: queryResponse([]), status: 200 },            // query
    ]);
    const provider = new ChromaProvider({ url: BASE_URL, collection: COLLECTION, embed });
    await provider.search('q');

    const createCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(createCall[1].method).toBe('POST');
    expect(createCall[0]).toBe(API_BASE);
  });

  it('queries the correct endpoint', async () => {
    withCollection(queryResponse([]));
    const provider = new ChromaProvider({ url: BASE_URL, collection: COLLECTION, embed });
    await provider.search('hello', { topK: 3 });

    const queryCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(queryCall[0]).toBe(`${API_BASE}/${COLLECTION_ID}/query`);
    const body = JSON.parse(queryCall[1].body);
    expect(body.n_results).toBe(3);
    expect(body.query_embeddings[0]).toEqual([0.1, 0.2, 0.3]);
  });

  it('converts L2 distance to score and maps results', async () => {
    withCollection(queryResponse([
      { id: 'doc1', distance: 0.0, document: 'Perfect match', metadata: { src: 'wiki' } },
      { id: 'doc2', distance: 1.0, document: 'Distant match', metadata: null },
    ]));
    const provider = new ChromaProvider({ url: BASE_URL, collection: COLLECTION, embed });
    const results = await provider.search('q');

    expect(results[0]).toMatchObject({ id: 'doc1', text: 'Perfect match' });
    expect(results[0].score).toBeCloseTo(1.0);    // 1/(1+0)
    expect(results[0].metadata?.src).toBe('wiki');
    expect(results[1]).toMatchObject({ id: 'doc2', text: 'Distant match' });
    expect(results[1].score).toBeCloseTo(0.5);    // 1/(1+1)
  });

  it('filters by minScore', async () => {
    withCollection(queryResponse([
      { id: 'a', distance: 0.1, document: 'close' },
      { id: 'b', distance: 5.0, document: 'far' },
    ]));
    const provider = new ChromaProvider({ url: BASE_URL, collection: COLLECTION, embed });
    const results = await provider.search('q', { minScore: 0.5 });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('a');
  });

  it('passes where filter to query body', async () => {
    withCollection(queryResponse([]));
    const provider = new ChromaProvider({ url: BASE_URL, collection: COLLECTION, embed });
    await provider.search('q', { filter: { category: 'docs' } });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    expect(body.where).toEqual({ category: 'docs' });
  });

  it('throws on non-2xx query response', async () => {
    mockFetchSequence([
      { body: { id: COLLECTION_ID } },
      { body: { error: 'bad request' }, status: 400 },
    ]);
    const provider = new ChromaProvider({ url: BASE_URL, collection: COLLECTION, embed });
    await expect(provider.search('q')).rejects.toThrow(/400/);
  });

  it('upserts correctly', async () => {
    withCollection({});
    const provider = new ChromaProvider({ url: BASE_URL, collection: COLLECTION, embed });
    await provider.upsert('id1', 'hello world', { src: 'test' });

    const upsertCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(upsertCall[0]).toBe(`${API_BASE}/${COLLECTION_ID}/upsert`);
    const body = JSON.parse(upsertCall[1].body);
    expect(body.ids).toEqual(['id1']);
    expect(body.documents).toEqual(['hello world']);
    expect(body.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
    expect(body.metadatas[0].src).toBe('test');
  });

  it('deletes correctly', async () => {
    withCollection({});
    const provider = new ChromaProvider({ url: BASE_URL, collection: COLLECTION, embed });
    await provider.delete('id1');

    const deleteCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(deleteCall[0]).toBe(`${API_BASE}/${COLLECTION_ID}/delete`);
    expect(JSON.parse(deleteCall[1].body).ids).toEqual(['id1']);
  });
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function queryResponse(
  items: Array<{ id: string; distance: number; document: string; metadata?: Record<string, unknown> | null }>,
): { ids: string[][]; distances: number[][]; documents: Array<Array<string | null>>; metadatas: Array<Array<Record<string, unknown> | null>> } {
  return {
    ids: [items.map((i) => i.id)],
    distances: [items.map((i) => i.distance)],
    documents: [items.map((i) => i.document ?? null)],
    metadatas: [items.map((i) => i.metadata ?? null)],
  };
}
