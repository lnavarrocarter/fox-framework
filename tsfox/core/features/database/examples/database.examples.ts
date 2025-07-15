/**
 * @fileoverview Database abstraction examples
 * @module tsfox/core/features/database/examples
 */

import {
  DatabaseFactory,
  FoxDatabase,
  DatabaseConfigs,
  database,
  DatabaseConfig,
  QueryBuilderInterface,
  TransactionInterface
} from '../index';

/**
 * Basic database usage examples
 */
export class BasicDatabaseExamples {
  /**
   * Example 1: Create and connect to memory database
   */
  static async example1_BasicConnection(): Promise<void> {
    console.log('=== Example 1: Basic Connection ===');
    
    // Create database with memory provider
    const db = DatabaseFactory.createWithDefaults('memory');
    
    try {
      // Connect to database
      await db.connect();
      console.log('✓ Connected to database');
      
      // Check connection health
      const isHealthy = await db.ping();
      console.log('✓ Database health check:', isHealthy);
      
      // Get database info
      const info = db.getInfo();
      console.log('✓ Database info:', {
        provider: info.provider,
        status: info.status,
        connectionCount: info.connectionCount
      });
      
    } finally {
      // Always close connection
      await db.close();
      console.log('✓ Database connection closed');
    }
  }

  /**
   * Example 2: Using configuration presets
   */
  static async example2_ConfigurationPresets(): Promise<void> {
    console.log('\n=== Example 2: Configuration Presets ===');
    
    // PostgreSQL configuration
    const pgConfig = DatabaseConfigs.postgresql('my_app_db', {
      host: 'localhost',
      username: 'app_user',
      password: 'secure_password',
      ssl: true
    });
    console.log('✓ PostgreSQL config:', pgConfig);
    
    // MySQL configuration
    const mysqlConfig = DatabaseConfigs.mysql('my_app_db', {
      port: 3307,
      charset: 'utf8mb4'
    });
    console.log('✓ MySQL config:', mysqlConfig);
    
    // SQLite configuration
    const sqliteConfig = DatabaseConfigs.sqlite('./data/app.db');
    console.log('✓ SQLite config:', sqliteConfig);
    
    // MongoDB configuration
    const mongoConfig = DatabaseConfigs.mongodb('my_app_db', {
      username: 'mongo_user',
      password: 'mongo_pass'
    });
    console.log('✓ MongoDB config:', mongoConfig);
  }

  /**
   * Example 3: Fluent database builder
   */
  static async example3_FluentBuilder(): Promise<void> {
    console.log('\n=== Example 3: Fluent Builder ===');
    
    // Using fluent builder pattern
    const db = database()
      .provider('postgresql')
      .host('localhost')
      .port(5432)
      .database('my_application')
      .credentials('app_user', 'app_password')
      .ssl(true)
      .debug(false)
      .pool({
        min: 5,
        max: 20,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 300000,
        createTimeoutMillis: 60000
      })
      .build();
    
    console.log('✓ Database created with fluent builder');
    console.log('✓ Configuration:', db.getConfig());
  }
}

/**
 * Query builder examples
 */
export class QueryBuilderExamples {
  private static db: FoxDatabase;
  
  /**
   * Initialize database for examples
   */
  static async initialize(): Promise<void> {
    this.db = DatabaseFactory.createWithDefaults('memory');
    await this.db.connect();
  }
  
  /**
   * Clean up database
   */
  static async cleanup(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
  }

  /**
   * Example 1: Basic SELECT queries
   */
  static async example1_BasicSelects(): Promise<void> {
    console.log('\n=== Query Builder Example 1: Basic SELECTs ===');
    
    const builder = this.db.getBuilder();
    
    // Simple SELECT
    const query1 = builder
      .select(['id', 'name', 'email'])
      .from('users')
      .build();
    console.log('✓ Simple SELECT:', query1.sql);
    
    // SELECT with WHERE
    const query2 = builder
      .reset()
      .select()
      .from('users')
      .where({ active: true })
      .andWhere({ role: 'admin' })
      .build();
    console.log('✓ SELECT with WHERE:', query2.sql);
    console.log('  Parameters:', query2.params);
    
    // SELECT with OR condition
    const query3 = builder
      .reset()
      .select()
      .from('posts')
      .where({ status: 'published' })
      .orWhere({ status: 'featured' })
      .build();
    console.log('✓ SELECT with OR:', query3.sql);
  }

