"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLRepository = void 0;
const query_builder_1 = require("./query-builder");
/**
 * MySQLRepository<T, PK> — CRUD operations for a single table.
 *
 * ```ts
 * interface User { id: number; name: string; email: string; active: boolean }
 *
 * const users = db.repository<User>('users');
 * const alice   = await users.findById(1);
 * const all     = await users.findAll({ where: { active: true }, limit: 50 });
 * const created = await users.create({ name: 'Bob', email: 'bob@example.com', active: true });
 * await users.update(1, { name: 'Alice Smith' });
 * await users.delete(1);
 * ```
 */
class MySQLRepository {
    constructor(table, getPool) {
        this.table = table;
        this.getPool = getPool;
    }
    // ---------------------------------------------------------------------------
    // Reads
    // ---------------------------------------------------------------------------
    async findById(id) {
        const result = await this.rawQuery(`SELECT * FROM \`${this.table}\` WHERE id = ? LIMIT 1`, [id]);
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
        const { whereSQL, params } = this.buildWhereSQL(options.where);
        const sql = `SELECT COUNT(*) AS count FROM \`${this.table}\`${whereSQL}`;
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
        const cols = keys.map(k => `\`${k}\``).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO \`${this.table}\` (${cols}) VALUES (${placeholders})`;
        const pool = this.getPool();
        const [result] = await pool.execute(sql, values);
        const insertId = result.insertId;
        const [rows] = await pool.execute(`SELECT * FROM \`${this.table}\` WHERE id = ? LIMIT 1`, [insertId]);
        const rowArray = rows;
        if (!rowArray[0]) {
            throw new Error(`Repository.create: INSERT did not return a row`);
        }
        return rowArray[0];
    }
    async update(id, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        if (keys.length === 0) {
            return this.findById(id);
        }
        const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
        const sql = `UPDATE \`${this.table}\` SET ${setClause} WHERE id = ?`;
        await this.rawQuery(sql, [...values, id]);
        return this.findById(id);
    }
    async delete(id) {
        const result = await this.rawQuery(`DELETE FROM \`${this.table}\` WHERE id = ?`, [id]);
        return (result.rowCount ?? 0) > 0;
    }
    // ---------------------------------------------------------------------------
    // QueryBuilder
    // ---------------------------------------------------------------------------
    query() {
        return new query_builder_1.MySQLQueryBuilder(this.getPool).from(this.table);
    }
    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------
    buildWhereSQL(where) {
        if (!where || Object.keys(where).length === 0) {
            return { whereSQL: '', params: [] };
        }
        const entries = Object.entries(where);
        const conditions = entries.map(([col]) => `\`${col}\` = ?`);
        return {
            whereSQL: ` WHERE ${conditions.join(' AND ')}`,
            params: entries.map(([, v]) => v),
        };
    }
    buildSelectSQL(options) {
        const params = [];
        let sql = `SELECT * FROM \`${this.table}\``;
        if (options.where && Object.keys(options.where).length > 0) {
            const entries = Object.entries(options.where);
            const conditions = entries.map(([col]) => `\`${col}\` = ?`);
            params.push(...entries.map(([, v]) => v));
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        if (options.orderBy) {
            const dir = options.orderBy.direction ?? 'ASC';
            sql += ` ORDER BY \`${options.orderBy.column}\` ${dir}`;
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
    async rawQuery(sql, params = []) {
        const pool = this.getPool();
        const [rows] = await pool.execute(sql, params);
        const rowArray = rows;
        return {
            rows: rowArray,
            rowCount: rows.affectedRows ?? rowArray.length,
            raw: rows,
        };
    }
}
exports.MySQLRepository = MySQLRepository;
//# sourceMappingURL=repository.js.map