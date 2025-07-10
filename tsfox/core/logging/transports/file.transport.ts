/**
 * @fileoverview File transport for Fox Framework logging
 * @version 1.0.0
 * @since 2025-01-10
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { ITransport, LogEntry, LogLevel } from '../interfaces';

export interface FileTransportOptions {
  filename: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  rotateDaily?: boolean;
}

export class FileTransport implements ITransport {
  name = 'file';
  private writeQueue: LogEntry[] = [];
  private isWriting = false;

  constructor(
    public level: LogLevel,
    private options: FileTransportOptions
  ) {
    // Don't call ensureDirectoryExists here as it's async
    // Will be called in writeToFile when needed
  }

  async log(entry: LogEntry): Promise<void> {
    this.writeQueue.push(entry);
    
    if (!this.isWriting) {
      await this.flushQueue();
    }
  }

  private async flushQueue(): Promise<void> {
    if (this.writeQueue.length === 0 || this.isWriting) {
      return;
    }

    this.isWriting = true;

    try {
      const entries = [...this.writeQueue];
      this.writeQueue = [];

      const content = entries
        .map(entry => JSON.stringify(entry))
        .join('\n') + '\n';

      await this.writeToFile(content);
    } finally {
      this.isWriting = false;
      
      // Process any entries that were added while writing
      if (this.writeQueue.length > 0) {
        setImmediate(() => this.flushQueue());
      }
    }
  }

  private async writeToFile(content: string): Promise<void> {
    const filename = this.getCurrentFilename();
    
    // Ensure directory exists before writing
    await this.ensureDirectoryExists();
    
    // Check if rotation is needed
    if (await this.shouldRotate(filename)) {
      await this.rotateFile(filename);
    }

    await fs.appendFile(filename, content, 'utf8');
  }

  private getCurrentFilename(): string {
    if (this.options.rotateDaily) {
      const date = new Date().toISOString().split('T')[0];
      const ext = this.options.filename.split('.').pop();
      const base = this.options.filename.replace(`.${ext}`, '');
      return `${base}-${date}.${ext}`;
    }
    return this.options.filename;
  }

  private async shouldRotate(filename: string): Promise<boolean> {
    if (!this.options.maxSize) return false;

    try {
      const stats = await fs.stat(filename);
      return stats.size >= this.options.maxSize;
    } catch (error) {
      return false; // File doesn't exist
    }
  }

  private async rotateFile(filename: string): Promise<void> {
    const maxFiles = this.options.maxFiles || 5;
    
    // Rotate existing files
    for (let i = maxFiles - 1; i >= 1; i--) {
      const oldFile = `${filename}.${i}`;
      const newFile = `${filename}.${i + 1}`;
      
      try {
        await fs.rename(oldFile, newFile);
      } catch (error) {
        // File might not exist, continue
      }
    }

    // Move current file to .1
    try {
      await fs.rename(filename, `${filename}.1`);
    } catch (error) {
      // File might not exist, continue
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    const dir = dirname(this.options.filename);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  async close(): Promise<void> {
    await this.flushQueue();
  }
}
