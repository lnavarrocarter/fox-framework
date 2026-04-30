"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaBuilder = void 0;
class SchemaBuilder {
    constructor(engine, executeRaw) {
        this.engine = engine;
        this.executeRaw = executeRaw;
    }
    async ensureEntities(entities) {
        for (const entity of entities) {
            await this.createTableIfNotExists(entity);
        }
    }
    async createTableIfNotExists(entity) {
        const sql = this.buildCreateTableSQL(entity);
        await this.executeRaw(sql);
        for (const index of entity.indexes ?? []) {
            const indexSql = this.buildCreateIndexSQL(entity.name, index);
            await this.executeRaw(indexSql);
        }
    }
    buildCreateTableSQL(entity) {
        const pg = this.isPostgres();
        const q = pg ? (s) => `"${s}"` : (s) => `\`${s}\``;
        const columnDefs = entity.columns.map((col) => this.buildColumnDef(col, pg, q)).join(', ');
        return `CREATE TABLE IF NOT EXISTS ${q(entity.name)} (${columnDefs})`;
    }
    buildColumnDef(col, pg, q) {
        const typeSql = pg ? this.postgresType(col) : this.mysqlType(col);
        const parts = [q(col.name), typeSql];
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
    postgresType(col) {
        switch (col.type) {
            case 'serial': return 'SERIAL';
            case 'integer': return 'INTEGER';
            case 'bigint': return 'BIGINT';
            case 'smallint': return 'SMALLINT';
            case 'varchar': return col.length ? `VARCHAR(${col.length})` : 'VARCHAR';
            case 'text': return 'TEXT';
            case 'boolean': return 'BOOLEAN';
            case 'timestamp': return 'TIMESTAMP';
            case 'date': return 'DATE';
            case 'decimal': return col.precision != null ? `DECIMAL(${col.precision}, ${col.scale ?? 0})` : 'DECIMAL';
            case 'numeric': return col.precision != null ? `NUMERIC(${col.precision}, ${col.scale ?? 0})` : 'NUMERIC';
            case 'json': return 'JSON';
            case 'jsonb': return 'JSONB';
            case 'uuid': return 'UUID';
            default: return 'TEXT';
        }
    }
    mysqlType(col) {
        switch (col.type) {
            case 'serial': return 'INT AUTO_INCREMENT';
            case 'integer': return 'INT';
            case 'bigint': return 'BIGINT';
            case 'smallint': return 'SMALLINT';
            case 'varchar': return col.length ? `VARCHAR(${col.length})` : 'VARCHAR(255)';
            case 'text': return 'TEXT';
            case 'boolean': return 'TINYINT(1)';
            case 'timestamp': return 'DATETIME';
            case 'date': return 'DATE';
            case 'decimal': return col.precision != null ? `DECIMAL(${col.precision}, ${col.scale ?? 0})` : 'DECIMAL';
            case 'numeric': return col.precision != null ? `DECIMAL(${col.precision}, ${col.scale ?? 0})` : 'DECIMAL';
            case 'json': return 'JSON';
            case 'jsonb': return 'JSON';
            case 'uuid': return 'VARCHAR(36)';
            default: return 'TEXT';
        }
    }
    buildCreateIndexSQL(tableName, index) {
        const pg = this.isPostgres();
        const q = pg ? (s) => `"${s}"` : (s) => `\`${s}\``;
        const unique = index.unique ? 'UNIQUE ' : '';
        const cols = index.columns.map(q).join(', ');
        const idxName = index.name ?? `idx_${tableName}_${index.columns.join('_')}`;
        if (pg) {
            return `CREATE ${unique}INDEX IF NOT EXISTS ${q(idxName)} ON ${q(tableName)} (${cols})`;
        }
        else {
            return `CREATE ${unique}INDEX ${q(idxName)} ON ${q(tableName)} (${cols})`;
        }
    }
    isPostgres() {
        return this.engine === 'postgres' || this.engine === 'aurora-postgres';
    }
    isMySQL() {
        return this.engine === 'mysql' || this.engine === 'aurora-mysql';
    }
}
exports.SchemaBuilder = SchemaBuilder;
//# sourceMappingURL=schema-builder.js.map