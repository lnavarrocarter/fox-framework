/**
 * Shared vector store types — mirrored from tsfox/core/agents/tools/vector-search.tool.ts
 * Kept here so each package has zero runtime deps on @foxframework/core.
 */

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

export interface IVectorSearchProvider {
  search(query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
  upsert?(id: string, text: string, metadata?: Record<string, unknown>): Promise<void>;
  delete?(id: string): Promise<void>;
}