  /**
   * Example 2: JOIN queries
   */
  static async example2_JoinQueries(): Promise<void> {
    console.log('\n=== Query Builder Example 2: JOINs ===');
    
    const builder = this.db.getBuilder();
    
    // INNER JOIN
    const query1 = builder
      .select(['u.name', 'p.title', 'p.created_at'])
      .from('users u')
      .innerJoin('posts p', 'u.id = p.user_id')
      .where({ 'u.active': true })
      .orderBy('p.created_at', 'DESC')
      .build();
    console.log('✓ INNER JOIN:', query1.sql);
    
    // LEFT JOIN with multiple tables
    const query2 = builder
      .reset()
      .select(['u.name', 'p.title', 'c.name as category'])
      .from('users u')
      .leftJoin('posts p', 'u.id = p.user_id')
      .leftJoin('categories c', 'p.category_id = c.id')
      .where({ 'u.active': true })
      .build();
    console.log('✓ Multiple LEFT JOINs:', query2.sql);
  }

  /**
   * Example 3: Aggregation queries
   */
  static async example3_Aggregations(): Promise<void> {
    console.log('\n=== Query Builder Example 3: Aggregations ===');
    
    const builder = this.db.getBuilder();
    
    // GROUP BY with COUNT
    const query1 = builder
      .select(['category_id', 'COUNT(*) as post_count'])
      .from('posts')
      .where({ status: 'published' })
      .groupBy(['category_id'])
      .having({ post_count: 5 })
      .orderBy('post_count', 'DESC')
      .build();
    console.log('✓ GROUP BY with HAVING:', query1.sql);
    
    // Complex aggregation
    const query2 = builder
      .reset()
      .select([
        'u.id',
        'u.name',
        'COUNT(p.id) as total_posts',
        'AVG(p.views) as avg_views',
        'MAX(p.created_at) as last_post'
      ])
      .from('users u')
      .leftJoin('posts p', 'u.id = p.user_id')
      .where({ 'u.active': true })
      .groupBy(['u.id', 'u.name'])
      .having({ total_posts: 1 })
      .orderBy('avg_views', 'DESC')
      .limit(20)
      .build();
    console.log('✓ Complex aggregation:', query2.sql);
  }

  /**
   * Example 4: Advanced WHERE conditions
   */
  static async example4_AdvancedWhere(): Promise<void> {
    console.log('\n=== Query Builder Example 4: Advanced WHERE ===');
    
    const builder = this.db.getBuilder();
    
    // IN operator
    const query1 = builder
      .select()
      .from('users')
      .where({
        column: 'role',
        operator: 'IN',
        value: ['admin', 'moderator', 'editor']
      })
      .build();
    console.log('✓ IN operator:', query1.sql);
    
    // BETWEEN operator
    const query2 = builder
      .reset()
      .select()
      .from('products')
      .where({
        column: 'price',
        operator: 'BETWEEN',
        value: [10.00, 100.00]
      })
      .andWhere({
        column: 'category',
        operator: 'LIKE',
        value: '%electronics%'
      })
      .build();
    console.log('✓ BETWEEN and LIKE:', query2.sql);
    
    // NULL checks
    const query3 = builder
      .reset()
      .select()
      .from('users')
      .where({
        column: 'deleted_at',
        operator: 'IS NULL',
        value: null
      })
      .andWhere({
        column: 'email_verified_at',
        operator: 'IS NOT NULL',
        value: null
      })
      .build();
    console.log('✓ NULL checks:', query3.sql);
  }

  /**
   * Example 5: Data modification queries
   */
  static async example5_DataModification(): Promise<void> {
    console.log('\n=== Query Builder Example 5: Data Modification ===');
    
    const builder = this.db.getBuilder();
    
    // Mock the database methods to avoid actual execution
    const mockExecute = jest.spyOn(this.db, 'execute').mockResolvedValue({
      rows: [],
      rowCount: 1,
      insertId: 123
    });
    
    try {
      // INSERT
      await builder
        .from('users')
        .insert({
          name: 'John Doe',
          email: 'john@example.com',
          role: 'user',
          created_at: new Date()
        });
      console.log('✓ INSERT executed');
      
      // UPDATE
      await builder
        .reset()
        .from('users')
        .where({ id: 123 })
        .update({
          name: 'John Smith',
          updated_at: new Date()
        });
      console.log('✓ UPDATE executed');
      
      // DELETE
      await builder
        .reset()
        .from('posts')
        .where({ user_id: 123 })
        .andWhere({ status: 'draft' })
        .delete();
      console.log('✓ DELETE executed');
      
    } finally {
      mockExecute.mockRestore();
    }
  }
}

