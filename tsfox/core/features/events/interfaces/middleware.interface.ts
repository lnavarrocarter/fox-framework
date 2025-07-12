/**
 * @fileoverview Event middleware interfaces
 * @module tsfox/core/features/events/interfaces
 */

import { EventInterface } from './event.interface';

/**
 * Event middleware interface
 */
export interface EventMiddlewareInterface {
  /** Middleware name */
  readonly name: string;
  
  /** Middleware priority (lower = higher priority) */
  readonly priority: number;
  
  /** Process event before emission */
  beforeEmit?(event: EventInterface, context: EventContext): Promise<EventInterface>;
  
  /** Process event after emission */
  afterEmit?(event: EventInterface, context: EventContext): Promise<void>;
  
  /** Handle emission errors */
  onError?(error: Error, event: EventInterface, context: EventContext): Promise<void>;
  
  /** Process event before handling */
  beforeHandle?(event: EventInterface, context: EventContext): Promise<EventInterface>;
  
  /** Process event after handling */
  afterHandle?(event: EventInterface, context: EventContext): Promise<void>;
  
  /** Handle processing errors */
  onHandleError?(error: Error, event: EventInterface, context: EventContext): Promise<void>;
}

/**
 * Event context interface
 */
export interface EventContext {
  /** Event ID */
  eventId: string;
  
  /** Correlation ID */
  correlationId?: string;
  
  /** User ID */
  userId?: string;
  
  /** Session ID */
  sessionId?: string;
  
  /** Request ID */
  requestId?: string;
  
  /** Tenant ID */
  tenantId?: string;
  
  /** Source component */
  source: string;
  
  /** Processing timestamp */
  timestamp: Date;
  
  /** Custom metadata */
  metadata: Record<string, any>;
  
  /** Tracing information */
  tracing?: {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
  };
}

/**
 * Event validation middleware
 */
export interface EventValidationMiddleware extends EventMiddlewareInterface {
  /** Validate event schema */
  validateSchema(event: EventInterface): Promise<ValidationResult>;
  
  /** Get validation rules */
  getValidationRules(eventType: string): ValidationRules;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Is valid */
  valid: boolean;
  
  /** Validation errors */
  errors: ValidationError[];
  
  /** Validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field path */
  field: string;
  
  /** Error message */
  message: string;
  
  /** Error code */
  code: string;
  
  /** Expected value */
  expected?: any;
  
  /** Actual value */
  actual?: any;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Field path */
  field: string;
  
  /** Warning message */
  message: string;
  
  /** Warning code */
  code: string;
}

/**
 * Validation rules
 */
export interface ValidationRules {
  /** Required fields */
  required: string[];
  
  /** Field types */
  types: Record<string, string>;
  
  /** Field constraints */
  constraints: Record<string, any>;
  
  /** Custom validators */
  custom: Record<string, (value: any) => boolean>;
}

/**
 * Event security middleware
 */
export interface EventSecurityMiddleware extends EventMiddlewareInterface {
  /** Authorize event emission */
  authorize(event: EventInterface, context: EventContext): Promise<AuthorizationResult>;
  
  /** Encrypt sensitive data */
  encrypt(event: EventInterface): Promise<EventInterface>;
  
  /** Decrypt sensitive data */
  decrypt(event: EventInterface): Promise<EventInterface>;
  
  /** Sanitize event data */
  sanitize(event: EventInterface): Promise<EventInterface>;
}

/**
 * Authorization result
 */
export interface AuthorizationResult {
  /** Is authorized */
  authorized: boolean;
  
  /** Reason for denial */
  reason?: string;
  
  /** Required permissions */
  requiredPermissions?: string[];
  
  /** User permissions */
  userPermissions?: string[];
}

/**
 * Event audit middleware
 */
export interface EventAuditMiddleware extends EventMiddlewareInterface {
  /** Record audit entry */
  audit(event: EventInterface, context: EventContext, action: string): Promise<void>;
  
  /** Get audit trail */
  getAuditTrail(eventId: string): Promise<AuditEntry[]>;
  
  /** Get audit statistics */
  getAuditStats(): Promise<AuditStats>;
}

/**
 * Audit entry
 */
export interface AuditEntry {
  /** Entry ID */
  id: string;
  
  /** Event ID */
  eventId: string;
  
  /** User ID */
  userId?: string;
  
  /** Action performed */
  action: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** IP address */
  ipAddress?: string;
  
  /** User agent */
  userAgent?: string;
  
  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Audit statistics
 */
export interface AuditStats {
  /** Total audit entries */
  totalEntries: number;
  
  /** Entries by action */
  entriesByAction: Record<string, number>;
  
  /** Entries by user */
  entriesByUser: Record<string, number>;
  
  /** Entries by date */
  entriesByDate: Record<string, number>;
}

/**
 * Event metrics middleware
 */
export interface EventMetricsMiddleware extends EventMiddlewareInterface {
  /** Record event metrics */
  record(event: EventInterface, context: EventContext, duration: number): Promise<void>;
  
  /** Get metrics */
  getMetrics(): Promise<EventMetrics>;
  
  /** Reset metrics */
  resetMetrics(): Promise<void>;
}

/**
 * Event metrics
 */
export interface EventMetrics {
  /** Total events processed */
  totalEvents: number;
  
  /** Events per second */
  eventsPerSecond: number;
  
  /** Average processing time */
  averageProcessingTime: number;
  
  /** Events by type */
  eventsByType: Record<string, number>;
  
