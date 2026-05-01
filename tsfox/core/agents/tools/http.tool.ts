import { ITool, AgentContext } from '../interfaces/agent.interface';

/**
 * HttpTool — makes HTTP requests (GET, POST, PUT, PATCH, DELETE)
 */
export const HttpTool: ITool = {
  definition: {
    name: 'http',
    description:
      'Make HTTP requests to external URLs. Supports GET, POST, PUT, PATCH, DELETE. ' +
      'Returns the response body as text or JSON.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The full URL to request (must start with http:// or https://)',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          description: 'HTTP method (default: GET)',
        },
        headers: {
          type: 'object',
          description: 'Optional HTTP headers as key-value pairs',
        },
        body: {
          type: 'string',
          description: 'Optional request body. Objects are serialised to JSON automatically.',
        },
        timeout: {
          type: 'number',
          description: 'Request timeout in milliseconds (default: 10000)',
        },
      },
      required: ['url'],
    },
  },

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<string> {
    const url = params.url as string;
    const method = ((params.method as string) ?? 'GET').toUpperCase();
    const headers = (params.headers as Record<string, string>) ?? {};
    const timeoutMs = (params.timeout as number) ?? 10_000;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error(`HttpTool: invalid URL "${url}" — must start with http:// or https://`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let bodyStr: string | undefined;
    if (params.body !== undefined) {
      if (typeof params.body === 'string') {
        bodyStr = params.body;
      } else {
        bodyStr = JSON.stringify(params.body);
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: bodyStr,
        signal: controller.signal,
      });

      clearTimeout(timer);

      const contentType = response.headers.get('content-type') ?? '';
      const text = await response.text();

      if (!response.ok) {
        return `HTTP ${response.status} ${response.statusText}\n${text}`;
      }

      if (contentType.includes('application/json') || contentType.includes('text/json')) {
        try {
          return JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          return text;
        }
      }

      return text;
    } catch (err: unknown) {
      clearTimeout(timer);
      if ((err as Error).name === 'AbortError') {
        throw new Error(`HttpTool: request to "${url}" timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  },
};
