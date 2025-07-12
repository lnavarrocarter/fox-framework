/**
 * @fileoverview Query builder implementation
 * @module tsfox/core/features/database/core
 */

import {
  QueryBuilderInterface,
  WhereCondition,
  WhereClause,
  JoinType,
  OrderDirection,
  QueryData,
  QueryType,
  WhereOperator,
  LogicalOperator,
  DatabaseInterface,
  QueryResult
} from '../interfaces';

/**
 * SQL Query Builder implementation
 */
export class SqlQueryBuilder implements QueryBuilderInterface {
  private selectColumns: string[] = ['*'];
  private fromTable: string = '';
  private whereConditions: WhereClause[] = [];
  private joinClauses: JoinClause[] = [];
  private groupByColumns: string[] = [];
  private havingConditions: WhereClause[] = [];
  private orderByColumns: OrderClause[] = [];
  private limitCount?: number;
  private offsetCount?: number;
  private insertData?: Record<string, any>;
  private updateData?: Record<string, any>;
  private queryType: QueryType = 'SELECT';

  constructor(private database: DatabaseInterface) {}

  /**
   * SELECT clause
   */
  select(columns?: string[]): this {
    this.queryType = 'SELECT';
    if (columns && columns.length > 0) {
      this.selectColumns = columns;
    }
    return this;
  }

  /**
   * FROM clause
   */
  from(table: string): this {
    this.fromTable = table;
    return this;
  }

  /**
   * WHERE clause
   */
  where(condition: WhereCondition): this {
    const clause = this.parseWhereCondition(condition);
    clause.connector = 'AND';
    this.whereConditions.push(clause);
    return this;
  }

  /**
   * AND WHERE clause
   */
  andWhere(condition: WhereCondition): this {
    const clause = this.parseWhereCondition(condition);
    clause.connector = 'AND';
    this.whereConditions.push(clause);
    return this;
  }

  /**
   * OR WHERE clause
   */
  orWhere(condition: WhereCondition): this {
    const clause = this.parseWhereCondition(condition);
    clause.connector = 'OR';
    this.whereConditions.push(clause);
    return this;
  }

  /**
   * JOIN clause
   */
  join(table: string, condition: string, type: JoinType = 'INNER'): this {
    this.joinClauses.push({
      type,
      table,
      condition
    });
    return this;
  }

  /**
   * LEFT JOIN clause
   */
  leftJoin(table: string, condition: string): this {
    return this.join(table, condition, 'LEFT');
  }

  /**
   * RIGHT JOIN clause
   */
  rightJoin(table: string, condition: string): this {
    return this.join(table, condition, 'RIGHT');
  }

  /**
   * INNER JOIN clause
   */
  innerJoin(table: string, condition: string): this {
    return this.join(table, condition, 'INNER');
  }

  /**
   * GROUP BY clause
   */
  groupBy(columns: string[]): this {
    this.groupByColumns = columns;
    return this;
  }

  /**
   * HAVING clause
   */
  having(condition: WhereCondition): this {
    const clause = this.parseWhereCondition(condition);
    this.havingConditions.push(clause);
    return this;
  }

  /**
   * ORDER BY clause
   */
  orderBy(column: string, direction: OrderDirection = 'ASC'): this {
    this.orderByColumns.push({ column, direction });
    return this;
  }

  /**
   * LIMIT clause
   */
  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  /**
   * OFFSET clause
   */
  offset(count: number): this {
    this.offsetCount = count;
    return this;
  }

  /**
   * Build query without executing
   */
  build(): QueryData {
    const { sql, params } = this.buildQuery();
    return {
      sql,
      params,
      type: this.queryType,
      metadata: {
        table: this.fromTable,
        joins: this.joinClauses.length,
        conditions: this.whereConditions.length
      }
    };
  }

  /**
   * Execute query
   */
  async execute<T = any>(): Promise<T[]> {
    const { sql, params } = this.buildQuery();
    return this.database.query<T>(sql, params);
  }

