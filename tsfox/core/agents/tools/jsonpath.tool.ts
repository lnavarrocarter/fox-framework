import { ITool, AgentContext } from '../interfaces/agent.interface';

export const JsonPathTool: ITool = {
  definition: {
    name: 'jsonpath',
    description:
      'Extract and query data from JSON. Navigate objects and arrays using dot/bracket paths. ' +
      'Operations: get, keys, count, flatten, pretty. ' +
      'Example: path=".users[0].name", operation="get"',
    parameters: {
      type: 'object',
      properties: {
        json: {
          type: 'string',
          description: 'JSON string to query',
        },
        path: {
          type: 'string',
          description: 'Path expression: "." for root, ".field", "[0]", ".*", "[*]"',
        },
        operation: {
          type: 'string',
          enum: ['get', 'keys', 'count', 'flatten', 'pretty'],
          description: 'Operation to perform (default: get)',
        },
      },
      required: ['json', 'path'],
    },
  },

  async execute(params: Record<string, unknown>, _ctx: AgentContext): Promise<string> {
    const operation = (params.operation as string) ?? 'get';
    let data: unknown;

    if (typeof params.json === 'string') {
      try { data = JSON.parse(params.json as string); }
      catch { throw new Error('JsonPathTool: invalid JSON input'); }
    } else {
      data = params.json;
    }

    const pathStr = (params.path as string).trim();
    const value = resolvePath(data, pathStr);

    switch (operation) {
      case 'get': return JSON.stringify(value, null, 2);
      case 'keys': {
        if (typeof value !== 'object' || value === null)
          throw new Error(`JsonPathTool: cannot get keys of non-object at "${pathStr}"`);
        const keys = Array.isArray(value)
          ? value.map((_, i) => String(i))
          : Object.keys(value as object);
        return keys.join(', ');
      }
      case 'count': {
        if (Array.isArray(value)) return String(value.length);
        if (typeof value === 'object' && value !== null) return String(Object.keys(value as object).length);
        if (typeof value === 'string') return String(value.length);
        throw new Error(`JsonPathTool: cannot count "${typeof value}"`);
      }
      case 'flatten': {
        if (!Array.isArray(value)) throw new Error('JsonPathTool: flatten requires an array');
        return JSON.stringify(flatDeep(value), null, 2);
      }
      case 'pretty': return JSON.stringify(value, null, 2);
      default: throw new Error(`JsonPathTool: unknown operation "${operation}"`);
    }
  },
};

function resolvePath(data: unknown, pathStr: string): unknown {
  if (pathStr === '.' || pathStr === '') return data;
  const tokens: Array<{ type: 'key' | 'index' | 'wildcard_obj' | 'wildcard_arr'; value: string }> = [];
  const re = /\.(\*)|\.([a-zA-Z_$][a-zA-Z0-9_$]*|\d+)|\[(\*|\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(pathStr)) !== null) {
    if (match[1] !== undefined) tokens.push({ type: 'wildcard_obj', value: '*' });
    else if (match[2] !== undefined) tokens.push({ type: 'key', value: match[2] });
    else if (match[3] === '*') tokens.push({ type: 'wildcard_arr', value: '*' });
    else tokens.push({ type: 'index', value: match[3] });
  }
  if (tokens.length === 0) throw new Error(`JsonPathTool: invalid path "${pathStr}"`);

  let current: unknown = data;
  for (const token of tokens) {
    if (current === null || current === undefined)
      throw new Error(`JsonPathTool: null/undefined at path "${pathStr}"`);
    if (token.type === 'key') {
      if (typeof current !== 'object' || Array.isArray(current))
        throw new Error(`JsonPathTool: expected object for ".${token.value}"`);
      current = (current as Record<string, unknown>)[token.value];
    } else if (token.type === 'index') {
      if (!Array.isArray(current)) throw new Error(`JsonPathTool: expected array for "[${token.value}]"`);
      const idx = parseInt(token.value, 10);
      current = (current as unknown[])[idx < 0 ? current.length + idx : idx];
    } else if (token.type === 'wildcard_obj') {
      if (typeof current !== 'object' || Array.isArray(current))
        throw new Error('JsonPathTool: ".*" requires an object');
      current = Object.values(current as object);
    }
    // wildcard_arr: return as-is
  }
  return current;
}

function flatDeep(arr: unknown[]): unknown[] {
  return arr.reduce<unknown[]>((acc, val) => {
    if (Array.isArray(val)) acc.push(...flatDeep(val));
    else acc.push(val);
    return acc;
  }, []);
}
