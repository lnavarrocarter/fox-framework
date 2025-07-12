/**
 * @fileoverview Plugin utilities implementation
 * @module tsfox/core/plugins/utils
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as crypto from 'crypto';
import { PluginUtils as IPluginUtils } from './interfaces';

/**
 * Plugin utilities implementation
 */
export class PluginUtils implements IPluginUtils {
  
  /**
   * Path utilities
   */
  public readonly path = {
    /**
     * Resolve path to absolute
     */
    resolve: (pluginPath: string): string => {
      return path.resolve(pluginPath);
    },

    /**
     * Join path segments
     */
    join: (...paths: string[]): string => {
      return path.join(...paths);
    },

    /**
     * Get directory name
     */
    dirname: (pluginPath: string): string => {
      return path.dirname(pluginPath);
    },

    /**
     * Get base name
     */
    basename: (pluginPath: string): string => {
      return path.basename(pluginPath);
    },

    /**
     * Get file extension
     */
    extname: (pluginPath: string): string => {
      return path.extname(pluginPath);
    },

    /**
     * Parse path into components
     */
    parse: (pluginPath: string) => {
      return path.parse(pluginPath);
    },

    /**
     * Check if path is absolute
     */
    isAbsolute: (pluginPath: string): boolean => {
      return path.isAbsolute(pluginPath);
    },

    /**
     * Get relative path
     */
    relative: (from: string, to: string): string => {
      return path.relative(from, to);
    }
  };

  /**
   * File system utilities
   */
  public readonly fs = {
    /**
     * Check if file/directory exists
     */
    exists: async (filePath: string): Promise<boolean> => {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Read file content
     */
    readFile: async (filePath: string): Promise<string> => {
      return await fs.readFile(filePath, 'utf-8');
    },

    /**
     * Write file content
     */
    writeFile: async (filePath: string, content: string): Promise<void> => {
      await fs.writeFile(filePath, content, 'utf-8');
    },

    /**
     * Create directory
     */
    mkdir: async (dirPath: string): Promise<void> => {
      await fs.mkdir(dirPath, { recursive: true });
    },

    /**
     * Read directory contents
     */
    readdir: async (dirPath: string): Promise<string[]> => {
      return await fs.readdir(dirPath);
    },

    /**
     * Get file/directory stats
     */
    stat: async (filePath: string): Promise<any> => {
      return await fs.stat(filePath);
    },

    /**
     * Copy file
     */
    copyFile: async (src: string, dest: string): Promise<void> => {
      await fs.copyFile(src, dest);
    },

    /**
     * Delete file
     */
    unlink: async (filePath: string): Promise<void> => {
      await fs.unlink(filePath);
    },

    /**
     * Remove directory
     */
    rmdir: async (dirPath: string): Promise<void> => {
      await fs.rmdir(dirPath, { recursive: true });
    },

    /**
     * Watch file/directory for changes
     */
    watch: (filePath: string, callback: (eventType: string, filename: string) => void) => {
      return fsSync.watch(filePath, (eventType: string, filename: string | null) => {
        if (filename) {
          callback(eventType, filename);
        }
      });
    },

    /**
     * Read JSON file
     */
    readJson: async (filePath: string): Promise<any> => {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    },

    /**
     * Write JSON file
     */
    writeJson: async (filePath: string, data: any): Promise<void> => {
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, content, 'utf-8');
    }
  };

  /**
   * HTTP utilities
   */
  public readonly http = {
    /**
     * Perform GET request
     */
    get: async (url: string): Promise<any> => {
      return this.httpRequest('GET', url);
    },

    /**
     * Perform POST request
     */
    post: async (url: string, data: any): Promise<any> => {
      return this.httpRequest('POST', url, data);
    },

    /**
     * Perform PUT request
     */
    put: async (url: string, data: any): Promise<any> => {
      return this.httpRequest('PUT', url, data);
    },

    /**
     * Perform DELETE request
     */
    delete: async (url: string): Promise<any> => {
      return this.httpRequest('DELETE', url);
    },

    /**
     * Download file
     */
    download: async (url: string, filePath: string): Promise<void> => {
      const response = await this.httpRequest('GET', url, undefined, { responseType: 'stream' });
      await this.streamToFile(response, filePath);
    },

    /**
     * Check if URL is reachable
     */
    ping: async (url: string): Promise<boolean> => {
      try {
        await this.httpRequest('HEAD', url);
        return true;
      } catch {
        return false;
      }
    }
  };

