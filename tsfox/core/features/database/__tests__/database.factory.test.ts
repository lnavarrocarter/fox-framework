/**
 * @fileoverview Database factory tests
 * @module tsfox/core/features/database/__tests__
 */

import { DatabaseFactory, FoxDatabase, DatabaseUtils, DatabaseConfigs, database } from '../index';
import { DatabaseConfig } from '../interfaces';

describe('DatabaseFactory', () => {
  afterEach(async () => {
    await DatabaseFactory.closeAll();
  });

  describe('create', () => {
    it('should create database instance with memory provider', () => {
      const config: DatabaseConfig = {
        provider: 'memory',
        database: 'test_db'
      };

      const db = DatabaseFactory.create(config);
      expect(db).toBeInstanceOf(FoxDatabase);
      expect(db.getConfig().provider).toBe('memory');
      expect(db.getConfig().database).toBe('test_db');
    });

    it('should return same instance for same name', () => {
      const config: DatabaseConfig = {
        provider: 'memory',
        database: 'test_db'
      };

      const db1 = DatabaseFactory.create(config, 'test');
      const db2 = DatabaseFactory.create(config, 'test');
      
      expect(db1).toBe(db2);
    });

    it('should create different instances for different names', () => {
      const config: DatabaseConfig = {
        provider: 'memory',
        database: 'test_db'
      };

      const db1 = DatabaseFactory.create(config, 'test1');
      const db2 = DatabaseFactory.create(config, 'test2');
      
      expect(db1).not.toBe(db2);
    });
  });

  describe('createWithDefaults', () => {
    it('should create database with default configuration', () => {
      const db = DatabaseFactory.createWithDefaults();
      const config = db.getConfig();
      
      expect(config.provider).toBe('memory');
      expect(config.database).toBe('fox_memory');
      expect(config.host).toBe('localhost');
      expect(config.pool).toBeDefined();
    });

    it('should create database with specified provider', () => {
      const db = DatabaseFactory.createWithDefaults('postgresql');
      const config = db.getConfig();
      
      expect(config.provider).toBe('postgresql');
      expect(config.database).toBe('fox_postgresql');
      expect(config.port).toBe(5432);
    });
  });

  describe('get', () => {
    it('should get existing instance', () => {
      const config: DatabaseConfig = {
        provider: 'memory',
        database: 'test_db'
      };

      const created = DatabaseFactory.create(config, 'test');
      const retrieved = DatabaseFactory.get('test');
      
      expect(retrieved).toBe(created);
    });

    it('should throw error for non-existent instance', () => {
      expect(() => {
        DatabaseFactory.get('non_existent');
      }).toThrow("Database instance 'non_existent' not found");
    });
  });

  describe('closeAll', () => {
    it('should close all instances', async () => {
      const config: DatabaseConfig = {
        provider: 'memory',
        database: 'test_db'
      };

      DatabaseFactory.create(config, 'test1');
      DatabaseFactory.create(config, 'test2');
      
      expect(DatabaseFactory.getInstanceNames()).toHaveLength(2);
      
      await DatabaseFactory.closeAll();
      
      expect(DatabaseFactory.getInstanceNames()).toHaveLength(0);
    });
  });
});

describe('FoxDatabase', () => {
  let database: FoxDatabase;

  beforeEach(() => {
    const config: DatabaseConfig = {
      provider: 'memory',
      database: 'test_db'
    };
    database = new FoxDatabase(config);
  });

  afterEach(async () => {
    if (database) {
      await database.close();
    }
  });

  describe('connection', () => {
    it('should connect and disconnect', async () => {
      await database.connect();
      expect(await database.ping()).toBe(true);
      
      await database.disconnect();
      expect(await database.ping()).toBe(false);
    });

    it('should throw error when not connected', async () => {
      await expect(database.query('SELECT 1')).rejects.toThrow('Database not connected');
    });
  });

  describe('getInfo', () => {
    it('should return database information', async () => {
      await database.connect();
      
      const info = database.getInfo();
      expect(info.provider).toBe('memory');
      expect(info.status).toBe('connected');
      expect(info.connectionCount).toBe(0);
    });
  });

  describe('getBuilder', () => {
    it('should return query builder', async () => {
      await database.connect();
      
      const builder = database.getBuilder();
      expect(builder).toBeDefined();
      expect(typeof builder.select).toBe('function');
      expect(typeof builder.from).toBe('function');
      expect(typeof builder.where).toBe('function');
    });
  });
});