/**
 * Transaction examples
 */
export class TransactionExamples {
  private static db: FoxDatabase;
  
  /**
   * Initialize database for examples
   */
  static async initialize(): Promise<void> {
    this.db = DatabaseFactory.createWithDefaults('memory');
    await this.db.connect();
  }
  
  /**
   * Clean up database
   */
  static async cleanup(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
  }

  /**
   * Example 1: Basic transaction
   */
  static async example1_BasicTransaction(): Promise<void> {
    console.log('\n=== Transaction Example 1: Basic Transaction ===');
    
    try {
      const result = await this.db.transaction(async (tx: TransactionInterface) => {
        // Mock transaction methods
        const mockQuery = jest.spyOn(tx, 'query').mockResolvedValue([{ id: 1 }]);
        const mockExecute = jest.spyOn(tx, 'execute').mockResolvedValue({
          rows: [],
          rowCount: 1,
          insertId: 1
        });
        
        try {
          // Create user
          await tx.execute(
            'INSERT INTO users (name, email) VALUES (?, ?)',
            ['John Doe', 'john@example.com']
          );
          
          // Create profile
          await tx.execute(
            'INSERT INTO profiles (user_id, bio) VALUES (?, ?)',
            [1, 'Software developer']
          );
          
          // Get created user
          const users = await tx.query(
            'SELECT * FROM users WHERE email = ?',
            ['john@example.com']
          );
          
          console.log('✓ Transaction completed successfully');
          return users[0];
          
        } finally {
          mockQuery.mockRestore();
          mockExecute.mockRestore();
        }
      });
      
      console.log('✓ Transaction result:', result);
      
    } catch (error) {
      console.log('✗ Transaction failed:', (error as Error).message);
    }
  }

  /**
   * Example 2: Transaction rollback
   */
  static async example2_TransactionRollback(): Promise<void> {
    console.log('\n=== Transaction Example 2: Transaction Rollback ===');
    
    try {
      await this.db.transaction(async (tx: TransactionInterface) => {
        // Mock transaction methods
        const mockExecute = jest.spyOn(tx, 'execute').mockResolvedValue({
          rows: [],
          rowCount: 1
        });
        
        try {
          // Create user
          await tx.execute(
            'INSERT INTO users (name, email) VALUES (?, ?)',
            ['Jane Doe', 'jane@example.com']
          );
          
          // Simulate an error
          throw new Error('Something went wrong!');
          
        } finally {
          mockExecute.mockRestore();
        }
      });
      
    } catch (error) {
      console.log('✓ Transaction rolled back due to error:', (error as Error).message);
    }
  }

  /**
   * Example 3: Nested operations in transaction
   */
  static async example3_NestedOperations(): Promise<void> {
    console.log('\n=== Transaction Example 3: Nested Operations ===');
    
    const mockExecute = jest.spyOn(this.db, 'execute').mockResolvedValue({
      rows: [],
      rowCount: 1,
      insertId: 1
    });
    
    const mockQuery = jest.spyOn(this.db, 'query').mockResolvedValue([
      { id: 1, balance: 1000 },
      { id: 2, balance: 500 }
    ]);
    
    try {
      await this.db.transaction(async (tx: TransactionInterface) => {
        // Mock transaction methods
        const mockTxQuery = jest.spyOn(tx, 'query').mockImplementation(mockQuery as any);
        const mockTxExecute = jest.spyOn(tx, 'execute').mockImplementation(mockExecute as any);
        
        try {
          // Transfer money between accounts
          const amount = 100;
          const fromAccountId = 1;
          const toAccountId = 2;
          
          // Mock transaction methods
          const mockTxQuery = jest.spyOn(tx, 'query').mockResolvedValue([
            { id: 1, balance: 1000 }
          ]);
          const mockTxExecute = jest.spyOn(tx, 'execute').mockResolvedValue({
            rows: [],
            rowCount: 1
          });
          
          // Check source account balance
          const [fromAccount] = await tx.query(
            'SELECT balance FROM accounts WHERE id = ?',
            [fromAccountId]
          );
          
          if (fromAccount.balance < amount) {
            throw new Error('Insufficient funds');
          }
          
          // Debit from source account
          await tx.execute(
            'UPDATE accounts SET balance = balance - ? WHERE id = ?',
            [amount, fromAccountId]
          );
          
          // Credit to destination account
          await tx.execute(
            'UPDATE accounts SET balance = balance + ? WHERE id = ?',
            [amount, toAccountId]
          );
          
          // Create transaction record
          await tx.execute(
            'INSERT INTO transactions (from_account, to_account, amount, type) VALUES (?, ?, ?, ?)',
            [fromAccountId, toAccountId, amount, 'transfer']
          );
          
          console.log('✓ Money transfer completed successfully');
          
          // Clean up mocks
          mockTxQuery.mockRestore();
          mockTxExecute.mockRestore();
          
        } catch (error) {
          console.log('Error in transaction:', error);
          throw error;
        }
      });
      
    } catch (error) {
      console.log('✗ Money transfer failed:', (error as Error).message);
    } finally {
      mockExecute.mockRestore();
      mockQuery.mockRestore();
    }
  }
}

