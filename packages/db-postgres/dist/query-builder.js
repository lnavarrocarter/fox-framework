"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresQueryBuilder = void 0;
/**
 * PostgresQueryBuilder — fluent SQL SELECT builder for PostgreSQL.
 *
 * Produces parameterised queries (never interpolates values).
 *
 * ```ts
 * const results = await db.queryBuilder<User>()
 *   .from('users')
 *   .select('id', 'name', 'email')
 *   .where('active', '=', true)
 *   .orderBy('name')
 *   .limit(20)
 *   .execute();
 * ```
 */
class PostgresQueryBuilder {
    constructor(getPool) {
        this.getPool = getPool;
        this._table = '';
        this._columns = ['*'];
        this._wheres = [];
        this._orderBy = null;
        this._limit = null;
        this._offset = null;
    }
    from(table) {
        this._table = table;
        return this;
    }
    select(...columns) {
        this._columns = columns.length > 0 ? columns : ['*'];
        return this;
    }
    where(column, operator, value) {
        this._wheres.push({ type: 'AND', clause: { column, operator, value } });
        return this;
    }
    andWhere(column, operator, value) {
        return this.where(column, operator, value);
    }
    orWhere(column, operator, value) {
        this._wheres.push({ type: 'OR', clause: { column, operator, value } });
        return this;
    }
    orderBy(column, direction = 'ASC') {
        this._orderBy = { column, direction };
        return this;
    }
    limit(n) {
        this._limit = n;
        return this;
    }
    offset(n) {
        this._offset = n;
        return this;
    }
    // ---------------------------------------------------------------------------
    // Build
    // ---------------------------------------------------------------------------
    toSQL() {
        if (!this._table) {
            throw new Error('QueryBuilder: table name is required — call .from(table)');
        }
        const params = [];
        let paramIdx = 1;
        const cols = this._columns.join(', ');
        let sql = `SELECT ${cols} FROM ${this._table}`;
        if (this._wheres.length > 0) {
            const conditions = this._wheres.map((w, i) => {
                const op = w.clause.operator;
                let condition;
                if (op === 'IN' || op === 'NOT IN') {
                    const values = w.clause.value;
                    const placeholders = values.map(() => `$${paramIdx++}`).join(', ');
                    params.push(...values);
                    condition = `${w.clause.column} ${op} (${placeholders})`;
                }
                else {
                    params.push(w.clause.value);
                    condition = `${w.clause.column} ${op} $${paramIdx++}`;
                }
                return i === 0 ? condition : `${w.type} ${condition}`;
            });
            sql += ` WHERE ${conditions.join(' ')}`;
        }
        if (this._orderBy) {
            sql += ` ORDER BY ${this._orderBy.column} ${this._orderBy.direction}`;
        }
        if (this._limit !== null) {
            sql += ` LIMIT $${paramIdx++}`;
            params.push(this._limit);
        }
        if (this._offset !== null) {
            sql += ` OFFSET $${paramIdx++}`;
            params.push(this._offset);
        }
        return { sql, params };
    }
    async execute() {
        const { sql, params } = this.toSQL();
        const pool = this.getPool();
        const result = await pool.query(sql, params);
        return {
            rows: result.rows,
            rowCount: result.rowCount ?? 0,
            raw: result,
        };
    }
}
exports.PostgresQueryBuilder = PostgresQueryBuilder;
//# sourceMappingURL=query-builder.js.map