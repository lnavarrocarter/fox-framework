"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresProvider = void 0;
const query_builder_1 = require("./query-builder");
const repository_1 = require("./repository");
/**
 * PostgresProvider — manages a `pg.Pool` and exposes Repository + QueryBuilder.
 *
 * Usage:
 * ```ts
 * import { PostgresProvider } from '@foxframework/db-postgres';
 *
 * const db = new PostgresProvider({
 *   host: 'localhost', port: 5432,
 *   database: 'mydb', user: 'admin', password: 'secret',
 *   pool: { min: 2, max: 10 },
 * });
 *
 * await db.connect();
 * const users = db.repository<User>('users');
 * const found  = await users.findById(1);
 * await db.disconnect();
 * ```
 */
class PostgresProvider {
    constructor(config) {
        this.pool = null;
        this._isConnected = false;
        this.config = config;
    }
    get isConnected() {
        return this._isConnected;
    }
    async connect() {
        // Lazy-require so users who don't install pg get a clear error
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Pool } = require('pg');
        const poolConfig = {
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            ssl: this.config.ssl,
            min: this.config.pool?.min ?? 2,
            max: this.config.pool?.max ?? 10,
            idleTimeoutMillis: this.config.pool?.idleTimeoutMillis ?? 30000,
            connectionTimeoutMillis: this.config.pool?.acquireTimeoutMillis ?? 5000,
        };
        this.pool = new Pool(poolConfig);
        // Validate the connection immediately
        const client = await this.pool.connect();
        client.release();
        this._isConnected = true;
    }
    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
        this._isConnected = false;
    }
    async raw(sql, params = []) {
        const pool = this.requirePool();
        const result = await pool.query(sql, params);
        return {
            rows: result.rows,
            rowCount: result.rowCount ?? 0,
            raw: result,
        };
    }
    repository(table) {
        return new repository_1.PostgresRepository(table, this.requirePool.bind(this));
    }
    queryBuilder() {
        return new query_builder_1.PostgresQueryBuilder(this.requirePool.bind(this));
    }
    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------
    /** @internal */
    requirePool() {
        if (!this.pool) {
            throw new Error('PostgresProvider is not connected. Call connect() before executing queries.');
        }
        return this.pool;
    }
}
exports.PostgresProvider = PostgresProvider;
//# sourceMappingURL=provider.js.map