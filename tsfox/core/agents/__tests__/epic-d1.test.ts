/**
 * Epic D1 — Agent Tools Library
 * Tests for: HttpTool, FilesystemTool, CalculatorTool, JsonPathTool, SqlQueryTool, VectorSearchTool
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

import { HttpTool } from '../tools/http.tool';
import { FilesystemTool, createFilesystemTool } from '../tools/filesystem.tool';
import { CalculatorTool } from '../tools/calculator.tool';
import { JsonPathTool } from '../tools/jsonpath.tool';
import { createSqlQueryTool, IQueryExecutor } from '../tools/sql-query.tool';
import {
  createVectorSearchTool,
  IVectorSearchProvider,
  VectorSearchResult,
} from '../tools/vector-search.tool';

// ─── HttpTool ─────────────────────────────────────────────────────────────────

describe('HttpTool', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetch(body: string, status = 200, contentType = 'application/json') {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: { get: () => contentType },
      text: async () => body,
    }) as unknown as typeof fetch;
  }

  it('has correct name and required parameter', () => {
    expect(HttpTool.definition.name).toBe('http');
    expect(HttpTool.definition.parameters.required).toContain('url');
  });

  it('makes a GET request and returns JSON response', async () => {
    mockFetch(JSON.stringify({ message: 'hello' }));
    const result = await HttpTool.execute({ url: 'https://api.example.com/test' }, {} as any);
    expect(result).toContain('"message"');
    expect(result).toContain('"hello"');
  });

  it('returns HTTP error status for non-2xx', async () => {
    mockFetch('Not Found', 404, 'text/plain');
    const result = await HttpTool.execute({ url: 'https://api.example.com/missing' }, {} as any);
    expect(result).toMatch(/HTTP 404/);
  });

  it('throws on invalid URL', async () => {
    await expect(HttpTool.execute({ url: 'ftp://invalid' }, {} as any)).rejects.toThrow(
      /invalid URL/,
    );
  });

  it('sends POST with body and sets Content-Type', async () => {
    mockFetch('{"ok":true}');
    await HttpTool.execute({
      url: 'https://api.example.com/data',
      method: 'POST',
      body: { key: 'value' },
    }, {} as any);
    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[1].method).toBe('POST');
    expect(call[1].headers['Content-Type']).toBe('application/json');
    expect(call[1].body).toBe('{"key":"value"}');
  });

  it('times out and throws AbortError-style error', async () => {
    global.fetch = jest.fn().mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        }, 10);
      });
    }) as unknown as typeof fetch;

    await expect(
      HttpTool.execute({ url: 'https://api.example.com/slow', timeout: 1 }, {} as any),
    ).rejects.toThrow(/timed out/);
  });

  it('returns plain text for non-JSON responses', async () => {
    mockFetch('<html>page</html>', 200, 'text/html');
    const result = await HttpTool.execute({ url: 'https://example.com' }, {} as any);
    expect(result).toContain('<html>');
  });
});

// ─── FilesystemTool ───────────────────────────────────────────────────────────

describe('FilesystemTool', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fox-fs-tool-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes and reads a file', async () => {
    const filePath = path.join(tmpDir, 'hello.txt');
    await FilesystemTool.execute({ operation: 'write', path: filePath, content: 'hello world' }, {} as any);
    const result = await FilesystemTool.execute({ operation: 'read', path: filePath }, {} as any);
    expect(result).toContain('hello world');
  });

  it('appends to a file', async () => {
    const filePath = path.join(tmpDir, 'append.txt');
    await FilesystemTool.execute({ operation: 'write', path: filePath, content: 'line1\n' }, {} as any);
    await FilesystemTool.execute({ operation: 'append', path: filePath, content: 'line2\n' }, {} as any);
    const result = await FilesystemTool.execute({ operation: 'read', path: filePath }, {} as any);
    expect(result).toContain('line1');
    expect(result).toContain('line2');
  });

  it('lists directory contents', async () => {
    fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'a');
    fs.writeFileSync(path.join(tmpDir, 'b.txt'), 'b');
    const result = await FilesystemTool.execute({ operation: 'list', path: tmpDir }, {} as any);
    expect(result).toContain('a.txt');
    expect(result).toContain('b.txt');
  });

  it('checks if file exists', async () => {
    const filePath = path.join(tmpDir, 'exists.txt');
    let result = await FilesystemTool.execute({ operation: 'exists', path: filePath }, {} as any);
    expect(result).toContain('not found');
    fs.writeFileSync(filePath, 'x');
    result = await FilesystemTool.execute({ operation: 'exists', path: filePath }, {} as any);
    expect(result).toContain('file');
  });

  it('deletes a file', async () => {
    const filePath = path.join(tmpDir, 'del.txt');
    fs.writeFileSync(filePath, 'bye');
    await FilesystemTool.execute({ operation: 'delete', path: filePath }, {} as any);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('creates a directory', async () => {
    const dirPath = path.join(tmpDir, 'nested', 'dir');
    await FilesystemTool.execute({ operation: 'mkdir', path: dirPath }, {} as any);
    expect(fs.existsSync(dirPath)).toBe(true);
  });

  it('enforces allowedBase restriction', async () => {
    const restricted = createFilesystemTool({ allowedBase: tmpDir });
    await expect(
      restricted.execute({ operation: 'read', path: '/etc/passwd' }, {} as any),
    ).rejects.toThrow(/outside allowed base/);
  });

  it('throws when reading non-existent file', async () => {
    await expect(
      FilesystemTool.execute({ operation: 'read', path: path.join(tmpDir, 'nope.txt') }, {} as any),
    ).rejects.toThrow(/not found/);
  });
});

// ─── CalculatorTool ───────────────────────────────────────────────────────────

describe('CalculatorTool', () => {
  async function calc(expression: string): Promise<string> {
    return CalculatorTool.execute({ expression }, {} as any) as Promise<string>;
  }

  it('evaluates basic arithmetic', async () => {
    expect(await calc('2 + 3')).toBe('2 + 3 = 5');
    expect(await calc('10 - 4')).toBe('10 - 4 = 6');
    expect(await calc('3 * 7')).toBe('3 * 7 = 21');
    expect(await calc('15 / 4')).toBe('15 / 4 = 3.75');
  });

  it('evaluates exponentiation', async () => {
    expect(await calc('2 ** 8')).toBe('2 ** 8 = 256');
    expect(await calc('3 ** 3')).toBe('3 ** 3 = 27');
  });

  it('evaluates modulo', async () => {
    expect(await calc('17 % 5')).toBe('17 % 5 = 2');
  });

  it('handles parentheses and operator precedence', async () => {
    expect(await calc('(2 + 3) * 4')).toBe('(2 + 3) * 4 = 20');
    expect(await calc('2 + 3 * 4')).toBe('2 + 3 * 4 = 14');
  });

  it('handles math functions', async () => {
    const r = await calc('sqrt(144)');
    expect(r).toBe('sqrt(144) = 12');
    const r2 = await calc('abs(-42)');
    expect(r2).toBe('abs(-42) = 42');
  });

  it('handles math constants', async () => {
    const r = await calc('PI');
    expect(r).toContain('3.14159');
  });

  it('handles negative numbers', async () => {
    expect(await calc('-5 + 3')).toBe('-5 + 3 = -2');
  });

  it('throws on division by zero', async () => {
    await expect(calc('10 / 0')).rejects.toThrow(/division by zero/);
  });

  it('throws on unknown identifiers', async () => {
    await expect(calc('foo + 1')).rejects.toThrow(/unknown identifier/);
  });

  it('handles chained exponentiation (right-assoc)', async () => {
    // 2**3**2 = 2**(3**2) = 2**9 = 512
    const r = await calc('2 ** 3 ** 2');
    expect(r).toBe('2 ** 3 ** 2 = 512');
  });
});

// ─── JsonPathTool ─────────────────────────────────────────────────────────────

describe('JsonPathTool', () => {
  const sample = JSON.stringify({
    users: [
      { name: 'Alice', age: 30, roles: ['admin', 'user'] },
      { name: 'Bob', age: 25, roles: ['user'] },
    ],
    meta: { total: 2, page: 1 },
  });

  async function query(json: string, path: string, operation?: string): Promise<string> {
    return JsonPathTool.execute({ json, path, operation }, {} as any) as Promise<string>;
  }

  it('gets a nested field', async () => {
    const result = await query(sample, '.meta.total');
    expect(result).toBe('2');
  });

  it('gets an array element', async () => {
    const result = await query(sample, '.users[0].name');
    expect(result).toBe('"Alice"');
  });

  it('gets all values with .*', async () => {
    const result = await query(sample, '.meta.*');
    expect(result).toContain('2');
    expect(result).toContain('1');
  });

  it('counts array elements', async () => {
    const result = await query(sample, '.users', 'count');
    expect(result).toBe('2');
  });

  it('lists keys of an object', async () => {
    const result = await query(sample, '.meta', 'keys');
    expect(result).toContain('total');
    expect(result).toContain('page');
  });

  it('flattens nested arrays', async () => {
    const json = JSON.stringify([[1, 2], [3, [4, 5]]]);
    const result = await query(json, '.', 'flatten');
    const parsed = JSON.parse(result);
    expect(parsed).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns root with "." path', async () => {
    const result = await query('{"a":1}', '.');
    expect(JSON.parse(result)).toEqual({ a: 1 });
  });

  it('throws on invalid JSON', async () => {
    await expect(query('not json', '.')).rejects.toThrow(/invalid JSON/);
  });
});

// ─── SqlQueryTool ─────────────────────────────────────────────────────────────

describe('SqlQueryTool', () => {
  function makeExecutor(rows: unknown[], rowCount?: number): IQueryExecutor {
    return {
      query: jest.fn().mockResolvedValue({ rows, rowCount: rowCount ?? rows.length }),
    };
  }

  it('returns a markdown table for SELECT results', async () => {
    const executor = makeExecutor([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    const tool = createSqlQueryTool(executor);
    const result = await tool.execute({ sql: 'SELECT * FROM users' }, {} as any);
    expect(result).toContain('| id | name |');
    expect(result).toContain('| 1 | Alice |');
    expect(result).toContain('| 2 | Bob |');
  });

  it('returns "0 rows" message for empty results', async () => {
    const executor = makeExecutor([]);
    const tool = createSqlQueryTool(executor);
    const result = await tool.execute({ sql: 'SELECT * FROM empty' }, {} as any);
    expect(result).toContain('0 rows');
  });

  it('blocks mutation statements by default', async () => {
    const executor = makeExecutor([]);
    const tool = createSqlQueryTool(executor);
    await expect(
      tool.execute({ sql: 'DELETE FROM users WHERE id = 1' }, {} as any),
    ).rejects.toThrow(/mutation statements are not allowed/);
  });

  it('allows mutations when configured', async () => {
    const executor = makeExecutor([], 1);
    const tool = createSqlQueryTool(executor, { allowMutations: true });
    const result = await tool.execute({ sql: 'DELETE FROM users WHERE id = 1' }, {} as any);
    expect(result).toContain('0 rows');
  });

  it('truncates results at maxRows', async () => {
    const rows = Array.from({ length: 150 }, (_, i) => ({ id: i }));
    const executor = makeExecutor(rows);
    const tool = createSqlQueryTool(executor, { maxRows: 10 });
    const result = await tool.execute({ sql: 'SELECT * FROM big' }, {} as any);
    expect(result).toContain('truncated to 10 rows');
  });

  it('passes params to executor', async () => {
    const executor = makeExecutor([{ id: 5 }]);
    const tool = createSqlQueryTool(executor);
    await tool.execute({ sql: 'SELECT * FROM users WHERE id = $1', params: [5] }, {} as any);
    expect((executor.query as jest.Mock).mock.calls[0][1]).toEqual([5]);
  });
});

// ─── VectorSearchTool ─────────────────────────────────────────────────────────

describe('VectorSearchTool', () => {
  function makeProvider(results: VectorSearchResult[]): IVectorSearchProvider {
    return {
      search: jest.fn().mockResolvedValue(results),
    };
  }

  it('returns formatted results', async () => {
    const provider = makeProvider([
      { id: '1', score: 0.95, text: 'Fox Framework is a TypeScript web framework.' },
      { id: '2', score: 0.88, text: 'It supports agents and LLMs natively.' },
    ]);
    const tool = createVectorSearchTool(provider);
    const result = await tool.execute({ query: 'what is fox framework' }, {} as any);
    expect(result).toContain('0.9500');
    expect(result).toContain('Fox Framework');
    expect(result).toContain('0.8800');
  });

  it('returns "no results" message when empty', async () => {
    const provider = makeProvider([]);
    const tool = createVectorSearchTool(provider);
    const result = await tool.execute({ query: 'nothing' }, {} as any);
    expect(result).toContain('No results found');
  });

  it('passes topK and minScore to provider', async () => {
    const provider = makeProvider([]);
    const tool = createVectorSearchTool(provider);
    await tool.execute({ query: 'test', top_k: 3, min_score: 0.7 }, {} as any);
    expect((provider.search as jest.Mock).mock.calls[0][1]).toMatchObject({
      topK: 3,
      minScore: 0.7,
    });
  });

  it('includes metadata in output', async () => {
    const provider = makeProvider([
      { id: '1', score: 0.9, text: 'result', metadata: { source: 'wiki', year: 2024 } },
    ]);
    const tool = createVectorSearchTool(provider);
    const result = await tool.execute({ query: 'test' }, {} as any);
    expect(result).toContain('source=wiki');
    expect(result).toContain('year=2024');
  });

  it('uses custom label and description', async () => {
    const provider = makeProvider([]);
    const tool = createVectorSearchTool(provider, {
      label: 'knowledge_base',
      description: 'Search the KB',
    });
    expect(tool.definition.name).toBe('knowledge_base');
    expect(tool.definition.description).toBe('Search the KB');
  });
});
