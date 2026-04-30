"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresRepository = void 0;
const query_builder_1 = require("./query-builder");
/**
 * PostgresRepository<T, PK> — CRUD operations for a single table.
 *
 * ```ts
 * interface User { id: number; name: string; email: string; active: boolean }
 *
 * const users = db.repository<User>('users');
 * const alice  = await users.findById(1);
 * const all    = await users.findAll({ where: { active: true }, limit: 50 });
 * const created = await users.create({ name: 'Bob', email: 'bob@example.com', active: true });
 * await users.update(1, { name: 'Alice Smith' });
 * await users.delete(1);
 * ```
 */
class PostgresRepository {
    constructor(table, getPool) {
        this.table = table;
        this.getPool = getPool;
    }
    // ---------------------------------------------------------------------------
    // Reads
    // ---------------------------------------------------------------------------
    async findById(id) {
        const result = await this.rawQuery(`SELECT * FROM ${this.table} WHERE id = $1 LIMIT 1`, [id]);
        return result.rows[0] ?? null;
    }
    async findOne(options) {
        const opts = { ...options, limit: 1 };
        const rows = await this.findAll(opts);
        return rows[0] ?? null;
    }
    async findAll(options = {}) {
        const { sql, params } = this.buildSelectSQL(options);
        const result = await this.rawQuery(sql, params);
        return result.rows;
    }
    async count(options = {}) {
        const { whereSQL, params } = this.buildWhereSQL(options.where, 1);
        const sql = `SELECT COUNT(*) AS count FROM ${this.table}${whereSQL}`;
        const result = await this.rawQuery(sql, params);
        return parseInt(result.rows[0]?.count ?? '0', 10);
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
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO ${this.table} (${cols}) VALUES (${placeholders}) RETURNING *`;
        const result = await this.rawQuery(sql, values);
        if (!result.rows[0]) {
            throw new Error(`Repository.create: INSERT did not return a row`);
        }
        return result.rows[0];
    }
    async update(id, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        if (keys.length === 0) {
            return this.findById(id);
        }
        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        const idPlaceholder = `$${keys.length + 1}`;
        const sql = `UPDATE ${this.table} SET ${setClause} WHERE id = ${idPlaceholder} RETURNING *`;
        const result = await this.rawQuery(sql, [...values, id]);
        return result.rows[0] ?? null;
    }
    async delete(id) {
        const result = await this.rawQuery(`DELETE FROM ${this.table} WHERE id = $1`, [id]);
        return (result.rowCount ?? 0) > 0;
    }
    // ---------------------------------------------------------------------------
    // QueryBuilder
    // ---------------------------------------------------------------------------
    query() {
        return new query_builder_1.PostgresQueryBuilder(this.getPool).from(this.table);
    }
    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------
    buildWhereSQL(where, startIdx) {
        if (!where || Object.keys(where).length === 0) {
            return { whereSQL: '', params: [] };
        }
        const entries = Object.entries(where);
        const conditions = entries.map(([col], i) => `${col} = $${startIdx + i}`);
        return {
            whereSQL: ` WHERE ${conditions.join(' AND ')}`,
            params: entries.map(([, v]) => v),
        };
    }
    buildSelectSQL(options) {
        let paramIdx = 1;
        const params = [];
        let sql = `SELECT * FROM ${this.table}`;
        if (options.where && Object.keys(options.where).length > 0) {
            const entries = Object.entries(options.where);
            const conditions = entries.map(([col]) => `${col} = $${paramIdx++}`);
            params.push(...entries.map(([, v]) => v));
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        if (options.orderBy) {
            const dir = options.orderBy.direction ?? 'ASC';
            sql += ` ORDER BY ${options.orderBy.column} ${dir}`;
        }
        if (options.limit !== undefined) {
            sql += ` LIMIT $${paramIdx++}`;
            params.push(options.limit);
        }
        if (options.offset !== undefined) {
            sql += ` OFFSET $${paramIdx++}`;
            params.push(options.offset);
        }
        return { sql, params };
    }
    async rawQuery(sql, params = []) {
        const pool = this.getPool();
        const result = await pool.query(sql, params);
        return {
            rows: result.rows,
            rowCount: result.rowCount ?? 0,
            raw: result,
        };
    }
}
exports.PostgresRepository = PostgresRepository;
//# sourceMappingURL=repository.js.map