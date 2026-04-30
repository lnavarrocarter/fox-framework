"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteRepository = void 0;
const query_builder_1 = require("./query-builder");
/**
 * SQLiteRepository<T, PK> — CRUD operations for a single SQLite table.
 *
 * ```ts
 * interface User { id: number; name: string; email: string }
 *
 * const users = db.repository<User>('users');
 * const alice   = await users.findById(1);
 * const all     = await users.findAll({ where: { name: 'Alice' } });
 * const created = await users.create({ name: 'Bob', email: 'bob@example.com' });
 * await users.update(1, { name: 'Alice Smith' });
 * await users.delete(1);
 * ```
 */
class SQLiteRepository {
    constructor(table, getDb) {
        this.table = table;
        this.getDb = getDb;
    }
    // ---------------------------------------------------------------------------
    // Reads
    // ---------------------------------------------------------------------------
    findById(id) {
        const db = this.getDb();
        const row = db.prepare(`SELECT * FROM ${this.table} WHERE id = ? LIMIT 1`).get(id);
        return Promise.resolve(row ?? null);
    }
    async findOne(options) {
        const opts = { ...options, limit: 1 };
        const rows = await this.findAll(opts);
        return rows[0] ?? null;
    }
    findAll(options = {}) {
        const { sql, params } = this.buildSelectSQL(options);
        const db = this.getDb();
        const rows = db.prepare(sql).all(...params);
        return Promise.resolve(rows);
    }
    count(options = {}) {
        const { whereSQL, params } = this.buildWhereSQL(options.where);
        const sql = `SELECT COUNT(*) AS count FROM ${this.table}${whereSQL}`;
        const db = this.getDb();
        const row = db.prepare(sql).get(...params);
        return Promise.resolve(row?.count ?? 0);
    }
    // ---------------------------------------------------------------------------
    // Writes
    // ---------------------------------------------------------------------------
    async create(data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        if (keys.length === 0) {
            throw new Error(`Repository.create: data object must have at least one field`);
        }
        const cols = keys.join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${this.table} (${cols}) VALUES (${placeholders}) RETURNING *`;
        const db = this.getDb();
        const row = db.prepare(sql).get(...values);
        if (!row) {
            throw new Error(`Repository.create: INSERT did not return a row`);
        }
        return Promise.resolve(row);
    }
    update(id, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        if (keys.length === 0) {
            return this.findById(id);
        }
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const sql = `UPDATE ${this.table} SET ${setClause} WHERE id = ? RETURNING *`;
        const db = this.getDb();
        const row = db.prepare(sql).get(...values, id);
        return Promise.resolve(row ?? null);
    }
    delete(id) {
        const db = this.getDb();
        const result = db.prepare(`DELETE FROM ${this.table} WHERE id = ?`).run(id);
        return Promise.resolve(result.changes > 0);
    }
    // ---------------------------------------------------------------------------
    // QueryBuilder
    // ---------------------------------------------------------------------------
    query() {
        return new query_builder_1.SQLiteQueryBuilder(this.getDb).from(this.table);
    }
    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------
    buildWhereSQL(where) {
        if (!where || Object.keys(where).length === 0) {
            return { whereSQL: '', params: [] };
        }
        const entries = Object.entries(where);
        const conditions = entries.map(([col]) => `${col} = ?`);
        return {
            whereSQL: ` WHERE ${conditions.join(' AND ')}`,
            params: entries.map(([, v]) => v),
        };
    }
    buildSelectSQL(options) {
        const params = [];
        let sql = `SELECT * FROM ${this.table}`;
        if (options.where && Object.keys(options.where).length > 0) {
            const entries = Object.entries(options.where);
            const conditions = entries.map(([col]) => `${col} = ?`);
            params.push(...entries.map(([, v]) => v));
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        if (options.orderBy) {
            const dir = options.orderBy.direction ?? 'ASC';
            sql += ` ORDER BY ${options.orderBy.column} ${dir}`;
        }
        if (options.limit !== undefined) {
            sql += ` LIMIT ?`;
            params.push(options.limit);
        }
        if (options.offset !== undefined) {
            sql += ` OFFSET ?`;
            params.push(options.offset);
        }
        return { sql, params };
    }
    /** @internal */
    rawQuery(sql, params = []) {
        const db = this.getDb();
        const rows = db.prepare(sql).all(...params);
        return Promise.resolve({ rows, rowCount: rows.length });
    }
}
exports.SQLiteRepository = SQLiteRepository;
//# sourceMappingURL=repository.js.map