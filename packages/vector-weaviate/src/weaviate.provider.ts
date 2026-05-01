import type { IVectorSearchProvider, VectorSearchOptions, VectorSearchResult } from './types';

export interface WeaviateConfig {
  /** Weaviate instance URL, e.g. "https://my-cluster.weaviate.network" */
  url: string;
  /** Class/collection name to search in, e.g. "Document" */
  className: string;
  /** Optional API key (Weaviate Cloud) */
  apiKey?: string;
  /** Text property that holds the document content (default: "text") */
  textProperty?: string;
  /**
   * Optional embedding function for nearText + upsert.
   * If omitted, uses Weaviate's built-in vectorizer (nearText via concepts).
   */
  embed?: (text: string) => Promise<number[]>;
}

/**
 * Weaviate GraphQL returns properties at the TOP LEVEL of each object
 * alongside `_additional`. There is no nested `properties` wrapper.
 */
type WeaviateObject = Record<string, unknown> & {
  _additional?: { id: string; certainty?: number; distance?: number };
};

interface WeaviateGraphQLResponse {
  data?: {
    Get?: Record<string, WeaviateObject[]>;
  };
  errors?: Array<{ message: string }>;
}

/**
 * WeaviateProvider — implements IVectorSearchProvider against the Weaviate GraphQL API.
 *
 * Uses native `fetch` — no Weaviate SDK required.
 *
 * @example
 * ```ts
 * const provider = new WeaviateProvider({
 *   url: process.env.WEAVIATE_URL!,
 *   className: 'Document',
 *   apiKey: process.env.WEAVIATE_API_KEY,
 * });
 * const tool = createVectorSearchTool(provider);
 * ```
 */
export class WeaviateProvider implements IVectorSearchProvider {
  private readonly config: Required<Pick<WeaviateConfig, 'url' | 'className' | 'textProperty'>> &
    Omit<WeaviateConfig, 'url' | 'className' | 'textProperty'>;

  constructor(config: WeaviateConfig) {
    if (!config.url) throw new Error('WeaviateProvider: url is required');
    if (!config.className) throw new Error('WeaviateProvider: className is required');
    this.config = { ...config, textProperty: config.textProperty ?? 'text' };
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) h['Authorization'] = `Bearer ${this.config.apiKey}`;
    return h;
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const topK = options.topK ?? 10;
    const minScore = options.minScore ?? 0;
    const { className, textProperty } = this.config;

    // If embed fn is provided, use nearVector; otherwise use nearText (built-in vectorizer)
    let nearClause: string;
    if (this.config.embed) {
      const vector = await this.config.embed(query);
      nearClause = `nearVector: { vector: [${vector.join(',')}], certainty: ${minScore} }`;
    } else {
      nearClause = `nearText: { concepts: [${JSON.stringify(query)}], certainty: ${minScore} }`;
    }

    const whereClause =
      options.filter && Object.keys(options.filter).length > 0
        ? `, where: ${JSON.stringify(options.filter)}`
        : '';

    const gql = `{
      Get {
        ${className}(limit: ${topK}, ${nearClause}${whereClause}) {
          ${textProperty}
          _additional { id certainty distance }
        }
      }
    }`;

    const response = await fetch(`${this.config.url}/v1/graphql`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ query: gql }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`WeaviateProvider: search failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as WeaviateGraphQLResponse;
    if (data.errors?.length) {
      throw new Error(`WeaviateProvider: GraphQL error — ${data.errors[0].message}`);
    }

    const objects = data.data?.Get?.[className] ?? [];
    return objects.map((obj) => {
      const additional = obj._additional;
      const certainty = additional?.certainty ?? 1 - (additional?.distance ?? 0);
      const { _additional, [textProperty]: rawText, ...rest } = obj;
      return {
        id: additional?.id ?? '',
        score: certainty,
        text: (rawText as string) ?? '',
        metadata: rest as Record<string, unknown>,
      };
    });
  }

  async upsert(id: string, text: string, metadata: Record<string, unknown> = {}): Promise<void> {
    const { className, textProperty } = this.config;
    const properties: Record<string, unknown> = { ...metadata, [textProperty]: text };

    const body: Record<string, unknown> = {
      class: className,
      id,
      properties,
    };

    if (this.config.embed) {
      body.vector = await this.config.embed(text);
    }

    const response = await fetch(`${this.config.url}/v1/objects`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!response.ok && response.status !== 200) {
      // 409 = already exists → try PUT
      if (response.status === 409) {
        const put = await fetch(`${this.config.url}/v1/objects/${className}/${id}`, {
          method: 'PUT',
          headers: this.headers(),
          body: JSON.stringify(body),
        });
        if (!put.ok) {
          const err = await put.text();
          throw new Error(`WeaviateProvider: upsert (PUT) failed (${put.status}): ${err}`);
        }
        return;
      }
      const err = await response.text();
      throw new Error(`WeaviateProvider: upsert failed (${response.status}): ${err}`);
    }
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(
      `${this.config.url}/v1/objects/${this.config.className}/${id}`,
      { method: 'DELETE', headers: this.headers() },
    );
    if (!response.ok && response.status !== 204) {
      const err = await response.text();
      throw new Error(`WeaviateProvider: delete failed (${response.status}): ${err}`);
    }
  }
}
