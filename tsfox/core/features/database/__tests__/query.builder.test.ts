/**
 * @fileoverview Query builder tests
 * @module tsfox/core/features/database/__tests__
 */

import { SqlQueryBuilder, QueryBuilderFactory } from '../core/query.builder';
import { FoxDatabase } from '../database.factory';
import { DatabaseConfig } from '../interfaces';

describe('SqlQueryBuilder', () => {
  let database: FoxDatabase;
  let builder: SqlQueryBuilder;

  beforeEach(async () => {
    const config: DatabaseConfig = {
      provider: 'memory',
      database: 'test_db'
    };
    database = new FoxDatabase(config);
    await database.connect();
    builder = new SqlQueryBuilder(database);
  });

  afterEach(async () => {
    await database.close();
  });

  describe('SELECT queries', () => {
    it('should build simple SELECT query', () => {
      const { sql, params } = builder
        .select(['id', 'name'])
        .from('users')
        .build();

      expect(sql).toBe('SELECT id, name FROM users');
      expect(params).toEqual([]);
    });

    it('should build SELECT with WHERE clause', () => {
      const { sql, params } = builder
        .select()
        .from('users')
        .where({ id: 1 })
        .build();

      expect(sql).toBe('SELECT * FROM users WHERE id = ?');
      expect(params).toEqual([1]);
    });

    it('should build SELECT with multiple WHERE clauses', () => {
      const { sql, params } = builder
        .select()
        .from('users')
        .where({ active: true })
        .andWhere({ role: 'admin' })
        .build();

      expect(sql).toBe('SELECT * FROM users WHERE active = ? AND role = ?');
      expect(params).toEqual([true, 'admin']);
    });

    it('should build SELECT with OR WHERE clause', () => {
      const { sql, params } = builder
        .select()
        .from('users')
        .where({ role: 'admin' })
        .orWhere({ role: 'moderator' })
        .build();

      expect(sql).toBe('SELECT * FROM users WHERE role = ? OR role = ?');
      expect(params).toEqual(['admin', 'moderator']);
    });

    it('should build SELECT with JOIN', () => {
      const { sql } = builder
        .select(['u.name', 'p.title'])
        .from('users u')
        .join('posts p', 'u.id = p.user_id')
        .build();

      expect(sql).toBe('SELECT u.name, p.title FROM users u INNER JOIN posts p ON u.id = p.user_id');
    });

    it('should build SELECT with LEFT JOIN', () => {
      const { sql } = builder
        .select()
        .from('users u')
        .leftJoin('profiles p', 'u.id = p.user_id')
        .build();

      expect(sql).toBe('SELECT * FROM users u LEFT JOIN profiles p ON u.id = p.user_id');
    });

    it('should build SELECT with ORDER BY', () => {
      const { sql } = builder
        .select()
        .from('users')
        .orderBy('name', 'ASC')
        .orderBy('created_at', 'DESC')
        .build();

      expect(sql).toBe('SELECT * FROM users ORDER BY name ASC, created_at DESC');
    });

    it('should build SELECT with GROUP BY and HAVING', () => {
      const { sql, params } = builder
        .select(['department', 'COUNT(*) as count'])
        .from('employees')
        .groupBy(['department'])
        .having({ count: 5 })
        .build();

      expect(sql).toBe('SELECT department, COUNT(*) as count FROM employees GROUP BY department HAVING count = ?');
      expect(params).toEqual([5]);
    });

    it('should build SELECT with LIMIT and OFFSET', () => {
      const { sql } = builder
        .select()
        .from('users')
        .limit(10)
        .offset(20)
        .build();

      expect(sql).toBe('SELECT * FROM users LIMIT 10 OFFSET 20');
    });

    it('should build complex SELECT query', () => {
      const { sql, params } = builder
        .select(['u.id', 'u.name', 'COUNT(p.id) as post_count'])
        .from('users u')
        .leftJoin('posts p', 'u.id = p.user_id')
        .where({ 'u.active': true })
        .andWhere({ 'u.role': 'author' })
        .groupBy(['u.id', 'u.name'])
        .having({ post_count: 5 })
        .orderBy('post_count', 'DESC')
        .limit(20)
        .build();

      const expectedSql = 'SELECT u.id, u.name, COUNT(p.id) as post_count FROM users u ' +
                         'LEFT JOIN posts p ON u.id = p.user_id ' +
                         'WHERE u.active = ? AND u.role = ? ' +
                         'GROUP BY u.id, u.name ' +
                         'HAVING post_count = ? ' +
                         'ORDER BY post_count DESC ' +
                         'LIMIT 20';

      expect(sql).toBe(expectedSql);
      expect(params).toEqual([true, 'author', 5]);
    });
  });

  describe('WHERE conditions', () => {
    it('should handle string WHERE condition', () => {
      const { sql } = builder
        .select()
        .from('users')
        .where('name IS NOT NULL')
        .build();

      expect(sql).toBe('SELECT * FROM users WHERE name IS NOT NULL');
    });

    it('should handle WhereClause object', () => {
      const { sql, params } = builder
        .select()
        .from('users')
        .where({
          column: 'age',
          operator: '>',
          value: 18
        })
        .build();

      expect(sql).toBe('SELECT * FROM users WHERE age > ?');
      expect(params).toEqual([18]);
    });

    it('should handle IN operator', () => {
      const { sql, params } = builder
        .select()
        .from('users')
        .where({
          column: 'role',
          operator: 'IN',
          value: ['admin', 'moderator', 'user']
        })
        .build();

      expect(sql).toBe('SELECT * FROM users WHERE role IN (?, ?, ?)');
      expect(params).toEqual(['admin', 'moderator', 'user']);
    });

    it('should handle BETWEEN operator', () => {
      const { sql, params } = builder
        .select()
        .from('products')
        .where({
          column: 'price',
          operator: 'BETWEEN',
          value: [10, 100]
        })
        .build();

      expect(sql).toBe('SELECT * FROM products WHERE price BETWEEN ? AND ?');
      expect(params).toEqual([10, 100]);
    });

    it('should handle IS NULL operator', () => {
      const { sql, params } = builder
        .select()
        .from('users')
        .where({
          column: 'deleted_at',
          operator: 'IS NULL',
          value: null
        })
        .build();

      expect(sql).toBe('SELECT * FROM users WHERE deleted_at IS NULL');
      expect(params).toEqual([]);
    });
  });

  describe('INSERT queries', () => {
    it('should build INSERT query', async () => {
      // Mock the execute method to avoid actual database interaction
      const executeSpy = jest.spyOn(database, 'execute').mockResolvedValue({
        rows: [],
        rowCount: 1,
        insertId: 1
      });

      await builder
        .from('users')
        .insert({
          name: 'John Doe',
          email: 'john@example.com',
          age: 30
        });

      expect(executeSpy).toHaveBeenCalledWith(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['John Doe', 'john@example.com', 30]
      );

      executeSpy.mockRestore();
    });
  });

  describe('UPDATE queries', () => {
    it('should build UPDATE query', async () => {
      const executeSpy = jest.spyOn(database, 'execute').mockResolvedValue({
        rows: [],
        rowCount: 1
      });

      await builder
        .from('users')
        .where({ id: 1 })
        .update({
          name: 'Jane Doe',
          email: 'jane@example.com'
        });

      expect(executeSpy).toHaveBeenCalledWith(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        ['Jane Doe', 'jane@example.com', 1]
      );

      executeSpy.mockRestore();
    });
  });

  describe('DELETE queries', () => {
    it('should build DELETE query', async () => {
      const executeSpy = jest.spyOn(database, 'execute').mockResolvedValue({
        rows: [],
        rowCount: 1
      });

      await builder
        .from('users')
        .where({ id: 1 })
        .delete();

      expect(executeSpy).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ?',
        [1]
      );

      executeSpy.mockRestore();
    });
  });

  describe('utility methods', () => {
    it('should clone builder', () => {
      const original = builder
        .select(['name'])
        .from('users')
        .where({ active: true });

      const cloned = original.clone();
      cloned.where({ role: 'admin' });

      const originalQuery = original.build();
      const clonedQuery = cloned.build();

      expect(originalQuery.sql).toBe('SELECT name FROM users WHERE active = ?');
      expect(clonedQuery.sql).toBe('SELECT name FROM users WHERE active = ? AND role = ?');
    });

    it('should reset builder', () => {
      builder
        .select(['name'])
        .from('users')
        .where({ active: true })
        .reset();

      const { sql, params } = builder
        .select()
        .from('posts')
        .build();

      expect(sql).toBe('SELECT * FROM posts');
      expect(params).toEqual([]);
    });

    it('should execute count query', async () => {
      const querySpy = jest.spyOn(database, 'query').mockResolvedValue([{ count: 42 }]);

      const count = await builder
        .from('users')
        .where({ active: true })
        .count();

      expect(count).toBe(42);
      expect(querySpy).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM users WHERE active = ?',
        [true]
      );

      querySpy.mockRestore();
    });

    it('should execute first query', async () => {
      const querySpy = jest.spyOn(database, 'query').mockResolvedValue([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]);

      const result = await builder
        .from('users')
        .first();

      expect(result).toEqual({ id: 1, name: 'John' });
      expect(querySpy).toHaveBeenCalledWith(
        'SELECT * FROM users LIMIT 1',
        []
      );

      querySpy.mockRestore();
    });

    it('should return null for first query with no results', async () => {
      const querySpy = jest.spyOn(database, 'query').mockResolvedValue([]);

      const result = await builder
        .from('users')
        .first();

      expect(result).toBeNull();

      querySpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should throw error for INSERT without table', async () => {
      await expect(
        builder.insert({ name: 'John' })
      ).rejects.toThrow('INSERT requires table name and data');
    });

    it('should throw error for UPDATE without table', async () => {
      await expect(
        builder.update({ name: 'John' })
      ).rejects.toThrow('UPDATE requires table name and data');
    });

    it('should throw error for DELETE without table', async () => {
      await expect(
        builder.delete()
      ).rejects.toThrow('DELETE requires table name');
    });

    it('should throw error for BETWEEN with invalid value', () => {
      expect(() => {
        builder
          .from('products')
          .where({
            column: 'price',
            operator: 'BETWEEN',
            value: [10] // Should have 2 values
          })
          .build();
      }).toThrow('BETWEEN operator requires array with 2 values');
    });
  });
});

