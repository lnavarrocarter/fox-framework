/**
 * @fileoverview Database interfaces index
 * @module tsfox/core/features/database/interfaces
 */

// Export all interfaces from core modules
export * from './database.interface';
export * from './provider.interface';

// Export model interfaces with specific exports to avoid conflicts
export {
  ModelInterface,
  RepositoryInterface,
  ActiveRecordInterface,
  EntityInterface,
  ValidationResult,
  ValidationError,
  QueryScopeInterface,
  ModelEventsInterface
} from './model.interface';

// Export config interfaces with specific exports to avoid conflicts
export {
  DatabaseConfig,
  DatabaseConfigFactory,
  PoolConfig,
  SSLConfig,
  LoggingConfig,
  MigrationConfig,
  SchemaConfig,
  CacheConfig,
  ReplicationConfig,
  ShardingConfig,
  BackupConfig,
  MonitoringConfig
} from './config.interface';

// Re-export key types with aliases to resolve conflicts
export type { ValidationType as ModelValidationType } from './model.interface';
export type { ValidationType as ProviderValidationType } from './provider.interface';
export type { ValidationRule as ConfigValidationRule } from './config.interface';
