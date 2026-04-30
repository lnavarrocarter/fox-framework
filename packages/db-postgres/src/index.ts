export { PostgresProvider } from './provider';
export { PostgresRepository } from './repository';
export { PostgresQueryBuilder } from './query-builder';

// Re-export interfaces from core for convenience
export type {
  IDbProvider,
  IRepository,
  IQueryBuilder,
  DbConfig,
  DbPoolConfig,
  QueryResult,
  FindOptions,
  WhereOptions,
  OrderDirection,
  ComparisonOperator,
  WhereClause,
} from '@foxframework/core';
