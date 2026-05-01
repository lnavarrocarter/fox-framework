/**
 * @fileoverview Epic B — Serverless adapters test suite
 */

import express, { Application } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';

import {
  LambdaAdapter,
  VercelAdapter,
  GcpAdapter,
  createServerlessHandler,
  coldStartMiddleware,
  onColdStart,
  _resetColdStart,
  _resetLambdaColdStart,
  _resetVercelColdStart,
  _resetGcpColdStart,
} from '../src/index';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeApp(overrides?: (app: Application) => void): Application {
  const app = express();
  app.use(express.json());
  app.get('/hello', (_req, res) => res.json({ hello: 'world' }));
  app.post('/echo', (req, res) => res.status(201).json(req.body));
  app.get('/headers', (req, res) => {
    const ctx = (req as any).serverless;
    // Omit rawEvent/rawContext to avoid circular-reference serialisation errors
    res.json({
      serverless: ctx
        ? {
            provider: ctx.provider,
            requestId: ctx.requestId,
            functionName: ctx.functionName,
            remainingTimeMs: ctx.remainingTimeMs,
            isColdStart: ctx.isColdStart,
          }
        : null,
    });
  });
  app.get('/error', (_req, _res, next) => next(new Error('boom')));
  if (overrides) overrides(app);
  // catch-all 404
  app.use((_req, res) => res.status(404).json({ error: 'not found' }));
  // error handler
  app.use((err: any, _req: any, res: any, _next: any) => res.status(500).json({ error: err.message }));
  return app;
}

/** Minimal Lambda v1 event */
function lambdaV1Event(method = 'GET', path = '/hello', body?: string) {
  return {
    httpMethod: method,
    path,
    headers: { 'content-type': 'application/json' },
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body: body ?? null,
    isBase64Encoded: false,
    requestContext: {},
  };
}

/** Minimal Lambda v2 event */
function lambdaV2Event(method = 'GET', path = '/hello', body?: string) {
  return {
    version: '2.0',
    requestContext: {
      http: { method, path },
      requestId: 'req-v2-001',
    },
    rawPath: path,
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    body: body ?? null,
    isBase64Encoded: false,
  };
}

const fakeLambdaContext = {
  awsRequestId: 'aws-req-001',
  functionName: 'test-function',
  getRemainingTimeInMillis: () => 5000,
};

/** Build a fake Node.js req/res pair for Vercel/GCP tests */
function makeNodeReqRes(method = 'GET', url = '/hello', headers: Record<string, string> = {}) {
  const req = new IncomingMessage(new Socket()) as any;
  req.method = method;
  req.url = url;
  Object.assign(req.headers, { 'content-type': 'application/json', ...headers });
  req.push(null);

  let statusCode = 200;
  const responseHeaders: Record<string, string> = {};
  const chunks: Buffer[] = [];

  const res = new ServerResponse(req) as any;
  res.writeHead = (code: number, hdrs?: any) => { statusCode = code; Object.assign(responseHeaders, hdrs ?? {}); return res; };
  res.setHeader = (k: string, v: string) => { responseHeaders[k.toLowerCase()] = v; return res; };

  const bodyReady = new Promise<{ statusCode: number; headers: Record<string, string>; body: string }>((resolve) => {
    res.write = (chunk: any) => { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); return true; };
    res.end = (chunk?: any) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      resolve({ statusCode, headers: responseHeaders, body: Buffer.concat(chunks).toString('utf8') });
      res.emit('finish');
      return res;
    };
  });

  return { req, res, bodyReady };
}

// ── Lambda adapter ─────────────────────────────────────────────────────────────

