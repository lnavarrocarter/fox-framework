export { MySQLProvider } from './provider';
export { MySQLRepository } from './repository';
export { MySQLQueryBuilder } from './query-builder';

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
