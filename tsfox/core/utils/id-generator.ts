/**
 * @fileoverview ID generation utilities for Fox Framework
 * @version 1.0.0
 * @since 2025-01-10
 */

import { randomBytes } from 'crypto';

/**
 * Generate a unique ID for requests, sessions, etc.
 * @param length - Length of the generated ID (default: 16)
 * @returns A hex-encoded unique ID
 */
export function generateId(length: number = 16): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a correlation ID for distributed tracing
 * @returns A UUID-like correlation ID
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = randomBytes(8).toString('hex');
  return `${timestamp}-${randomPart}`;
}

/**
 * Generate a short ID for logging purposes
 * @returns A short 8-character ID
 */
export function generateShortId(): string {
  return randomBytes(4).toString('hex');
}