  /** Events by status */
  eventsByStatus: Record<string, number>;
  
  /** Error rate */
  errorRate: number;
  
  /** Queue depth */
  queueDepth: number;
  
  /** Memory usage */
  memoryUsage: number;
  
  /** CPU usage */
  cpuUsage: number;
}

/**
 * Event transformation middleware
 */
export interface EventTransformationMiddleware extends EventMiddlewareInterface {
  /** Transform event data */
  transform(event: EventInterface, rules: TransformationRules): Promise<EventInterface>;
  
  /** Get transformation rules */
  getTransformationRules(eventType: string): TransformationRules;
  
  /** Apply field mappings */
  applyFieldMappings(event: EventInterface, mappings: FieldMapping[]): Promise<EventInterface>;
}

/**
 * Transformation rules
 */
export interface TransformationRules {
  /** Field mappings */
  fieldMappings: FieldMapping[];
  
  /** Value transformations */
  valueTransformations: ValueTransformation[];
  
  /** Conditional transformations */
  conditionalTransformations: ConditionalTransformation[];
  
  /** Custom transformers */
  customTransformers: Record<string, (value: any) => any>;
}

/**
 * Field mapping
 */
export interface FieldMapping {
  /** Source field path */
  source: string;
  
  /** Target field path */
  target: string;
  
  /** Default value */
  defaultValue?: any;
  
  /** Required field */
  required?: boolean;
}

/**
 * Value transformation
 */
export interface ValueTransformation {
  /** Field path */
  field: string;
  
  /** Transformation type */
  type: 'uppercase' | 'lowercase' | 'trim' | 'format' | 'custom';
  
  /** Transformation parameters */
  params?: any;
  
  /** Custom transformer function */
  transformer?: (value: any) => any;
}

/**
 * Conditional transformation
 */
export interface ConditionalTransformation {
  /** Condition */
  condition: (event: EventInterface) => boolean;
  
  /** Transformations to apply if condition is true */
  transformations: (FieldMapping | ValueTransformation)[];
}

/**
 * Event serialization middleware
 */
export interface EventSerializationMiddleware extends EventMiddlewareInterface {
  /** Serialize event */
  serialize(event: EventInterface): Promise<string>;
  
  /** Deserialize event */
  deserialize(data: string): Promise<EventInterface>;
  
  /** Get serialization format */
  getFormat(): string;
  
  /** Validate serialized data */
  validateSerialized(data: string): Promise<boolean>;
}

/**
 * Event compression middleware
 */
export interface EventCompressionMiddleware extends EventMiddlewareInterface {
  /** Compress event data */
  compress(event: EventInterface): Promise<EventInterface>;
  
  /** Decompress event data */
  decompress(event: EventInterface): Promise<EventInterface>;
  
  /** Get compression ratio */
  getCompressionRatio(): number;
  
  /** Get compression statistics */
  getStats(): Promise<CompressionStats>;
}

/**
 * Compression statistics
 */
export interface CompressionStats {
  /** Total events compressed */
  totalCompressed: number;
  
  /** Average compression ratio */
  averageCompressionRatio: number;
  
  /** Total bytes saved */
  totalBytesSaved: number;
  
  /** Compression time */
  averageCompressionTime: number;
  
  /** Decompression time */
  averageDecompressionTime: number;
}

/**
 * Event middleware chain
 */
export interface EventMiddlewareChain {
  /** Add middleware */
  add(middleware: EventMiddlewareInterface): void;
  
  /** Remove middleware */
  remove(middlewareName: string): void;
  
  /** Get middleware */
  get(middlewareName: string): EventMiddlewareInterface | null;
  
  /** Execute before emit chain */
  executeBeforeEmit(event: EventInterface, context: EventContext): Promise<EventInterface>;
  
  /** Execute after emit chain */
  executeAfterEmit(event: EventInterface, context: EventContext): Promise<void>;
  
  /** Execute error handling chain */
  executeOnError(error: Error, event: EventInterface, context: EventContext): Promise<void>;
  
  /** Execute before handle chain */
  executeBeforeHandle(event: EventInterface, context: EventContext): Promise<EventInterface>;
  
  /** Execute after handle chain */
  executeAfterHandle(event: EventInterface, context: EventContext): Promise<void>;
  
  /** Execute handle error chain */
  executeOnHandleError(error: Error, event: EventInterface, context: EventContext): Promise<void>;
  
  /** Get middleware list */
  getMiddleware(): EventMiddlewareInterface[];
  
  /** Clear all middleware */
  clear(): void;
}

/**
 * Event middleware configuration
 */
export interface EventMiddlewareConfig {
  /** Validation configuration */
  validation?: {
    enabled: boolean;
    strict: boolean;
    schemas: Record<string, any>;
  };
  
  /** Security configuration */
  security?: {
    enabled: boolean;
    encryption: {
      enabled: boolean;
      algorithm: string;
      key: string;
    };
    authorization: {
      enabled: boolean;
      provider: string;
    };
  };
  
  /** Audit configuration */
  audit?: {
    enabled: boolean;
    storage: string;
    retention: number;
  };
  
  /** Metrics configuration */
  metrics?: {
    enabled: boolean;
    provider: string;
    interval: number;
  };
  
  /** Transformation configuration */
  transformation?: {
    enabled: boolean;
    rules: Record<string, TransformationRules>;
  };
  
  /** Serialization configuration */
  serialization?: {
    format: 'json' | 'avro' | 'protobuf' | 'messagepack';
    compression: boolean;
  };
}
