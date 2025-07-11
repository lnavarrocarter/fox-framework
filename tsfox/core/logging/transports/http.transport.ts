/**
 * @fileoverview HTTP transport for Fox Framework logging
 * @version 1.0.0
 * @since 2025-01-11
 */

import { ITransport, IFormatter, LogEntry, LogLevel } from '../interfaces';
import { JsonFormatter } from '../formatters';

export interface HttpTransportOptions {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  batchSize?: number;
  batchTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export class HttpTransport implements ITransport {
  name = 'http';
  private batch: LogEntry[] = [];
  private batchTimer?: NodeJS.Timeout;

  constructor(
    public level: LogLevel,
    private options: HttpTransportOptions,
    private formatter: IFormatter = new JsonFormatter()
  ) {
    this.options = {
      method: 'POST',
      batchSize: 10,
      batchTimeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options
    };
  }

  async log(entry: LogEntry): Promise<void> {
    this.batch.push(entry);

    // Send immediately if batch is full
    if (this.batch.length >= (this.options.batchSize || 10)) {
      await this.sendBatch();
      return;
    }

    // Set timer if not already set
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.sendBatch().catch(err => {
          console.error('HTTP transport batch send failed:', err);
        });
      }, this.options.batchTimeout || 5000);
    }
  }

  private async sendBatch(): Promise<void> {
    if (this.batch.length === 0) return;

    const entries = [...this.batch];
    this.batch = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    const payload = entries.map(entry => this.formatter.format(entry));
    
    await this.sendWithRetry(payload);
  }

  private async sendWithRetry(payload: string[], attempt = 1): Promise<void> {
    try {
      const body = JSON.stringify({
        logs: payload,
        timestamp: new Date().toISOString(),
        source: 'fox-framework'
      });

      const response = await fetch(this.options.url, {
        method: this.options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers
        },
        body
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const maxAttempts = this.options.retryAttempts || 3;
      
      if (attempt < maxAttempts) {
        const delay = (this.options.retryDelay || 1000) * attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendWithRetry(payload, attempt + 1);
      }
      
      // Final attempt failed, log error locally
      console.error(`HTTP transport failed after ${maxAttempts} attempts:`, error);
    }
  }

  async close(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    
    // Send any remaining logs
    await this.sendBatch();
  }
}
