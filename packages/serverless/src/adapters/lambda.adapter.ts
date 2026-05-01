/**
 * @fileoverview AWS Lambda adapter — wraps an Express app as a Lambda handler
 * @module @foxframework/serverless
 *
 * Supports:
 *  - API Gateway v1 (REST) payload format
 *  - API Gateway v2 (HTTP) payload format
 *  - Function URL (same shape as v2)
 *  - Binary response bodies (base64)
 */

import { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';
import type { Application } from 'express';
import type {
  ServerlessAdapterOptions,
  ServerlessContext,
  LambdaHandler,
  IServerlessAdapter,
} from '../interfaces/serverless.interface';

const DEFAULT_BINARY_MIME_TYPES = [
  'application/octet-stream',
  'application/pdf',
  'application/zip',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
  'font/woff',
  'font/woff2',
];

let _coldStart = true;

export class LambdaAdapter implements IServerlessAdapter {
  readonly provider = 'aws-lambda' as const;

  adapt(app: Application, options: ServerlessAdapterOptions = {}): LambdaHandler {
    const binaryMimes = new Set(options.binaryMimeTypes ?? DEFAULT_BINARY_MIME_TYPES);
    const log = options.logger ?? console;
    const logCold = options.logColdStart !== false;

    return async (event: any, context: any): Promise<any> => {
      const isCold = _coldStart;
      if (isCold) {
        _coldStart = false;
        if (logCold) log.info('[FoxServerless/Lambda] cold start');
      }

      // Detect payload format version
      const isV2 = event.version === '2.0' || event.requestContext?.http != null;

      const method = isV2
        ? event.requestContext.http.method
        : event.httpMethod;

      const path = isV2
        ? event.rawPath + (event.rawQueryString ? `?${event.rawQueryString}` : '')
        : (event.path || '/') + buildQueryStringV1(event.multiValueQueryStringParameters ?? event.queryStringParameters);

      const headers: Record<string, string> = isV2
        ? (event.headers ?? {})
        : flattenHeaders(
            Object.keys(event.multiValueHeaders ?? {}).length > 0
              ? event.multiValueHeaders
              : (event.headers ?? {})
          );

      const body = event.isBase64Encoded
        ? Buffer.from(event.body ?? '', 'base64')
        : Buffer.from(event.body ?? '');

      // Inject content-length so body-parser can read the body
      if (body.length > 0 && !headers['content-length']) {
        headers['content-length'] = String(body.length);
      }

      // Build a fake IncomingMessage
      const req = new IncomingMessage(new Socket());
      req.method = method;
      req.url = path;
      Object.assign(req.headers, headers);
      (req as any).serverless = {
        provider: 'aws-lambda',
        requestId: context.awsRequestId ?? event.requestContext?.requestId ?? '',
        functionName: context.functionName ?? '',
        remainingTimeMs: context.getRemainingTimeInMillis?.() ?? undefined,
        rawEvent: event,
        rawContext: context,
        isColdStart: isCold,
      } satisfies ServerlessContext;

      // Build a fake ServerResponse
      const responseHeaders: Record<string, string | string[]> = {};
      const chunks: Buffer[] = [];

      const res = new ServerResponse(req);
      res.writeHead = ((code: number, _msg?: any, hdrs?: any) => {
        res.statusCode = code;
        const h = typeof _msg === 'object' && _msg !== null && !Array.isArray(_msg) ? _msg : (hdrs ?? {});
        for (const [k, v] of Object.entries(h)) {
          responseHeaders[k.toLowerCase()] = v as string;
        }
        return res;
      }) as any;

      res.setHeader = (name: string, value: string | number | readonly string[]) => {
        responseHeaders[name.toLowerCase()] = Array.isArray(value)
          ? (value as string[])
          : String(value);
        return res;
      };

      res.write = ((chunk: any) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      }) as any;

      const responseReady = new Promise<void>(resolve => {
        res.end = ((chunk?: any) => {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          // Merge any headers set directly on the ServerResponse
          const nativeHeaders = res.getHeaders();
          for (const [k, v] of Object.entries(nativeHeaders)) {
            if (!responseHeaders[k.toLowerCase()]) {
              responseHeaders[k.toLowerCase()] = v as string | string[];
            }
          }
          resolve();
          return res;
        }) as any;
      });

      // Hand off to Express, then push body so stream listeners are attached
      app(req as any, res as any, () => {});

      // Push body asynchronously so body-parser listeners are registered first
      process.nextTick(() => {
        req.push(body);
        req.push(null);
      });

      await responseReady;

      const responseBody = Buffer.concat(chunks);
      // content-type may have been set via res.setHeader (captured in nativeHeaders via res.end) or writeHead
      const contentType = String(responseHeaders['content-type'] ?? '').split(';')[0].trim();
      const isBinary = contentType !== '' && binaryMimes.has(contentType);

      // Flatten multi-value headers for v1 response
      const flatHeaders: Record<string, string> = {};
      const multiValueHeaders: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(responseHeaders)) {
        if (Array.isArray(v)) {
          multiValueHeaders[k] = v;
          flatHeaders[k] = v[v.length - 1];
        } else {
          flatHeaders[k] = v;
          multiValueHeaders[k] = [v];
        }
      }

      return {
        statusCode: res.statusCode,
        headers: flatHeaders,
        multiValueHeaders,
        body: isBinary ? responseBody.toString('base64') : responseBody.toString('utf8'),
        isBase64Encoded: isBinary,
      };
    };
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function buildQueryStringV1(params: Record<string, string | string[]> | null | undefined): string {
  if (!params) return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    const vals = Array.isArray(v) ? v : [v];
    for (const val of vals) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(val)}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

function flattenHeaders(headers: Record<string, string | string[]>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
  }
  return out;
}

/** Reset cold-start flag (test helper) */
export function _resetLambdaColdStart(): void { _coldStart = true; }