  /**
   * Execute and return first result
   */
  async first<T = any>(): Promise<T | null> {
    this.limit(1);
    const results = await this.execute<T>();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute and return count
   */
  async count(): Promise<number> {
    const originalColumns = this.selectColumns;
    this.selectColumns = ['COUNT(*) as count'];
    
    const { sql, params } = this.buildQuery();
    const results = await this.database.query<{ count: number }>(sql, params);
    
    this.selectColumns = originalColumns;
    return results[0]?.count || 0;
  }

  /**
   * INSERT INTO
   */
  async insert(data: Record<string, any>): Promise<QueryResult> {
    this.queryType = 'INSERT';
    this.insertData = data;
    
    const { sql, params } = this.buildInsertQuery();
    return this.database.execute(sql, params);
  }

  /**
   * UPDATE SET
   */
  async update(data: Record<string, any>): Promise<QueryResult> {
    this.queryType = 'UPDATE';
    this.updateData = data;
    
    const { sql, params } = this.buildUpdateQuery();
    return this.database.execute(sql, params);
  }

  /**
   * DELETE FROM
   */
  async delete(): Promise<QueryResult> {
    this.queryType = 'DELETE';
    
    const { sql, params } = this.buildDeleteQuery();
    return this.database.execute(sql, params);
  }

  /**
   * Clone builder
   */
  clone(): QueryBuilderInterface {
    const cloned = new SqlQueryBuilder(this.database);
    cloned.selectColumns = [...this.selectColumns];
    cloned.fromTable = this.fromTable;
    cloned.whereConditions = [...this.whereConditions];
    cloned.joinClauses = [...this.joinClauses];
    cloned.groupByColumns = [...this.groupByColumns];
    cloned.havingConditions = [...this.havingConditions];
    cloned.orderByColumns = [...this.orderByColumns];
    cloned.limitCount = this.limitCount;
    cloned.offsetCount = this.offsetCount;
    cloned.queryType = this.queryType;
    return cloned;
  }

  /**
   * Reset builder
   */
  reset(): this {
    this.selectColumns = ['*'];
    this.fromTable = '';
    this.whereConditions = [];
    this.joinClauses = [];
    this.groupByColumns = [];
    this.havingConditions = [];
    this.orderByColumns = [];
    this.limitCount = undefined;
    this.offsetCount = undefined;
    this.insertData = undefined;
    this.updateData = undefined;
    this.queryType = 'SELECT';
    return this;
  }

  /**
   * Build SELECT query
   */
  private buildQuery(): { sql: string; params: any[] } {
    const params: any[] = [];
    let sql = '';

    switch (this.queryType) {
      case 'SELECT':
        sql = this.buildSelectQuery(params);
        break;
      case 'INSERT':
        return this.buildInsertQuery();
      case 'UPDATE':
        return this.buildUpdateQuery();
      case 'DELETE':
        return this.buildDeleteQuery();
      default:
        throw new Error(`Unsupported query type: ${this.queryType}`);
    }

    return { sql, params };
  }

  /**
   * Build SELECT query string
   */
  private buildSelectQuery(params: any[]): string {
    let sql = `SELECT ${this.selectColumns.join(', ')}`;
    
    if (this.fromTable) {
      sql += ` FROM ${this.fromTable}`;
    }

    // JOIN clauses
    for (const join of this.joinClauses) {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
    }

    // WHERE clauses
    if (this.whereConditions.length > 0) {
      sql += ' WHERE ';
      sql += this.buildWhereClause(this.whereConditions, params);
    }

    // GROUP BY
    if (this.groupByColumns.length > 0) {
      sql += ` GROUP BY ${this.groupByColumns.join(', ')}`;
    }

    // HAVING
    if (this.havingConditions.length > 0) {
      sql += ' HAVING ';
      sql += this.buildWhereClause(this.havingConditions, params);
    }

    // ORDER BY
    if (this.orderByColumns.length > 0) {
      const orderParts = this.orderByColumns.map(order => 
        `${order.column} ${order.direction}`
      );
      sql += ` ORDER BY ${orderParts.join(', ')}`;
    }

    // LIMIT
    if (this.limitCount !== undefined) {
      sql += ` LIMIT ${this.limitCount}`;
    }

    // OFFSET
    if (this.offsetCount !== undefined) {
      sql += ` OFFSET ${this.offsetCount}`;
    }

    return sql;
  }

  /**
   * Build INSERT query
   */
  private buildInsertQuery(): { sql: string; params: any[] } {
    if (!this.insertData || !this.fromTable) {
      throw new Error('INSERT requires table name and data');
    }

    const columns = Object.keys(this.insertData);
    const values = Object.values(this.insertData);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO ${this.fromTable} (${columns.join(', ')}) VALUES (${placeholders})`;
    return { sql, params: values };
  }

  /**
   * Build UPDATE query
   */
  private buildUpdateQuery(): { sql: string; params: any[] } {
    if (!this.updateData || !this.fromTable) {
      throw new Error('UPDATE requires table name and data');
    }

    const params: any[] = [];
    const setParts = Object.entries(this.updateData).map(([key, value]) => {
      params.push(value);
      return `${key} = ?`;
    });

    let sql = `UPDATE ${this.fromTable} SET ${setParts.join(', ')}`;

    if (this.whereConditions.length > 0) {
      sql += ' WHERE ';
      sql += this.buildWhereClause(this.whereConditions, params);
    }

    return { sql, params };
  }

  /**
   * Build DELETE query
   */
  private buildDeleteQuery(): { sql: string; params: any[] } {
    if (!this.fromTable) {
      throw new Error('DELETE requires table name');
    }

    const params: any[] = [];
    let sql = `DELETE FROM ${this.fromTable}`;

    if (this.whereConditions.length > 0) {
      sql += ' WHERE ';
      sql += this.buildWhereClause(this.whereConditions, params);
    }

    return { sql, params };
  }

  /**
   * Build WHERE clause string
   */
  private buildWhereClause(conditions: WhereClause[], params: any[]): string {
    return conditions.map((condition, index) => {
      let clause = '';
      
      if (index > 0 && condition.connector) {
        clause += ` ${condition.connector} `;
      }

      clause += `${condition.column} ${condition.operator}`;

      if (condition.operator !== 'IS NULL' && condition.operator !== 'IS NOT NULL') {
        if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
          const placeholders = Array.isArray(condition.value) 
            ? condition.value.map(() => '?').join(', ')
            : '?';
          clause += ` (${placeholders})`;
          
          if (Array.isArray(condition.value)) {
            params.push(...condition.value);
          } else {
            params.push(condition.value);
          }
        } else if (condition.operator === 'BETWEEN' || condition.operator === 'NOT BETWEEN') {
          clause += ' ? AND ?';
          if (Array.isArray(condition.value) && condition.value.length === 2) {
            params.push(condition.value[0], condition.value[1]);
          } else {
            throw new Error('BETWEEN operator requires array with 2 values');
          }
        } else {
          clause += ' ?';
          params.push(condition.value);
        }
      }

      return clause;
    }).join('');
  }

  /**
   * Parse WHERE condition
   */
  private parseWhereCondition(condition: WhereCondition): WhereClause {
    if (typeof condition === 'string') {
      // Raw SQL condition
      return {
        column: condition,
        operator: '=',
        value: null
      };
    }

    if (this.isWhereClause(condition)) {
      return condition;
    }

    // Object condition
    const entries = Object.entries(condition);
    if (entries.length !== 1) {
      throw new Error('Object WHERE condition must have exactly one key-value pair');
    }

    const [column, value] = entries[0];
    return {
      column,
      operator: '=',
      value
    };
  }

  /**
   * Check if condition is WhereClause
   */
  private isWhereClause(condition: any): condition is WhereClause {
    return condition && 
           typeof condition === 'object' && 
           'column' in condition && 
           'operator' in condition;
  }
}

/**
 * NoSQL Query Builder implementation
 */
export class NoSqlQueryBuilder implements QueryBuilderInterface {
  private collection: string = '';
  private filters: Record<string, any> = {};
  private sortFields: Record<string, 1 | -1> = {};
  private limitCount?: number;
  private offsetCount?: number;
  private selectFields?: string[];
  private updateData?: Record<string, any>;
  private insertData?: Record<string, any>;

  constructor(private database: DatabaseInterface) {}

  select(columns?: string[]): this {
    this.selectFields = columns;
    return this;
  }

  from(collection: string): this {
    this.collection = collection;
    return this;
  }

  where(condition: WhereCondition): this {
    if (typeof condition === 'object' && !this.isWhereClause(condition)) {
      Object.assign(this.filters, condition);
    }
    return this;
  }

  andWhere(condition: WhereCondition): this {
    return this.where(condition);
  }

  orWhere(condition: WhereCondition): this {
    // TODO: Implement OR logic for NoSQL
    return this.where(condition);
  }

  join(): this {
    throw new Error('JOIN not supported in NoSQL query builder');
  }

  leftJoin(): this {
    throw new Error('LEFT JOIN not supported in NoSQL query builder');
  }

  rightJoin(): this {
    throw new Error('RIGHT JOIN not supported in NoSQL query builder');
  }

  innerJoin(): this {
    throw new Error('INNER JOIN not supported in NoSQL query builder');
  }

  groupBy(): this {
    throw new Error('GROUP BY not supported in NoSQL query builder');
  }

  having(): this {
    throw new Error('HAVING not supported in NoSQL query builder');
  }

  orderBy(column: string, direction: OrderDirection = 'ASC'): this {
    this.sortFields[column] = direction === 'ASC' ? 1 : -1;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  offset(count: number): this {
    this.offsetCount = count;
    return this;
  }

  build(): QueryData {
    return {
      sql: JSON.stringify({
        collection: this.collection,
        filters: this.filters,
        sort: this.sortFields,
        limit: this.limitCount,
        offset: this.offsetCount,
        select: this.selectFields
      }),
      params: [],
      type: 'SELECT'
    };
  }

  async execute<T = any>(): Promise<T[]> {
    // TODO: Implement NoSQL query execution
    throw new Error('NoSQL execution not implemented');
  }

  async first<T = any>(): Promise<T | null> {
    this.limit(1);
    const results = await this.execute<T>();
    return results.length > 0 ? results[0] : null;
  }

  async count(): Promise<number> {
    // TODO: Implement NoSQL count
    throw new Error('NoSQL count not implemented');
  }

  async insert(data: Record<string, any>): Promise<QueryResult> {
    this.insertData = data;
    // TODO: Implement NoSQL insert
    throw new Error('NoSQL insert not implemented');
  }

  async update(data: Record<string, any>): Promise<QueryResult> {
    this.updateData = data;
    // TODO: Implement NoSQL update
    throw new Error('NoSQL update not implemented');
  }

  async delete(): Promise<QueryResult> {
    // TODO: Implement NoSQL delete
    throw new Error('NoSQL delete not implemented');
  }

  clone(): QueryBuilderInterface {
    const cloned = new NoSqlQueryBuilder(this.database);
    cloned.collection = this.collection;
    cloned.filters = { ...this.filters };
    cloned.sortFields = { ...this.sortFields };
    cloned.limitCount = this.limitCount;
    cloned.offsetCount = this.offsetCount;
    cloned.selectFields = this.selectFields ? [...this.selectFields] : undefined;
    return cloned;
  }

  reset(): this {
    this.collection = '';
    this.filters = {};
    this.sortFields = {};
    this.limitCount = undefined;
    this.offsetCount = undefined;
    this.selectFields = undefined;
    this.updateData = undefined;
    this.insertData = undefined;
    return this;
  }

  private isWhereClause(condition: any): condition is WhereClause {
    return condition && 
           typeof condition === 'object' && 
           'column' in condition && 
           'operator' in condition;
  }
}

/**
 * Query builder factory
 */
export class QueryBuilderFactory {
  /**
   * Create SQL query builder
   */
  static createSqlBuilder(database: DatabaseInterface): QueryBuilderInterface {
    return new SqlQueryBuilder(database);
  }

  /**
   * Create NoSQL query builder
   */
  static createNoSqlBuilder(database: DatabaseInterface): QueryBuilderInterface {
    return new NoSqlQueryBuilder(database);
  }

  /**
   * Create query builder based on database type
   */
  static create(database: DatabaseInterface, type: 'sql' | 'nosql' = 'sql'): QueryBuilderInterface {
    switch (type) {
      case 'sql':
        return this.createSqlBuilder(database);
      case 'nosql':
        return this.createNoSqlBuilder(database);
      default:
        throw new Error(`Unknown query builder type: ${type}`);
    }
  }
}

/**
 * Join clause interface
 */
interface JoinClause {
  type: JoinType;
  table: string;
  condition: string;
}

/**
 * Order clause interface
 */
interface OrderClause {
  column: string;
  direction: OrderDirection;
}
