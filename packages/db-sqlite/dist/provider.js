"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteProvider = void 0;
const query_builder_1 = require("./query-builder");
const repository_1 = require("./repository");
/**
 * SQLiteProvider — manages a `better-sqlite3` Database connection.
 *
 * Usage:
 * ```ts
 * import { SQLiteProvider } from '@foxframework/db-sqlite';
 *
 * const db = new SQLiteProvider({ filename: './mydb.sqlite' });
 * // or in-memory:
 * const db = new SQLiteProvider({ filename: ':memory:' });
 *
 * await db.connect();
 * const users = db.repository<User>('users');
 * const found  = await users.findById(1);
 * await db.disconnect();
 * ```
 */
class SQLiteProvider {
    constructor(config) {
        this.db = null;
        this._isConnected = false;
        this.config = config;
    }
    get isConnected() {
        return this._isConnected;
    }
    connect() {
        // Lazy-require so users who don't install better-sqlite3 get a clear error
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const BetterSqlite3 = require('better-sqlite3');
        this.db = new BetterSqlite3(this.config.filename, {
            readonly: this.config.readonly ?? false,
        });
        // Validate connection
        this.db.prepare('SELECT 1').get();
        this._isConnected = true;
        return Promise.resolve();
    }
    disconnect() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this._isConnected = false;
        return Promise.resolve();
    }
    async raw(sql, params = []) {
        const db = this.requireDb();
        const rows = db.prepare(sql).all(...params);
        return Promise.resolve({
            rows,
            rowCount: rows.length,
        });
    }
    repository(table) {
        return new repository_1.SQLiteRepository(table, this.requireDb.bind(this));
    }
    queryBuilder() {
        return new query_builder_1.SQLiteQueryBuilder(this.requireDb.bind(this));
    }
    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------
    /** @internal */
    requireDb() {
        if (!this.db) {
            throw new Error('SQLiteProvider is not connected. Call connect() before executing queries.');
        }
        return this.db;
    }
}
exports.SQLiteProvider = SQLiteProvider;
//# sourceMappingURL=provider.js.map