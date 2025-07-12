/**
 * @fileoverview Event bus and adapter interfaces
 * @module tsfox/core/features/events/interfaces
 */

import { EventInterface, EventHandler, Subscription, SubscriptionOptions } from './event.interface';

/**
 * Event bus interface for distributed event processing
 */
export interface EventBusInterface {
  /** Publish an event to the bus */
  publish(event: EventInterface): Promise<void>;
  
  /** Publish multiple events in batch */
  publishBatch(events: EventInterface[]): Promise<void>;
  
  /** Subscribe to events */
  subscribe(eventType: string, handler: EventHandler, options?: SubscriptionOptions): Promise<Subscription>;
  
  /** Subscribe to multiple event types */
  subscribeToMultiple(eventTypes: string[], handler: EventHandler, options?: SubscriptionOptions): Promise<Subscription>;
  
  /** Unsubscribe from events */
  unsubscribe(subscription: Subscription): Promise<void>;
  
  /** Get active subscriptions */
  getSubscriptions(): Subscription[];
  
  /** Get bus statistics */
  getStats(): Promise<EventBusStats>;
  
  /** Close the bus connection */
  close(): Promise<void>;
}

/**
 * Event bus statistics
 */
export interface EventBusStats {
  /** Total events published */
  totalPublished: number;
  
  /** Total events received */
  totalReceived: number;
  
  /** Events per second */
  eventsPerSecond: number;
  
  /** Average publish latency */
  averagePublishLatency: number;
  
  /** Number of active subscriptions */
  activeSubscriptions: number;
  
  /** Number of failed publishes */
  failedPublishes: number;
  
  /** Bus connection status */
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  
  /** Last activity timestamp */
  lastActivity: Date;
}

/**
 * Event adapter interface for external messaging systems
 */
export interface EventAdapterInterface {
  /** Connect to the external system */
  connect(): Promise<void>;
  
  /** Disconnect from the external system */
  disconnect(): Promise<void>;
  
  /** Publish an event */
  publish(topic: string, event: EventInterface): Promise<void>;
  
  /** Subscribe to events */
  subscribe(topic: string, handler: EventHandler, options?: AdapterSubscriptionOptions): Promise<Subscription>;
  
  /** Unsubscribe from events */
  unsubscribe(subscription: Subscription): Promise<void>;
  
  /** Get adapter statistics */
  getStats(): Promise<AdapterStats>;
  
  /** Check connection health */
  healthCheck(): Promise<boolean>;
}

/**
 * Adapter subscription options
 */
export interface AdapterSubscriptionOptions {
  /** Consumer group ID */
  consumerGroup?: string;
  
  /** Start from beginning or latest */
  startFrom?: 'beginning' | 'latest' | 'timestamp';
  
  /** Specific timestamp to start from */
  timestamp?: Date;
  
  /** Auto-acknowledge messages */
  autoAck?: boolean;
  
  /** Maximum number of unacknowledged messages */
  maxUnackedMessages?: number;
  
  /** Message prefetch count */
  prefetchCount?: number;
}

/**
 * Adapter statistics
 */
export interface AdapterStats {
  /** Adapter type */
  type: string;
  
  /** Connection status */
  connected: boolean;
  
  /** Messages published */
  published: number;
  
  /** Messages received */
  received: number;
  
  /** Connection uptime */
  uptime: number;
  
  /** Last error */
  lastError?: string;
  
  /** Performance metrics */
  performance: {
    publishLatency: number;
    receiveLatency: number;
    throughput: number;
  };
}

/**
 * Redis adapter configuration
 */
export interface RedisAdapterConfig {
  /** Redis host */
  host: string;
  
  /** Redis port */
  port: number;
  
  /** Redis password */
  password?: string;
  
  /** Redis database number */
  database?: number;
  
  /** Connection pool size */
  poolSize?: number;
  
  /** Connection timeout */
  connectTimeout?: number;
  
  /** Command timeout */
  commandTimeout?: number;
  
  /** Retry attempts */
  retryAttempts?: number;
  
  /** Key prefix for events */
  keyPrefix?: string;
  
  /** Enable clustering */
  cluster?: {
    enabled: boolean;
    nodes: Array<{ host: string; port: number }>;
  };
}

/**
 * RabbitMQ adapter configuration
 */
export interface RabbitMQAdapterConfig {
  /** Connection URL */
  url: string;
  
  /** Exchange name */
  exchange: string;
  
  /** Exchange type */
  exchangeType: 'direct' | 'topic' | 'fanout' | 'headers';
  
  /** Queue prefix */
  queuePrefix?: string;
  
  /** Enable durable queues */
  durable?: boolean;
  
  /** Auto-delete queues */
  autoDelete?: boolean;
  
  /** Connection options */
  connectionOptions?: {
    heartbeat?: number;
    timeout?: number;
    maxRetries?: number;
  };
  
  /** SSL configuration */
  ssl?: {
    enabled: boolean;
    cert?: string;
    key?: string;
    ca?: string;
  };
}

/**
 * Kafka adapter configuration
 */
export interface KafkaAdapterConfig {
  /** Kafka brokers */
  brokers: string[];
  
  /** Client ID */
  clientId?: string;
  
