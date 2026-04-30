"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLProvider = void 0;
const query_builder_1 = require("./query-builder");
const repository_1 = require("./repository");
/**
 * MySQLProvider — manages a `mysql2` Pool and exposes Repository + QueryBuilder.
 *
 * Usage:
 * ```ts
 * import { MySQLProvider } from '@foxframework/db-mysql';
 *
 * const db = new MySQLProvider({
 *   host: 'localhost', port: 3306,
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
class MySQLProvider {
    constructor(config) {
        this.pool = null;
        this._isConnected = false;
        this.config = config;
    }
    get isConnected() {
        return this._isConnected;
    }
    async connect() {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mysql = require('mysql2/promise');
        this.pool = mysql.createPool({
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            ssl: this.config.ssl,
            connectionLimit: this.config.pool?.max ?? 10,
            waitForConnections: true,
            queueLimit: 0,
        });
        // Validate the connection immediately
        const conn = await this.pool.getConnection();
        conn.release();
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
        const [rows] = await pool.execute(sql, params);
        const rowArray = rows;
        return {
            rows: rowArray,
            rowCount: rowArray.length,
            raw: rows,
        };
    }
    repository(table) {
        return new repository_1.MySQLRepository(table, this.requirePool.bind(this));
    }
    queryBuilder() {
        return new query_builder_1.MySQLQueryBuilder(this.requirePool.bind(this));
    }
    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------
    /** @internal */
    requirePool() {
        if (!this.pool) {
            throw new Error('MySQLProvider is not connected. Call connect() before executing queries.');
        }
        return this.pool;
    }
}
exports.MySQLProvider = MySQLProvider;
//# sourceMappingURL=provider.js.map