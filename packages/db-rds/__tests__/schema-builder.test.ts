import { SchemaBuilder } from '../src/schema-builder';
import type { EntityDefinition } from '@foxframework/core';

describe('SchemaBuilder — Postgres', () => {
  let executeRaw: jest.Mock;
  let builder: SchemaBuilder;

  beforeEach(() => {
    executeRaw = jest.fn().mockResolvedValue(undefined);
    builder = new SchemaBuilder('postgres', executeRaw);
  });

  describe('buildCreateTableSQL', () => {
    it('creates a simple table with serial PK, varchar and text', () => {
      const entity: EntityDefinition = {
        name: 'users',
        columns: [
          { name: 'id', type: 'serial', primaryKey: true },
          { name: 'name', type: 'varchar', length: 100 },
          { name: 'bio', type: 'text' },
        ],
      };
      const sql = builder.buildCreateTableSQL(entity);
      expect(sql).toBe(
        'CREATE TABLE IF NOT EXISTS "users" ("id" SERIAL PRIMARY KEY, "name" VARCHAR(100), "bio" TEXT)',
      );
    });

    it('adds NOT NULL when nullable=false', () => {
      const entity: EntityDefinition = {
        name: 'items',
        columns: [{ name: 'label', type: 'text', nullable: false }],
      };
      expect(builder.buildCreateTableSQL(entity)).toContain('NOT NULL');
    });

    it('adds UNIQUE constraint', () => {
      const entity: EntityDefinition = {
        name: 'items',
        columns: [{ name: 'email', type: 'varchar', length: 255, unique: true }],
      };
      expect(builder.buildCreateTableSQL(entity)).toContain('UNIQUE');
    });

    it('adds DEFAULT value', () => {
      const entity: EntityDefinition = {
        name: 'items',
        columns: [{ name: 'active', type: 'boolean', default: 'true' }],
      };
      expect(builder.buildCreateTableSQL(entity)).toContain('DEFAULT true');
    });

    it('maps decimal with precision/scale', () => {
      const entity: EntityDefinition = {
        name: 'prices',
        columns: [{ name: 'amount', type: 'decimal', precision: 10, scale: 2 }],
      };
      expect(builder.buildCreateTableSQL(entity)).toContain('DECIMAL(10, 2)');
    });

    it('maps boolean → BOOLEAN', () => {
      const entity: EntityDefinition = {
        name: 't',
        columns: [{ name: 'flag', type: 'boolean' }],
      };
      expect(builder.buildCreateTableSQL(entity)).toContain('"flag" BOOLEAN');
    });

    it('maps uuid → UUID', () => {
      const entity: EntityDefinition = {
        name: 't',
        columns: [{ name: 'uid', type: 'uuid' }],
      };
      expect(builder.buildCreateTableSQL(entity)).toContain('"uid" UUID');
    });

    it('maps jsonb → JSONB', () => {
      const entity: EntityDefinition = {
        name: 't',
        columns: [{ name: 'meta', type: 'jsonb' }],
      };
      expect(builder.buildCreateTableSQL(entity)).toContain('"meta" JSONB');
    });
  });

  describe('buildCreateIndexSQL', () => {
    it('creates a unique index with IF NOT EXISTS', () => {
      const sql = builder.buildCreateIndexSQL('users', {
        name: 'idx_users_email',
        columns: ['email'],
        unique: true,
      });
      expect(sql).toBe(
        'CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email")',
      );
    });

    it('creates a non-unique index', () => {
      const sql = builder.buildCreateIndexSQL('users', {
        name: 'idx_users_name',
        columns: ['first_name', 'last_name'],
      });
      expect(sql).toBe(
        'CREATE INDEX IF NOT EXISTS "idx_users_name" ON "users" ("first_name", "last_name")',
      );
    });

    it('auto-generates index name when not provided', () => {
      const sql = builder.buildCreateIndexSQL('orders', {
        columns: ['user_id', 'status'],
      });
      expect(sql).toContain('idx_orders_user_id_status');
    });
  });

  describe('ensureEntities', () => {
    it('calls executeRaw for CREATE TABLE and each index', async () => {
      const entity: EntityDefinition = {
        name: 'posts',
        columns: [
          { name: 'id', type: 'serial', primaryKey: true },
          { name: 'title', type: 'varchar', length: 200 },
        ],
        indexes: [
          { name: 'idx_posts_title', columns: ['title'] },
        ],
      };

      await builder.ensureEntities([entity]);

      expect(executeRaw).toHaveBeenCalledTimes(2);
      expect(executeRaw.mock.calls[0][0]).toMatch(/CREATE TABLE IF NOT EXISTS "posts"/);
      expect(executeRaw.mock.calls[1][0]).toMatch(/CREATE INDEX IF NOT EXISTS "idx_posts_title" ON "posts"/);
    });

    it('handles entities with no indexes', async () => {
      const entity: EntityDefinition = {
        name: 'simple',
        columns: [{ name: 'id', type: 'serial', primaryKey: true }],
      };
      await builder.ensureEntities([entity]);
      expect(executeRaw).toHaveBeenCalledTimes(1);
    });
  });
});

