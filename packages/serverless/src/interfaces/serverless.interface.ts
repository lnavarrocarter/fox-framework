/**
 * @fileoverview Core interfaces for serverless adapters
 * @module @foxframework/serverless
 */

import type { Application } from 'express';

/** Supported serverless providers */
export type ServerlessProvider = 'aws-lambda' | 'vercel' | 'gcp';

/** Context injected into req.serverless */
export interface ServerlessContext {
  /** Cloud provider */
  provider: ServerlessProvider;
  /** Unique invocation/request ID from the platform */
  requestId: string;
  /** Function/handler name */
  functionName: string;
  /** Remaining execution time in ms (undefined if not applicable) */
  remainingTimeMs?: number;
  /** Raw platform event object */
  rawEvent: unknown;
  /** Raw platform context object */
  rawContext: unknown;
  /** Whether this is a cold start invocation */
  isColdStart: boolean;
}

/** Options shared by all adapters */
export interface ServerlessAdapterOptions {
  /**
   * Binary MIME types whose response body should be base64-encoded.
   * Only relevant for AWS Lambda + API Gateway.
   * Default: common image/font/archive types.
   */
  binaryMimeTypes?: string[];
  /**
   * Log cold starts (default: true)
   */
  logColdStart?: boolean;
  /**
   * Custom logger (default: console)
   */
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

/** The handler signature returned by each adapter */
export type LambdaHandler = (event: any, context: any) => Promise<any>;
export type VercelHandler = (req: any, res: any) => Promise<void>;
export type GcpHandler = (req: any, res: any) => Promise<void>;

/** Generic adapt function type */
export interface IServerlessAdapter {
  provider: ServerlessProvider;
  adapt(app: Application, options?: ServerlessAdapterOptions): LambdaHandler | VercelHandler | GcpHandler;
}
