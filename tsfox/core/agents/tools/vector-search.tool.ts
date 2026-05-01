import { ITool, AgentContext } from '../interfaces/agent.interface';

export interface IVectorSearchProvider {
  search(query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
  upsert?(id: string, text: string, metadata?: Record<string, unknown>): Promise<void>;
  delete?(id: string): Promise<void>;
}

export interface VectorSearchOptions {
  topK?: number;
  minScore?: number;
  filter?: Record<string, unknown>;
  namespace?: string;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  text: string;
  metadata?: Record<string, unknown>;
}

export function createVectorSearchTool(
  provider: IVectorSearchProvider,
  options: { label?: string; description?: string; defaultTopK?: number; defaultMinScore?: number } = {},
): ITool {
  const toolName = options.label ?? 'vector_search';
  const defaultTopK = options.defaultTopK ?? 5;
  const defaultMinScore = options.defaultMinScore ?? 0.0;

  return {
    definition: {
      name: toolName,
      description:
        options.description ??
        'Perform semantic similarity search over a vector store. ' +
          'Returns the most relevant documents based on meaning, not just keywords.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language query for semantic search' },
          top_k: { type: 'number', description: `Number of results to return (default: ${defaultTopK})` },
          min_score: { type: 'number', description: `Minimum similarity score 0.0–1.0 (default: ${defaultMinScore})` },
          filter: { type: 'object', description: 'Optional metadata filter' },
          namespace: { type: 'string', description: 'Optional namespace/collection to search in' },
        },
        required: ['query'],
      },
    },

    async execute(params: Record<string, unknown>, _ctx: AgentContext): Promise<string> {
      const query = params.query as string;
      const topK = (params.top_k as number) ?? defaultTopK;
      const minScore = (params.min_score as number) ?? defaultMinScore;
      const filter = params.filter as Record<string, unknown> | undefined;
      const namespace = params.namespace as string | undefined;

      const results = await provider.search(query, { topK, minScore, filter, namespace });

      if (results.length === 0) return `No results found for query: "${query}"`;

      const lines = results.map((r, i) => {
        const meta = r.metadata && Object.keys(r.metadata).length > 0
          ? ` [${Object.entries(r.metadata).map(([k, v]) => `${k}=${v}`).join(', ')}]`
          : '';
        return `${i + 1}. (score: ${r.score.toFixed(4)})${meta}\n   ${r.text}`;
      });

      return `Vector search results for "${query}" (${results.length} found):\n\n${lines.join('\n\n')}`;
    },
  };
}