describe('QueryBuilderFactory', () => {
  let database: FoxDatabase;

  beforeEach(async () => {
    const config: DatabaseConfig = {
      provider: 'memory',
      database: 'test_db'
    };
    database = new FoxDatabase(config);
    await database.connect();
  });

  afterEach(async () => {
    await database.close();
  });

  describe('create', () => {
    it('should create SQL query builder by default', () => {
      const builder = QueryBuilderFactory.create(database);
      expect(builder).toBeInstanceOf(SqlQueryBuilder);
    });

    it('should create SQL query builder explicitly', () => {
      const builder = QueryBuilderFactory.create(database, 'sql');
      expect(builder).toBeInstanceOf(SqlQueryBuilder);
    });

    it('should create NoSQL query builder', () => {
      const builder = QueryBuilderFactory.create(database, 'nosql');
      expect(builder).toBeDefined();
      // NoSqlQueryBuilder is not exported, so we just check it's defined
    });

    it('should throw error for unknown type', () => {
      expect(() => {
        QueryBuilderFactory.create(database, 'unknown' as any);
      }).toThrow('Unknown query builder type: unknown');
    });
  });

  describe('createSqlBuilder', () => {
    it('should create SQL query builder', () => {
      const builder = QueryBuilderFactory.createSqlBuilder(database);
      expect(builder).toBeInstanceOf(SqlQueryBuilder);
    });
  });

  describe('createNoSqlBuilder', () => {
    it('should create NoSQL query builder', () => {
      const builder = QueryBuilderFactory.createNoSqlBuilder(database);
      expect(builder).toBeDefined();
      expect(typeof builder.select).toBe('function');
    });
  });
});
