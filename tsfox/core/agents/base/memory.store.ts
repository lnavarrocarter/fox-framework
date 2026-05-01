/**
 * @fileoverview In-memory memory store implementation
 * @module tsfox/core/agents
 */

import type { IMemoryStore, MemoryEntry } from '../interfaces/agent.interface';

export class InMemoryStore implements IMemoryStore {
  private _entries: MemoryEntry[] = [];
  private _idCounter = 0;

  async add(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): Promise<MemoryEntry> {
    const full: MemoryEntry = {
      ...entry,
      id: `mem_${++this._idCounter}`,
      createdAt: new Date(),
    };
    this._entries.push(full);
    return full;
  }

  /**
   * Naive keyword search — searches for all query words (case-insensitive) in content.
   * Sorted by number of matching words descending.
   */
  async search(query: string, limit = 5): Promise<MemoryEntry[]> {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return this._entries.slice(0, limit);

    const scored = this._entries.map(e => ({
      entry: e,
      score: words.filter(w => e.content.toLowerCase().includes(w)).length,
    }));

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.entry);
  }

  async getAll(): Promise<MemoryEntry[]> {
    return [...this._entries];
  }

  async clear(): Promise<void> {
    this._entries = [];
    this._idCounter = 0;
  }
}
