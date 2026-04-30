import type { EntityDefinition, IndexDefinition, RdsEngine } from '@foxframework/core';
export declare class SchemaBuilder {
    private readonly engine;
    private readonly executeRaw;
    constructor(engine: RdsEngine, executeRaw: (sql: string) => Promise<void>);
    ensureEntities(entities: EntityDefinition[]): Promise<void>;
    private createTableIfNotExists;
    buildCreateTableSQL(entity: EntityDefinition): string;
    private buildColumnDef;
    private postgresType;
    private mysqlType;
    buildCreateIndexSQL(tableName: string, index: IndexDefinition): string;
    private isPostgres;
    private isMySQL;
}
//# sourceMappingURL=schema-builder.d.ts.map