describe('DatabaseUtils', () => {
  describe('testConnection', () => {
    it('should test successful connection', async () => {
      const config: DatabaseConfig = {
        provider: 'memory',
        database: 'test_db'
      };

      const result = await DatabaseUtils.testConnection(config);
      expect(result).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const config: DatabaseConfig = {
        provider: 'memory',
        database: 'test_db'
      };

      const errors = DatabaseUtils.validateConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid configuration', () => {
      const config = {} as DatabaseConfig;

      const errors = DatabaseUtils.validateConfig(config);
      expect(errors).toContain('Provider is required');
      expect(errors).toContain('Database name is required');
    });

    it('should validate pool configuration', () => {
      const config: DatabaseConfig = {
        provider: 'memory',
        database: 'test_db',
        pool: {
          min: 5,
          max: 2,
          acquireTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
          createTimeoutMillis: 30000
        }
      };

      const errors = DatabaseUtils.validateConfig(config);
      expect(errors).toContain('Pool max connections must be > min connections');
    });
  });

  describe('createTestConfig', () => {
    it('should create test configuration', () => {
      const config = DatabaseUtils.createTestConfig();
      
      expect(config.provider).toBe('memory');
      expect(config.database).toMatch(/^test_\d+$/);
      expect(config.debug).toBe(true);
    });

    it('should create test configuration for specific provider', () => {
      const config = DatabaseUtils.createTestConfig('postgresql');
      
      expect(config.provider).toBe('postgresql');
      expect(config.host).toBe('localhost');
    });
  });
});

describe('DatabaseConfigs', () => {
  describe('postgresql', () => {
    it('should create PostgreSQL configuration', () => {
      const config = DatabaseConfigs.postgresql('my_db');
      
      expect(config.provider).toBe('postgresql');
      expect(config.database).toBe('my_db');
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.username).toBe('postgres');
    });

    it('should merge custom options', () => {
      const config = DatabaseConfigs.postgresql('my_db', {
        host: 'custom_host',
        port: 5433,
        username: 'custom_user'
      });
      
      expect(config.host).toBe('custom_host');
      expect(config.port).toBe(5433);
      expect(config.username).toBe('custom_user');
      expect(config.database).toBe('my_db'); // Should preserve original
    });
  });

  describe('mysql', () => {
    it('should create MySQL configuration', () => {
      const config = DatabaseConfigs.mysql('my_db');
      
      expect(config.provider).toBe('mysql');
      expect(config.database).toBe('my_db');
      expect(config.port).toBe(3306);
      expect(config.username).toBe('root');
    });
  });

  describe('sqlite', () => {
    it('should create SQLite configuration', () => {
      const config = DatabaseConfigs.sqlite('my_db.sqlite');
      
      expect(config.provider).toBe('sqlite');
      expect(config.database).toBe('my_db.sqlite');
      expect(config.pool?.max).toBe(1); // SQLite should have single connection
    });
  });

  describe('mongodb', () => {
    it('should create MongoDB configuration', () => {
      const config = DatabaseConfigs.mongodb('my_db');
      
      expect(config.provider).toBe('mongodb');
      expect(config.database).toBe('my_db');
      expect(config.port).toBe(27017);
    });
  });

  describe('redis', () => {
    it('should create Redis configuration', () => {
      const config = DatabaseConfigs.redis('0');
      
      expect(config.provider).toBe('redis');
      expect(config.database).toBe('0');
      expect(config.port).toBe(6379);
    });
  });

  describe('memory', () => {
    it('should create memory configuration', () => {
      const config = DatabaseConfigs.memory();
      
      expect(config.provider).toBe('memory');
      expect(config.database).toBe('memory');
      expect(config.debug).toBe(true);
    });
  });
});

describe('DatabaseBuilder', () => {
  describe('fluent interface', () => {
    it('should build configuration using fluent interface', () => {
      const db = database()
        .provider('postgresql')
        .host('localhost')
        .port(5432)
        .database('my_app')
        .credentials('user', 'pass')
        .ssl()
        .debug()
        .build();

      const config = db.getConfig();
      expect(config.provider).toBe('postgresql');
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('my_app');
      expect(config.username).toBe('user');
      expect(config.password).toBe('pass');
      expect(config.ssl).toBe(true);
      expect(config.debug).toBe(true);
    });

    it('should build configuration only', () => {
      const config = database()
        .provider('mysql')
        .database('test_db')
        .buildConfig();

      expect(config.provider).toBe('mysql');
      expect(config.database).toBe('test_db');
    });

    it('should throw error for missing provider', () => {
      expect(() => {
        database()
          .database('test_db')
          .build();
      }).toThrow('Provider is required');
    });

    it('should throw error for missing database name', () => {
      expect(() => {
        database()
          .provider('memory')
          .build();
      }).toThrow('Database name is required');
    });
  });

  describe('pool configuration', () => {
    it('should set pool configuration', () => {
      const poolConfig = {
        min: 2,
        max: 20,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 300000,
        createTimeoutMillis: 60000
      };

      const config = database()
        .provider('postgresql')
        .database('test_db')
        .pool(poolConfig)
        .buildConfig();

      expect(config.pool).toEqual(poolConfig);
    });
  });

  describe('connection URL', () => {
    it('should set connection URL', () => {
      const url = 'postgresql://user:pass@localhost:5432/mydb';
      
      const config = database()
        .provider('postgresql')
        .database('mydb')
        .url(url)
        .buildConfig();

      expect(config.url).toBe(url);
    });
  });
});
