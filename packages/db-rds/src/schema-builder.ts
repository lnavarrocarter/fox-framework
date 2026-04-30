import type { EntityDefinition, EntityColumn, IndexDefinition, RdsEngine, SqlColumnType } from '@foxframework/core';

export class SchemaBuilder {
  constructor(
    private readonly engine: RdsEngine,
    private readonly executeRaw: (sql: string) => Promise<void>,
  ) {}

  async ensureEntities(entities: EntityDefinition[]): Promise<void> {
    for (const entity of entities) {
      await this.createTableIfNotExists(entity);
    }
  }

  private async createTableIfNotExists(entity: EntityDefinition): Promise<void> {
    const sql = this.buildCreateTableSQL(entity);
    await this.executeRaw(sql);
    for (const index of entity.indexes ?? []) {
      const indexSql = this.buildCreateIndexSQL(entity.name, index);
      await this.executeRaw(indexSql);
    }
  }

  buildCreateTableSQL(entity: EntityDefinition): string {
    const pg = this.isPostgres();
    const q = pg ? (s: string) => `"${s}"` : (s: string) => `\`${s}\``;

    const columnDefs = entity.columns.map((col) => this.buildColumnDef(col, pg, q)).join(', ');
    return `CREATE TABLE IF NOT EXISTS ${q(entity.name)} (${columnDefs})`;
  }

  private buildColumnDef(
    col: EntityColumn,
    pg: boolean,
    q: (s: string) => string,
  ): string {
    const typeSql = pg ? this.postgresType(col) : this.mysqlType(col);
    const parts: string[] = [q(col.name), typeSql];

    if (col.primaryKey) {
      parts.push('PRIMARY KEY');
    }
    if (col.nullable === false && !col.primaryKey) {
      parts.push('NOT NULL');
    }
    if (col.unique) {
      parts.push('UNIQUE');
    }
    if (col.default !== undefined) {
      parts.push(`DEFAULT ${col.default}`);
    }

    return parts.join(' ');
  }

  private postgresType(col: EntityColumn): string {
    switch (col.type as SqlColumnType) {
      case 'serial':    return 'SERIAL';
      case 'integer':   return 'INTEGER';
      case 'bigint':    return 'BIGINT';
      case 'smallint':  return 'SMALLINT';
      case 'varchar':   return col.length ? `VARCHAR(${col.length})` : 'VARCHAR';
      case 'text':      return 'TEXT';
      case 'boolean':   return 'BOOLEAN';
      case 'timestamp': return 'TIMESTAMP';
      case 'date':      return 'DATE';
      case 'decimal':   return col.precision != null ? `DECIMAL(${col.precision}, ${col.scale ?? 0})` : 'DECIMAL';
      case 'numeric':   return col.precision != null ? `NUMERIC(${col.precision}, ${col.scale ?? 0})` : 'NUMERIC';
      case 'json':      return 'JSON';
      case 'jsonb':     return 'JSONB';
      case 'uuid':      return 'UUID';
      default:          return 'TEXT';
    }
  }

  private mysqlType(col: EntityColumn): string {
    switch (col.type as SqlColumnType) {
      case 'serial':    return 'INT AUTO_INCREMENT';
      case 'integer':   return 'INT';
      case 'bigint':    return 'BIGINT';
      case 'smallint':  return 'SMALLINT';
      case 'varchar':   return col.length ? `VARCHAR(${col.length})` : 'VARCHAR(255)';
      case 'text':      return 'TEXT';
      case 'boolean':   return 'TINYINT(1)';
      case 'timestamp': return 'DATETIME';
      case 'date':      return 'DATE';
      case 'decimal':   return col.precision != null ? `DECIMAL(${col.precision}, ${col.scale ?? 0})` : 'DECIMAL';
      case 'numeric':   return col.precision != null ? `DECIMAL(${col.precision}, ${col.scale ?? 0})` : 'DECIMAL';
      case 'json':      return 'JSON';
      case 'jsonb':     return 'JSON';
      case 'uuid':      return 'VARCHAR(36)';
      default:          return 'TEXT';
    }
  }

  buildCreateIndexSQL(tableName: string, index: IndexDefinition): string {
    const pg = this.isPostgres();
    const q = pg ? (s: string) => `"${s}"` : (s: string) => `\`${s}\``;
    const unique = index.unique ? 'UNIQUE ' : '';
    const cols = index.columns.map(q).join(', ');
    const idxName = index.name ?? `idx_${tableName}_${index.columns.join('_')}`;

    if (pg) {
      return `CREATE ${unique}INDEX IF NOT EXISTS ${q(idxName)} ON ${q(tableName)} (${cols})`;
    } else {
      return `CREATE ${unique}INDEX ${q(idxName)} ON ${q(tableName)} (${cols})`;
    }
  }

  private isPostgres(): boolean {
    return this.engine === 'postgres' || this.engine === 'aurora-postgres';
  }

  private isMySQL(): boolean {
    return this.engine === 'mysql' || this.engine === 'aurora-mysql';
  }
}
