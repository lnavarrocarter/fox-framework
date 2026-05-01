import type { IVectorSearchProvider, VectorSearchOptions, VectorSearchResult } from './types';

export interface ChromaConfig {
  /** ChromaDB server URL, e.g. "http://localhost:8000" */
  url: string;
  /** Collection name */
  collection: string;
  /** Optional tenant (default: "default_tenant") */
  tenant?: string;
  /** Optional database (default: "default_database") */
  database?: string;
  /** Optional API key / token for auth header */
  apiKey?: string;
  /**
   * Embedding function — required for search and upsert.
   * ChromaDB's REST API requires client-side embeddings when no server-side
   * embedding function is configured.
   */
  embed?: (texts: string[]) => Promise<number[][]>;
}

interface ChromaQueryResponse {
  ids: string[][];
  distances: number[][];
  metadatas: Array<Array<Record<string, unknown> | null>>;
  documents: Array<Array<string | null>>;
}

/**
 * ChromaProvider — implements IVectorSearchProvider against the ChromaDB REST API.
 *
 * Uses native `fetch` — no chromadb SDK required.
 *
 * @example
 * ```ts
 * const provider = new ChromaProvider({
 *   url: 'http://localhost:8000',
 *   collection: 'my-docs',
 *   embed: async (texts) => myEmbedBatch(texts),
 * });
 * const tool = createVectorSearchTool(provider);
 * ```
 */
export class ChromaProvider implements IVectorSearchProvider {
  private readonly config: ChromaConfig;
  private collectionId: string | null = null;

  constructor(config: ChromaConfig) {
    if (!config.url) throw new Error('ChromaProvider: url is required');
    if (!config.collection) throw new Error('ChromaProvider: collection is required');
    this.config = {
      tenant: 'default_tenant',
      database: 'default_database',
      ...config,
    };
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) h['Authorization'] = `Bearer ${this.config.apiKey}`;
    return h;
  }

  private apiBase(): string {
    const { url, tenant, database } = this.config;
    return `${url}/api/v1/tenants/${tenant}/databases/${database}/collections`;
  }

  /** Lazily resolve the collection UUID from its name */
  private async resolveCollectionId(): Promise<string> {
    if (this.collectionId) return this.collectionId;

    const response = await fetch(
      `${this.apiBase()}/${encodeURIComponent(this.config.collection)}`,
      { headers: this.headers() },
    );

    if (!response.ok) {
      // Attempt to create if not found
      if (response.status === 404) {
        const create = await fetch(this.apiBase(), {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ name: this.config.collection }),
        });
        if (!create.ok) {
          const err = await create.text();
          throw new Error(`ChromaProvider: failed to create collection (${create.status}): ${err}`);
        }
        const created = (await create.json()) as { id: string };
        this.collectionId = created.id;
        return this.collectionId;
      }
      const text = await response.text();
      throw new Error(`ChromaProvider: failed to get collection (${response.status}): ${text}`);
    }

    const col = (await response.json()) as { id: string };
    this.collectionId = col.id;
    return this.collectionId;
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    if (!this.config.embed) {
      throw new Error('ChromaProvider: embed function is required for search');
    }

    const topK = options.topK ?? 10;
    const minScore = options.minScore ?? 0;
    const collectionId = await this.resolveCollectionId();

    const [queryEmbedding] = await this.config.embed([query]);

    const body: Record<string, unknown> = {
      query_embeddings: [queryEmbedding],
      n_results: topK,
      include: ['documents', 'metadatas', 'distances'],
    };
    if (options.filter && Object.keys(options.filter).length > 0) {
      body.where = options.filter;
    }

    const response = await fetch(
      `${this.apiBase()}/${collectionId}/query`,
      { method: 'POST', headers: this.headers(), body: JSON.stringify(body) },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ChromaProvider: query failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as ChromaQueryResponse;
    const ids = data.ids[0] ?? [];
    const distances = data.distances[0] ?? [];
    const metadatas = data.metadatas[0] ?? [];
    const documents = data.documents[0] ?? [];

    return ids
      .map((id, i) => {
        // Chroma returns L2 distance; convert to cosine-like score: 1 / (1 + distance)
        const score = 1 / (1 + distances[i]);
        return {
          id,
          score,
          text: documents[i] ?? '',
          metadata: metadatas[i] ?? undefined,
        };
      })
      .filter((r) => r.score >= minScore);
  }

  async upsert(id: string, text: string, metadata: Record<string, unknown> = {}): Promise<void> {
    if (!this.config.embed) {
      throw new Error('ChromaProvider: embed function is required for upsert');
    }

    const collectionId = await this.resolveCollectionId();
    const [embedding] = await this.config.embed([text]);

    const body = {
      ids: [id],
      embeddings: [embedding],
      documents: [text],
      metadatas: [metadata],
    };

    const response = await fetch(
      `${this.apiBase()}/${collectionId}/upsert`,
      { method: 'POST', headers: this.headers(), body: JSON.stringify(body) },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`ChromaProvider: upsert failed (${response.status}): ${err}`);
    }
  }

  async delete(id: string): Promise<void> {
    const collectionId = await this.resolveCollectionId();

    const response = await fetch(
      `${this.apiBase()}/${collectionId}/delete`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ ids: [id] }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`ChromaProvider: delete failed (${response.status}): ${err}`);
    }
  }
}