describe('LambdaAdapter', () => {
  beforeEach(() => _resetLambdaColdStart());

  it('handles GET /hello with v1 event', async () => {
    const handler = new LambdaAdapter().adapt(makeApp());
    const result = await handler(lambdaV1Event(), fakeLambdaContext);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ hello: 'world' });
  });

  it('handles GET /hello with v2 event', async () => {
    const handler = new LambdaAdapter().adapt(makeApp());
    const result = await handler(lambdaV2Event(), fakeLambdaContext);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ hello: 'world' });
  });

  it('handles POST /echo with JSON body', async () => {
    const body = JSON.stringify({ name: 'fox' });
    const handler = new LambdaAdapter().adapt(makeApp());
    const result = await handler(lambdaV1Event('POST', '/echo', body), fakeLambdaContext);
    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toEqual({ name: 'fox' });
  });

  it('attaches ServerlessContext to req.serverless', async () => {
    const handler = new LambdaAdapter().adapt(makeApp());
    const result = await handler(lambdaV1Event('GET', '/headers'), fakeLambdaContext);
    const ctx = JSON.parse(result.body).serverless;
    expect(ctx.provider).toBe('aws-lambda');
    expect(ctx.requestId).toBe('aws-req-001');
    expect(ctx.functionName).toBe('test-function');
    expect(ctx.remainingTimeMs).toBe(5000);
  });

  it('marks first invocation as cold start', async () => {
    const handler = new LambdaAdapter().adapt(makeApp());
    const r1 = await handler(lambdaV1Event('GET', '/headers'), fakeLambdaContext);
    const r2 = await handler(lambdaV1Event('GET', '/headers'), fakeLambdaContext);
    expect(JSON.parse(r1.body).serverless.isColdStart).toBe(true);
    expect(JSON.parse(r2.body).serverless.isColdStart).toBe(false);
  });

  it('handles binary response (base64)', async () => {
    const app = makeApp(a => {
      a.get('/img', (_req, res) => {
        res.setHeader('content-type', 'image/png');
        res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      });
    });
    const handler = new LambdaAdapter().adapt(app);
    const result = await handler(lambdaV1Event('GET', '/img'), fakeLambdaContext);
    expect(result.isBase64Encoded).toBe(true);
    expect(Buffer.from(result.body, 'base64')).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it('handles query string in v1 event', async () => {
    const app = makeApp(a => {
      a.get('/qs', (req, res) => res.json({ q: req.query }));
    });
    const event = { ...lambdaV1Event('GET', '/qs'), queryStringParameters: { foo: 'bar' } };
    const handler = new LambdaAdapter().adapt(app);
    const result = await handler(event, fakeLambdaContext);
    expect(JSON.parse(result.body).q).toEqual({ foo: 'bar' });
  });

  it('returns 404 for unknown routes', async () => {
    const handler = new LambdaAdapter().adapt(makeApp());
    const result = await handler(lambdaV1Event('GET', '/not-found'), fakeLambdaContext);
    expect(result.statusCode).toBe(404);
  });

  it('createServerlessHandler factory creates a Lambda handler', async () => {
    const handler = createServerlessHandler('aws-lambda', makeApp());
    const result = await (handler as any)(lambdaV1Event(), fakeLambdaContext);
    expect(result.statusCode).toBe(200);
  });
});

// ── Vercel adapter ────────────────────────────────────────────────────────────