describe('SchemaBuilder — MySQL', () => {
  let executeRaw: jest.Mock;
  let builder: SchemaBuilder;

  beforeEach(() => {
    executeRaw = jest.fn().mockResolvedValue(undefined);
    builder = new SchemaBuilder('mysql', executeRaw);
  });

  it('uses backtick identifiers', () => {
    const entity: EntityDefinition = {
      name: 'users',
      columns: [{ name: 'id', type: 'serial', primaryKey: true }],
    };
    const sql = builder.buildCreateTableSQL(entity);
    expect(sql).toContain('`users`');
    expect(sql).toContain('`id`');
  });

  it('maps serial → INT AUTO_INCREMENT', () => {
    const entity: EntityDefinition = {
      name: 't',
      columns: [{ name: 'id', type: 'serial', primaryKey: true }],
    };
    expect(builder.buildCreateTableSQL(entity)).toContain('INT AUTO_INCREMENT');
  });

  it('maps boolean → TINYINT(1)', () => {
    const entity: EntityDefinition = {
      name: 't',
      columns: [{ name: 'flag', type: 'boolean' }],
    };
    expect(builder.buildCreateTableSQL(entity)).toContain('TINYINT(1)');
  });

  it('maps jsonb → JSON (no JSONB in mysql)', () => {
    const entity: EntityDefinition = {
      name: 't',
      columns: [{ name: 'meta', type: 'jsonb' }],
    };
    const sql = builder.buildCreateTableSQL(entity);
    expect(sql).toContain('JSON');
    expect(sql).not.toContain('JSONB');
  });

  it('maps uuid → VARCHAR(36)', () => {
    const entity: EntityDefinition = {
      name: 't',
      columns: [{ name: 'uid', type: 'uuid' }],
    };
    expect(builder.buildCreateTableSQL(entity)).toContain('VARCHAR(36)');
  });

  it('creates index without IF NOT EXISTS', () => {
    const sql = builder.buildCreateIndexSQL('orders', {
      name: 'idx_orders_status',
      columns: ['status'],
      unique: true,
    });
    expect(sql).toBe('CREATE UNIQUE INDEX `idx_orders_status` ON `orders` (`status`)');
    expect(sql).not.toContain('IF NOT EXISTS');
  });

  describe('ensureEntities', () => {
    it('calls executeRaw for CREATE TABLE and each index', async () => {
      const entity: EntityDefinition = {
        name: 'posts',
        columns: [{ name: 'id', type: 'serial', primaryKey: true }],
        indexes: [{ name: 'idx_posts_id', columns: ['id'] }],
      };
      await builder.ensureEntities([entity]);
      expect(executeRaw).toHaveBeenCalledTimes(2);
      expect(executeRaw.mock.calls[0][0]).toMatch(/CREATE TABLE IF NOT EXISTS `posts`/);
      expect(executeRaw.mock.calls[1][0]).toMatch(/CREATE INDEX `idx_posts_id` ON `posts`/);
    });
  });

  describe('aurora-mysql engine', () => {
    it('behaves the same as mysql', () => {
      const auroraBuilder = new SchemaBuilder('aurora-mysql', executeRaw);
      const entity: EntityDefinition = {
        name: 't',
        columns: [{ name: 'id', type: 'serial', primaryKey: true }],
      };
      const sql = auroraBuilder.buildCreateTableSQL(entity);
      expect(sql).toContain('`t`');
      expect(sql).toContain('INT AUTO_INCREMENT');
    });
  });
});
