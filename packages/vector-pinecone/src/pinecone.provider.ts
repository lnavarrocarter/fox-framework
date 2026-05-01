import type { IVectorSearchProvider, VectorSearchOptions, VectorSearchResult } from './types';

export interface PineconeConfig {
  /** Pinecone API key */
  apiKey: string;
  /**
   * Full index host URL, e.g.
   * "https://my-index-abc123.svc.us-east1-gcp.pinecone.io"
   * Obtained from the Pinecone console after index creation.
   */
  indexHost: string;
  /**
   * Optional embedding function. If provided, `search` and `upsert` will use it
   * to convert text → vector automatically.
   * If omitted, you must pass `vector` directly (not yet exposed in this adapter).
   */
  embed?: (text: string) => Promise<number[]>;
}

interface PineconeMatch {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

interface PineconeQueryResponse {
  matches: PineconeMatch[];
}

interface PineconeUpsertVector {
  id: string;
  values: number[];
  metadata?: Record<string, unknown>;
}

/**
 * PineconeProvider — implements IVectorSearchProvider against the Pinecone REST API.
 *
 * Uses native `fetch` — no Pinecone SDK required.
 *
 * @example
 * ```ts
 * const provider = new PineconeProvider({
 *   apiKey: process.env.PINECONE_API_KEY!,
 *   indexHost: process.env.PINECONE_INDEX_HOST!,
 *   embed: (text) => myEmbeddingFn(text),
 * });
 * const tool = createVectorSearchTool(provider);
 * ```
 */
export class PineconeProvider implements IVectorSearchProvider {
  private readonly config: PineconeConfig;

  constructor(config: PineconeConfig) {
    if (!config.apiKey) throw new Error('PineconeProvider: apiKey is required');
    if (!config.indexHost) throw new Error('PineconeProvider: indexHost is required');
    this.config = config;
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    if (!this.config.embed) {
      throw new Error('PineconeProvider: embed function is required for search');
    }

    const vector = await this.config.embed(query);
    const topK = options.topK ?? 10;
    const namespace = options.namespace;

    const body: Record<string, unknown> = {
      vector,
      topK,
      includeMetadata: true,
    };
    if (namespace) body.namespace = namespace;
    if (options.filter) body.filter = options.filter;

    const response = await fetch(`${this.config.indexHost}/query`, {
      method: 'POST',
      headers: {
        'Api-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PineconeProvider: query failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as PineconeQueryResponse;
    const minScore = options.minScore ?? 0;

    return data.matches
      .filter((m) => m.score >= minScore)
      .map((m) => ({
        id: m.id,
        score: m.score,
        text: (m.metadata?.text as string) ?? m.id,
        metadata: m.metadata,
      }));
  }

  async upsert(id: string, text: string, metadata: Record<string, unknown> = {}): Promise<void> {
    if (!this.config.embed) {
      throw new Error('PineconeProvider: embed function is required for upsert');
    }

    const values = await this.config.embed(text);
    const vector: PineconeUpsertVector = { id, values, metadata: { ...metadata, text } };

    const response = await fetch(`${this.config.indexHost}/vectors/upsert`, {
      method: 'POST',
      headers: {
        'Api-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vectors: [vector] }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`PineconeProvider: upsert failed (${response.status}): ${err}`);
    }
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.config.indexHost}/vectors/delete`, {
      method: 'POST',
      headers: {
        'Api-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [id] }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`PineconeProvider: delete failed (${response.status}): ${err}`);
    }
  }
}