  /** Consumer group ID */
  groupId?: string;
  
  /** Topic prefix */
  topicPrefix?: string;
  
  /** Producer configuration */
  producer?: {
    /** Acknowledgment level */
    acks: 'none' | 'leader' | 'all';
    
    /** Batch size */
    batchSize?: number;
    
    /** Linger time */
    lingerMs?: number;
    
    /** Compression type */
    compression?: 'none' | 'gzip' | 'snappy' | 'lz4';
  };
  
  /** Consumer configuration */
  consumer?: {
    /** Session timeout */
    sessionTimeout?: number;
    
    /** Heartbeat interval */
    heartbeatInterval?: number;
    
    /** Auto-commit interval */
    autoCommitInterval?: number;
    
    /** Start from beginning */
    fromBeginning?: boolean;
  };
  
  /** SSL configuration */
  ssl?: {
    enabled: boolean;
    cert?: string;
    key?: string;
    ca?: string;
  };
  
  /** SASL authentication */
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}

/**
 * NATS adapter configuration
 */
export interface NATSAdapterConfig {
  /** NATS servers */
  servers: string[];
  
  /** Connection name */
  name?: string;
  
  /** Subject prefix */
  subjectPrefix?: string;
  
  /** Enable JetStream */
  jetstream?: {
    enabled: boolean;
    stream?: string;
    replicas?: number;
    storage?: 'file' | 'memory';
  };
  
  /** Authentication */
  auth?: {
    token?: string;
    user?: string;
    pass?: string;
    nkey?: string;
    jwt?: string;
  };
  
  /** TLS configuration */
  tls?: {
    enabled: boolean;
    cert?: string;
    key?: string;
    ca?: string;
  };
}

/**
 * Webhook adapter configuration
 */
export interface WebhookAdapterConfig {
  /** Webhook endpoints */
  endpoints: WebhookEndpoint[];
  
  /** Default timeout */
  timeout?: number;
  
  /** Retry configuration */
  retry?: {
    attempts: number;
    delay: number;
    backoff: 'linear' | 'exponential';
  };
  
  /** Security configuration */
  security?: {
    /** Signature algorithm */
    signatureAlgorithm?: 'hmac-sha256' | 'hmac-sha1';
    
    /** Secret key */
    secretKey?: string;
    
    /** Custom headers */
    headers?: Record<string, string>;
  };
  
  /** Rate limiting */
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
}

/**
 * Webhook endpoint configuration
 */
export interface WebhookEndpoint {
  /** Endpoint URL */
  url: string;
  
  /** Event types to send */
  eventTypes: string[];
  
  /** HTTP method */
  method: 'POST' | 'PUT' | 'PATCH';
  
  /** Custom headers */
  headers?: Record<string, string>;
  
  /** Timeout override */
  timeout?: number;
  
  /** Enable this endpoint */
  enabled: boolean;
  
  /** Filter function */
  filter?: (event: EventInterface) => boolean;
}

/**
 * Server-Sent Events (SSE) adapter configuration
 */
export interface SSEAdapterConfig {
  /** HTTP server port */
  port?: number;
  
  /** Endpoint path */
  path: string;
  
  /** CORS configuration */
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  
  /** Authentication */
  auth?: {
    enabled: boolean;
    validateToken: (token: string) => Promise<boolean>;
  };
  
  /** Heartbeat interval */
  heartbeatInterval?: number;
  
  /** Maximum connections */
  maxConnections?: number;
}

/**
 * WebSocket adapter configuration
 */
export interface WebSocketAdapterConfig {
  /** WebSocket server port */
  port?: number;
  
  /** Endpoint path */
  path: string;
  
  /** Enable compression */
  compression?: boolean;
  
  /** Maximum message size */
  maxMessageSize?: number;
  
  /** Authentication */
  auth?: {
    enabled: boolean;
    validateToken: (token: string) => Promise<boolean>;
  };
  
  /** Rate limiting per connection */
  rateLimit?: {
    messages: number;
    window: number; // seconds
  };
  
  /** Heartbeat configuration */
  heartbeat?: {
    interval: number;
    timeout: number;
  };
}

/**
 * Event adapter factory interface
 */
export interface EventAdapterFactoryInterface {
  /** Create a Redis adapter */
  createRedisAdapter(config: RedisAdapterConfig): EventAdapterInterface;
  
  /** Create a RabbitMQ adapter */
  createRabbitMQAdapter(config: RabbitMQAdapterConfig): EventAdapterInterface;
  
  /** Create a Kafka adapter */
  createKafkaAdapter(config: KafkaAdapterConfig): EventAdapterInterface;
  
  /** Create a NATS adapter */
  createNATSAdapter(config: NATSAdapterConfig): EventAdapterInterface;
  
  /** Create a Webhook adapter */
  createWebhookAdapter(config: WebhookAdapterConfig): EventAdapterInterface;
  
  /** Create an SSE adapter */
  createSSEAdapter(config: SSEAdapterConfig): EventAdapterInterface;
  
  /** Create a WebSocket adapter */
  createWebSocketAdapter(config: WebSocketAdapterConfig): EventAdapterInterface;
  
  /** Get supported adapter types */
  getSupportedTypes(): string[];
}