  /**
   * Validation utilities
   */
  public readonly validate = {
    /**
     * Validate data against schema
     */
    schema: (data: any, schema: any): boolean => {
      return this.validateSchema(data, schema);
    },

    /**
     * Validate semantic version
     */
    semver: (version: string): boolean => {
      const semverRegex = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9-]+)?(?:\+[a-zA-Z0-9-]+)?$/;
      return semverRegex.test(version);
    },

    /**
     * Validate email address
     */
    email: (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    /**
     * Validate URL
     */
    url: (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Validate JSON
     */
    json: (jsonString: string): boolean => {
      try {
        JSON.parse(jsonString);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Validate plugin name
     */
    pluginName: (name: string): boolean => {
      const nameRegex = /^[a-z0-9]([a-z0-9-_])*[a-z0-9]$/;
      return nameRegex.test(name) && name.length >= 2 && name.length <= 214;
    }
  };

  /**
   * Crypto utilities
   */
  public readonly crypto = {
    /**
     * Generate hash
     */
    hash: (data: string, algorithm: string = 'sha256'): string => {
      return crypto.createHash(algorithm).update(data).digest('hex');
    },

    /**
     * Generate UUID
     */
    uuid: (): string => {
      return crypto.randomUUID();
    },

    /**
     * Generate random string
     */
    randomString: (length: number = 16): string => {
      return crypto.randomBytes(length).toString('hex').slice(0, length);
    },

    /**
     * Generate random number
     */
    randomNumber: (min: number = 0, max: number = 100): number => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Encrypt data
     */
    encrypt: (data: string, key: string): string => {
      const cipher = crypto.createCipher('aes-256-cbc', key);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    },

    /**
     * Decrypt data
     */
    decrypt: (encryptedData: string, key: string): string => {
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    },

    /**
     * Generate HMAC
     */
    hmac: (data: string, key: string, algorithm: string = 'sha256'): string => {
      return crypto.createHmac(algorithm, key).update(data).digest('hex');
    }
  };

  /**
   * Additional utility methods
   */

  /**
   * Deep clone object
   */
  deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const cloned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }

    return obj;
  }

  /**
   * Merge objects deeply
   */
  deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.deepMerge(target[key] as any, source[key] as any);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge(target, ...sources);
  }

  /**
   * Debounce function
   */
  debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    }) as T;
  }

  /**
   * Throttle function
   */
  throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
    let inThrottle: boolean;
    
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  }

  /**
   * Retry function with exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delay?: number;
      backoff?: number;
      condition?: (error: Error) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = 2,
      condition = () => true
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts || !condition(lastError)) {
          throw lastError;
        }

        const waitTime = delay * Math.pow(backoff, attempt - 1);
        await this.sleep(waitTime);
      }
    }

    throw lastError!;
  }

  /**
   * Sleep for specified milliseconds
   */
  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Format duration to human readable format
   */
  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Parse query string
   */
  parseQuery(queryString: string): Record<string, string> {
    const params = new URLSearchParams(queryString);
    const result: Record<string, string> = {};
    
    for (const [key, value] of params) {
      result[key] = value;
    }
    
    return result;
  }

  /**
   * Stringify query parameters
   */
  stringifyQuery(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    
    return searchParams.toString();
  }

  /**
   * Get environment variable with default
   */
  getEnv(name: string, defaultValue?: string): string | undefined {
    return process.env[name] || defaultValue;
  }

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Check if running in test mode
   */
  isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Perform HTTP request
   */
  private async httpRequest(
    method: string, 
    url: string, 
    data?: any, 
    options?: any
  ): Promise<any> {
    // This would use a proper HTTP client like fetch or axios
    // For now, using a simplified Node.js implementation
    
    const https = require('https');
    const http = require('http');
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Fox-Framework-Plugin'
        } as Record<string, string>
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        const postData = JSON.stringify(data);
        (requestOptions.headers as Record<string, string>)['Content-Length'] = Buffer.byteLength(postData).toString();
      }

      const req = client.request(requestOptions, (res: any) => {
        let responseData = '';

        res.on('data', (chunk: any) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = responseData ? JSON.parse(responseData) : {};
            resolve(parsedData);
          } catch {
            resolve(responseData);
          }
        });
      });

      req.on('error', reject);

      if (data && (method === 'POST' || method === 'PUT')) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Stream response to file
   */
  private async streamToFile(response: any, filePath: string): Promise<void> {
    // This would properly stream the response to a file
    // Simplified implementation for now
    await this.fs.writeFile(filePath, JSON.stringify(response));
  }

  /**
   * Validate data against schema
   */
  private validateSchema(data: any, schema: any): boolean {
    // This would use a proper schema validation library like Joi or Ajv
    // For now, basic validation
    
    if (!schema || !schema.type) return true;
    
    switch (schema.type) {
      case 'string':
        return typeof data === 'string';
      case 'number':
        return typeof data === 'number';
      case 'boolean':
        return typeof data === 'boolean';
      case 'array':
        return Array.isArray(data);
      case 'object':
        return typeof data === 'object' && !Array.isArray(data) && data !== null;
      default:
        return true;
    }
  }

  /**
   * Check if value is object
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}