describe('VercelAdapter', () => {
  beforeEach(() => _resetVercelColdStart());

  it('handles GET /hello', async () => {
    const handler = new VercelAdapter().adapt(makeApp());
    const { req, res, bodyReady } = makeNodeReqRes('GET', '/hello');
    await handler(req, res);
    const { statusCode, body } = await bodyReady;
    expect(statusCode).toBe(200);
    expect(JSON.parse(body)).toEqual({ hello: 'world' });
  });

  it('attaches ServerlessContext with provider=vercel', async () => {
    const handler = new VercelAdapter().adapt(makeApp());
    const { req, res, bodyReady } = makeNodeReqRes('GET', '/headers', {
      'x-vercel-id': 'vercel-req-001',
    });
    await handler(req, res);
    const { body } = await bodyReady;
    const ctx = JSON.parse(body).serverless;
    expect(ctx.provider).toBe('vercel');
    expect(ctx.requestId).toBe('vercel-req-001');
  });

  it('marks first invocation as cold start', async () => {
    const handler = new VercelAdapter().adapt(makeApp());
    const { req: r1, res: rs1, bodyReady: b1 } = makeNodeReqRes('GET', '/headers');
    await handler(r1, rs1);
    const first = JSON.parse((await b1).body).serverless.isColdStart;

    const { req: r2, res: rs2, bodyReady: b2 } = makeNodeReqRes('GET', '/headers');
    await handler(r2, rs2);
    const second = JSON.parse((await b2).body).serverless.isColdStart;

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('createServerlessHandler factory creates a Vercel handler', async () => {
    const handler = createServerlessHandler('vercel', makeApp()) as VercelHandler;
    const { req, res, bodyReady } = makeNodeReqRes();
    await handler(req, res);
    expect((await bodyReady).statusCode).toBe(200);
  });
});

// ── GCP adapter ───────────────────────────────────────────────────────────────

describe('GcpAdapter', () => {
  beforeEach(() => _resetGcpColdStart());

  it('handles GET /hello', async () => {
    const handler = new GcpAdapter().adapt(makeApp());
    const { req, res, bodyReady } = makeNodeReqRes('GET', '/hello');
    await handler(req, res);
    const { statusCode, body } = await bodyReady;
    expect(statusCode).toBe(200);
    expect(JSON.parse(body)).toEqual({ hello: 'world' });
  });

  it('attaches ServerlessContext with provider=gcp', async () => {
    const handler = new GcpAdapter().adapt(makeApp());
    const { req, res, bodyReady } = makeNodeReqRes('GET', '/headers', {
      'function-execution-id': 'gcp-exec-001',
    });
    await handler(req, res);
    const ctx = JSON.parse((await bodyReady).body).serverless;
    expect(ctx.provider).toBe('gcp');
    expect(ctx.requestId).toBe('gcp-exec-001');
  });

  it('marks first invocation as cold start', async () => {
    const handler = new GcpAdapter().adapt(makeApp());
    const { req: r1, res: rs1, bodyReady: b1 } = makeNodeReqRes('GET', '/headers');
    await handler(r1, rs1); const first = JSON.parse((await b1).body).serverless.isColdStart;

    const { req: r2, res: rs2, bodyReady: b2 } = makeNodeReqRes('GET', '/headers');
    await handler(r2, rs2); const second = JSON.parse((await b2).body).serverless.isColdStart;

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('createServerlessHandler factory creates a GCP handler', async () => {
    const handler = createServerlessHandler('gcp', makeApp()) as GcpHandler;
    const { req, res, bodyReady } = makeNodeReqRes();
    await handler(req, res);
    expect((await bodyReady).statusCode).toBe(200);
  });
});

// ── coldStartMiddleware ───────────────────────────────────────────────────────

describe('coldStartMiddleware', () => {
  beforeEach(() => _resetColdStart());

  it('calls onColdStart callbacks exactly once', async () => {
    const called: number[] = [];
    onColdStart(async () => { called.push(1); });
    onColdStart(async () => { called.push(2); });

    const mw = coldStartMiddleware();
    const next = jest.fn();
    const req: any = {};
    const res: any = {};

    await mw(req, res, next);
    await mw(req, res, next);

    expect(called).toEqual([1, 2]); // ran once total
    expect(next).toHaveBeenCalledTimes(2);
  });
});

// ── factory error path ────────────────────────────────────────────────────────

describe('createServerlessHandler', () => {
  it('throws for unknown provider', () => {
    expect(() => createServerlessHandler('aws-step-functions' as any, makeApp())).toThrow();
  });
});

// type alias for import check
type VercelHandler = (req: any, res: any) => Promise<void>;
type GcpHandler = (req: any, res: any) => Promise<void>;
