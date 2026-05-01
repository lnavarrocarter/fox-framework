/**
 * @foxframework/vector-weaviate — unit tests
 * All HTTP calls are mocked via global.fetch.
 */

import { WeaviateProvider } from '../src/weaviate.provider';

const URL = 'https://my-cluster.weaviate.network';
const CLASS = 'Document';

function mockFetch(body: unknown, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  }) as unknown as typeof fetch;
}

function graphqlResponse(objects: unknown[]) {
  return { data: { Get: { [CLASS]: objects } } };
}

const embed = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

describe('WeaviateProvider', () => {
  afterEach(() => jest.clearAllMocks());

  it('throws if url is missing', () => {
    expect(() => new WeaviateProvider({ url: '', className: CLASS })).toThrow(/url/);
  });

  it('throws if className is missing', () => {
    expect(() => new WeaviateProvider({ url: URL, className: '' })).toThrow(/className/);
  });

  it('uses nearText when no embed fn is provided', async () => {
    mockFetch(graphqlResponse([]));
    const provider = new WeaviateProvider({ url: URL, className: CLASS });
    await provider.search('fox framework');

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toBe(`${URL}/v1/graphql`);
    const gql: string = JSON.parse(call[1].body).query;
    expect(gql).toContain('nearText');
    expect(gql).toContain('fox framework');
  });

  it('uses nearVector when embed fn is provided', async () => {
    mockFetch(graphqlResponse([]));
    const provider = new WeaviateProvider({ url: URL, className: CLASS, embed });
    await provider.search('test');

    const gql: string = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).query;
    expect(gql).toContain('nearVector');
  });

  it('maps objects to VectorSearchResult', async () => {
    mockFetch(
      graphqlResponse([
        { text: 'Fox Framework docs', _additional: { id: 'uuid-1', certainty: 0.92 } },
        { text: 'Agent tools', _additional: { id: 'uuid-2', certainty: 0.75 } },
      ]),
    );
    const provider = new WeaviateProvider({ url: URL, className: CLASS });
    const results = await provider.search('q');

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ id: 'uuid-1', score: 0.92, text: 'Fox Framework docs' });
    expect(results[1]).toMatchObject({ id: 'uuid-2', score: 0.75, text: 'Agent tools' });
  });

  it('uses distance when certainty is absent', async () => {
    mockFetch(
      graphqlResponse([
        { text: 'result', _additional: { id: 'id1', distance: 0.2 } },
      ]),
    );
    const provider = new WeaviateProvider({ url: URL, className: CLASS });
    const [result] = await provider.search('q');
    expect(result.score).toBeCloseTo(0.8);
  });

  it('sets Authorization header when apiKey is provided', async () => {
    mockFetch(graphqlResponse([]));
    const provider = new WeaviateProvider({ url: URL, className: CLASS, apiKey: 'secret' });
    await provider.search('q');
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer secret');
  });

  it('throws on GraphQL errors', async () => {
    mockFetch({ errors: [{ message: 'class not found' }] });
    const provider = new WeaviateProvider({ url: URL, className: CLASS });
    await expect(provider.search('q')).rejects.toThrow(/class not found/);
  });

  it('throws on non-2xx HTTP status', async () => {
    mockFetch({}, 500);
    const provider = new WeaviateProvider({ url: URL, className: CLASS });
    await expect(provider.search('q')).rejects.toThrow(/500/);
  });

  it('upserts an object (POST)', async () => {
    mockFetch({ id: 'new-id' }, 200);
    const provider = new WeaviateProvider({ url: URL, className: CLASS });
    await provider.upsert('id1', 'hello world', { source: 'test' });

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toBe(`${URL}/v1/objects`);
    const body = JSON.parse(call[1].body);
    expect(body.class).toBe(CLASS);
    expect(body.id).toBe('id1');
    expect(body.properties.text).toBe('hello world');
    expect(body.properties.source).toBe('test');
  });

  it('retries upsert with PUT on 409 conflict', async () => {
    // First call → 409, second call (PUT) → 200
    (global.fetch as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 409, text: jest.fn().mockResolvedValue('') })
      .mockResolvedValueOnce({ ok: true, status: 200, json: jest.fn().mockResolvedValue({}) });

    const provider = new WeaviateProvider({ url: URL, className: CLASS });
    await provider.upsert('id1', 'hello');

    expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(2);
    expect((global.fetch as jest.Mock).mock.calls[1][1].method).toBe('PUT');
  });

  it('deletes an object', async () => {
    mockFetch(null, 204);
    const provider = new WeaviateProvider({ url: URL, className: CLASS });
    await provider.delete('id1');

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toBe(`${URL}/v1/objects/${CLASS}/id1`);
    expect(call[1].method).toBe('DELETE');
  });
});