/**
 * Connection pooling examples
 */
export class ConnectionPoolExamples {
  /**
   * Example 1: Basic connection pooling
   */
  static async example1_BasicPooling(): Promise<void> {
    console.log('\n=== Connection Pool Example 1: Basic Pooling ===');
    
    // Create database with custom pool configuration
    const config: DatabaseConfig = {
      provider: 'memory',
      database: 'pooled_app',
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 300000,
        createTimeoutMillis: 30000
      },
      debug: true
    };
    
    const db = DatabaseFactory.create(config, 'pooled');
    
    try {
      await db.connect();
      console.log('✓ Database connected with connection pool');
      
      // Get connection manager
      const connectionManager = db.getConnectionManager();
      console.log('✓ Connection manager available');
      
      // Simulate multiple concurrent operations
      const operations = Array.from({ length: 5 }, async (_, i) => {
        try {
          await db.query('SELECT ? as operation_id', [i]);
          console.log(`✓ Operation ${i} completed`);
        } catch (error) {
          console.log(`✗ Operation ${i} failed:`, (error as Error).message);
        }
      });
      
      await Promise.all(operations);
      console.log('✓ All concurrent operations completed');
      
    } finally {
      await db.close();
      console.log('✓ Connection pool closed');
    }
  }

  /**
   * Example 2: Pool monitoring
   */
  static async example2_PoolMonitoring(): Promise<void> {
    console.log('\n=== Connection Pool Example 2: Pool Monitoring ===');
    
    const config: DatabaseConfig = {
      provider: 'memory',
      database: 'monitored_app',
      pool: {
        min: 3,
        max: 15,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 300000,
        createTimeoutMillis: 30000
      }
    };
    
    const db = DatabaseFactory.create(config, 'monitored');
    
    try {
      await db.connect();
      
      // Get database info
      const info = db.getInfo();
      console.log('✓ Database info:', {
        provider: info.provider,
        connectionCount: info.connectionCount,
        status: info.status
      });
      
      // Simulate some queries
      await db.query('SELECT 1');
      await db.query('SELECT 2');
      await db.query('SELECT 3');
      
      // Get updated info
      const updatedInfo = db.getInfo();
      console.log('✓ Updated database info:', {
        connectionCount: updatedInfo.connectionCount,
        queryCount: updatedInfo.metadata?.queryCount
      });
      
    } finally {
      await db.close();
    }
  }
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('🚀 Running Fox Framework Database Examples\n');
  
  try {
    // Basic examples
    await BasicDatabaseExamples.example1_BasicConnection();
    await BasicDatabaseExamples.example2_ConfigurationPresets();
    await BasicDatabaseExamples.example3_FluentBuilder();
    
    // Query builder examples
    await QueryBuilderExamples.initialize();
    try {
      await QueryBuilderExamples.example1_BasicSelects();
      await QueryBuilderExamples.example2_JoinQueries();
      await QueryBuilderExamples.example3_Aggregations();
      await QueryBuilderExamples.example4_AdvancedWhere();
      await QueryBuilderExamples.example5_DataModification();
    } finally {
      await QueryBuilderExamples.cleanup();
    }
    
    // Transaction examples
    await TransactionExamples.initialize();
    try {
      await TransactionExamples.example1_BasicTransaction();
      await TransactionExamples.example2_TransactionRollback();
      await TransactionExamples.example3_NestedOperations();
    } finally {
      await TransactionExamples.cleanup();
    }
    
    // Connection pool examples
    await ConnectionPoolExamples.example1_BasicPooling();
    await ConnectionPoolExamples.example2_PoolMonitoring();
    
    console.log('\n✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Examples failed:', error);
  } finally {
    // Clean up all database instances
    await DatabaseFactory.closeAll();
    console.log('\n🧹 Cleanup completed');
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
