/**
 * @fileoverview File-based cache provider implementation
 * @module tsfox/core/cache/providers/file
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { 
  ICacheProvider, 
  FileConfig, 
  CacheMetrics, 
  CacheEntry,
  ProviderInfo 
} from '../interfaces';

/**
 * File-based cache provider
 * Stores cache entries as JSON files on disk
 */
export class FileCacheProvider implements ICacheProvider {
  readonly name = 'file';
  private connected = false;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRatio: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    totalKeys: 0,
    memoryUsage: 0,
    evictions: 0
  };

  constructor(private config: FileConfig) {}

  /**
   * Initialize file cache directory
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      await this.ensureDirectoryExists(this.config.directory);
      this.connected = true;
      console.log(`File cache initialized at ${this.config.directory}`);
    } catch (error) {
      throw new Error(`Failed to initialize file cache: ${(error as Error).message}`);
    }
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    this.connected = false;
    console.log('File cache disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get provider information
   */
  getInfo(): ProviderInfo {
    return {
      name: this.name,
      version: '1.0.0',
      connected: this.connected,
      uptime: Date.now() - (this.connected ? Date.now() : 0),
      memoryUsage: {
        used: 0,
        max: 0,
        percentage: 0
      }
    };
  }

  /**
   * Retrieve a value from file cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) {
      throw new Error('File cache provider not connected');
    }

    const start = process.hrtime.bigint();
    
    try {
      this.metrics.totalRequests++;

      const filePath = this.getFilePath(key);
      
      try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const entry: CacheEntry = JSON.parse(fileContent);
        
        if (this.isExpired(entry)) {
          // Delete expired file
          await this.deleteFile(filePath);
          this.metrics.misses++;
          return null;
        }

        this.metrics.hits++;
        return entry.value as T;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          this.metrics.misses++;
          return null;
        }
        throw error;
      }
    } finally {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6;
      this.updateAverageResponseTime(duration);
      this.updateHitRatio();
    }
  }

  /**
   * Store a value in file cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.connected) {
      throw new Error('File cache provider not connected');
    }

    const start = process.hrtime.bigint();
    
    try {
      const entry: CacheEntry = {
        value,
        createdAt: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now()
      };

      const filePath = this.getFilePath(key);
      await this.ensureDirectoryExists(dirname(filePath));
      
      let content = JSON.stringify(entry, null, 2);
      
      if (this.config.compression) {
        // In real implementation, you might use gzip compression here
        // content = await gzip(content);
      }

      await fs.writeFile(filePath, content, 'utf8');
    } finally {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6;
      this.updateAverageResponseTime(duration);
    }
  }

  /**
   * Delete a value from file cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('File cache provider not connected');
    }

    const start = process.hrtime.bigint();
    
    try {

      const filePath = this.getFilePath(key);
      
      try {
        await fs.unlink(filePath);
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return false;
        }
        throw error;
      }
    } finally {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6;
      this.updateAverageResponseTime(duration);
    }
  }

  /**
   * Clear all cached files
   */
  async clear(): Promise<void> {
    if (!this.connected) {
      throw new Error('File cache provider not connected');
    }

    const start = process.hrtime.bigint();
    
    try {

      await this.removeDirectory(this.config.directory);
      await this.ensureDirectoryExists(this.config.directory);
    } finally {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6;
      this.updateAverageResponseTime(duration);
    }
  }

  /**
   * Check if key exists in file cache
   */
  async exists(key: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('File cache provider not connected');
    }

    try {
      const filePath = this.getFilePath(key);
      await fs.access(filePath);
      
      // Check if file is expired
      const fileContent = await fs.readFile(filePath, 'utf8');
      const entry: CacheEntry = JSON.parse(fileContent);
      
      if (this.isExpired(entry)) {
        await this.deleteFile(filePath);
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    if (!this.connected) {
      throw new Error('File cache provider not connected');
    }

    try {
      const files = await this.getAllCacheFiles();
      const keys: string[] = [];
      
      for (const file of files) {
        try {
          // Extract key from filename (reverse of getFilePath logic)
          const keyWithHash = file.replace('.json', '');
          const lastUnderscoreIndex = keyWithHash.lastIndexOf('_');
          
          if (lastUnderscoreIndex === -1) continue; // Invalid file format
          
          const originalKey = keyWithHash.substring(0, lastUnderscoreIndex).replace(/_/g, ':');
          
          if (!pattern || this.simplePatternMatch(originalKey, pattern)) {
            // Verify file is not expired
            const filePath = join(this.config.directory, file);
            const fileContent = await fs.readFile(filePath, 'utf8');
            const entry: CacheEntry = JSON.parse(fileContent);
            
            if (!this.isExpired(entry)) {
              keys.push(originalKey);
            } else {
              // Clean up expired file
              await this.deleteFile(filePath);
            }
          }
        } catch (error) {
          // Skip invalid files
          continue;
        }
      }
      
      return keys;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      totalKeys: 0,
      memoryUsage: 0,
      evictions: 0
    };
  }

  /**
   * Flush all cached data
   */
  async flush(): Promise<void> {
    await this.clear();
  }

  /**
   * Clean up expired files
   */
  async cleanup(): Promise<number> {
    if (!this.connected) {
      return 0;
    }

    let deletedCount = 0;
    
    try {
      const files = await this.getAllCacheFiles();
      
      for (const file of files) {
        try {
          const filePath = join(this.config.directory, file);
          const fileContent = await fs.readFile(filePath, 'utf8');
          const entry: CacheEntry = JSON.parse(fileContent);
          
          if (this.isExpired(entry)) {
            await this.deleteFile(filePath);
            deletedCount++;
          }
        } catch (error) {
          // Skip invalid files
          continue;
        }
      }
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }

    return deletedCount;
  }

  // Private helper methods

  private getFilePath(key: string): string {
    // Create safe filename from key
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    const hash = this.simpleHash(key);
    return join(this.config.directory, `${safeKey}_${hash}.json`);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() > entry.createdAt + (entry.ttl * 1000);
  }

  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private async removeDirectory(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  }

  private async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist
    }
  }

  private async getAllCacheFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.directory);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      return [];
    }
  }

  private simplePatternMatch(str: string, pattern: string): boolean {
    // Simple pattern matching - supports * wildcard
    if (pattern === '*') return true;
    if (!pattern.includes('*')) return str === pattern;
    
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(str);
  }

  private updateAverageResponseTime(duration: number): void {
    const totalRequests = this.metrics.totalRequests;
    if (totalRequests === 0) {
      this.metrics.averageResponseTime = duration;
    } else {
      const currentAvg = this.metrics.averageResponseTime;
      this.metrics.averageResponseTime = ((currentAvg * (totalRequests - 1)) + duration) / totalRequests;
    }
  }

  private updateHitRatio(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRatio = this.metrics.hits / this.metrics.totalRequests;
    }
  }
}
