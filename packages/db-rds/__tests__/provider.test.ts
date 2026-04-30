import * as fs from 'fs';

const mockPostgresConnect = jest.fn().mockResolvedValue(undefined);
const mockPostgresDisconnect = jest.fn().mockResolvedValue(undefined);
const mockPostgresRaw = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
const mockPostgresRepository = jest.fn().mockReturnValue({});
const mockPostgresQueryBuilder = jest.fn().mockReturnValue({});

const MockPostgresProvider = jest.fn().mockImplementation(() => ({
  connect: mockPostgresConnect,
  disconnect: mockPostgresDisconnect,
  raw: mockPostgresRaw,
  repository: mockPostgresRepository,
  queryBuilder: mockPostgresQueryBuilder,
  isConnected: true,
}));

const mockMysqlConnect = jest.fn().mockResolvedValue(undefined);
const mockMysqlDisconnect = jest.fn().mockResolvedValue(undefined);
const mockMysqlRaw = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
const mockMysqlRepository = jest.fn().mockReturnValue({});
const mockMysqlQueryBuilder = jest.fn().mockReturnValue({});

const MockMySQLProvider = jest.fn().mockImplementation(() => ({
  connect: mockMysqlConnect,
  disconnect: mockMysqlDisconnect,
  raw: mockMysqlRaw,
  repository: mockMysqlRepository,
  queryBuilder: mockMysqlQueryBuilder,
  isConnected: true,
}));

jest.mock('@foxframework/db-postgres', () => ({
  PostgresProvider: MockPostgresProvider,
}));

jest.mock('@foxframework/db-mysql', () => ({
  MySQLProvider: MockMySQLProvider,
}));

jest.mock('fs');

import { RdsProvider } from '../src/provider';
import type { RdsConfig } from '@foxframework/core';

const baseConfig: RdsConfig = {
  engine: 'postgres',
  host: 'localhost',
  database: 'testdb',
  user: 'user',
  password: 'pass',
};

describe('RdsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('engine routing', () => {
    it('uses PostgresProvider for postgres engine', async () => {
      const provider = new RdsProvider({ ...baseConfig, engine: 'postgres' });
      await provider.connect();
      expect(MockPostgresProvider).toHaveBeenCalledTimes(1);
      expect(mockPostgresConnect).toHaveBeenCalledTimes(1);
    });

    it('uses PostgresProvider for aurora-postgres engine', async () => {
      const provider = new RdsProvider({ ...baseConfig, engine: 'aurora-postgres' });
      await provider.connect();
      expect(MockPostgresProvider).toHaveBeenCalledTimes(1);
    });

    it('uses MySQLProvider for mysql engine', async () => {
      const provider = new RdsProvider({ ...baseConfig, engine: 'mysql' });
      await provider.connect();
      expect(MockMySQLProvider).toHaveBeenCalledTimes(1);
      expect(mockMysqlConnect).toHaveBeenCalledTimes(1);
    });

    it('uses MySQLProvider for aurora-mysql engine', async () => {
      const provider = new RdsProvider({ ...baseConfig, engine: 'aurora-mysql' });
      await provider.connect();
      expect(MockMySQLProvider).toHaveBeenCalledTimes(1);
    });
  });

  describe('SSL config', () => {
    it('passes ssl rejectUnauthorized=true for postgres with ssl=true', async () => {
      const provider = new RdsProvider({ ...baseConfig, engine: 'postgres', ssl: true });
      await provider.connect();
      const callArg = MockPostgresProvider.mock.calls[0][0];
      expect(callArg.ssl).toEqual({ rejectUnauthorized: true });
    });

    it('passes ssl rejectUnauthorized=false for mysql with ssl=true (AWS requirement)', async () => {
      const provider = new RdsProvider({ ...baseConfig, engine: 'mysql', ssl: true });
      await provider.connect();
      const callArg = MockMySQLProvider.mock.calls[0][0];
      expect(callArg.ssl).toEqual({ rejectUnauthorized: false });
    });

    it('passes no ssl when ssl=false', async () => {
      const provider = new RdsProvider({ ...baseConfig, ssl: false });
      await provider.connect();
      const callArg = MockPostgresProvider.mock.calls[0][0];
      expect(callArg.ssl).toBeUndefined();
    });

    it('reads CA file and passes it when ssl={ca: path}', async () => {
      const caContent = Buffer.from('certificate-content');
      (fs.readFileSync as jest.Mock).mockReturnValue(caContent);

      const provider = new RdsProvider({ ...baseConfig, ssl: { ca: '/path/to/ca.pem' } });
      await provider.connect();

      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/ca.pem');
      const callArg = MockPostgresProvider.mock.calls[0][0];
      expect(callArg.ssl).toEqual({ ca: caContent });
    });
  });

  describe('default ports', () => {
    it('uses port 5432 for postgres when not specified', async () => {
      const provider = new RdsProvider({ ...baseConfig, engine: 'postgres' });
      await provider.connect();
      expect(MockPostgresProvider.mock.calls[0][0].port).toBe(5432);
    });

    it('uses port 3306 for mysql when not specified', async () => {
      const provider = new RdsProvider({ ...baseConfig, engine: 'mysql' });
      await provider.connect();
      expect(MockMySQLProvider.mock.calls[0][0].port).toBe(3306);
    });

    it('uses specified port', async () => {
      const provider = new RdsProvider({ ...baseConfig, engine: 'postgres', port: 5433 });
      await provider.connect();
      expect(MockPostgresProvider.mock.calls[0][0].port).toBe(5433);
    });
  });

  describe('entities auto-creation', () => {
    it('calls ensureEntities on connect when entities are defined', async () => {
      const provider = new RdsProvider({
        ...baseConfig,
        entities: [
          {
            name: 'users',
            columns: [{ name: 'id', type: 'serial', primaryKey: true }],
          },
        ],
      });
      await provider.connect();
      // raw() should have been called for CREATE TABLE
      expect(mockPostgresRaw).toHaveBeenCalledWith(
        expect.stringMatching(/CREATE TABLE IF NOT EXISTS "users"/),
      );
    });

    it('does not call ensureEntities when no entities defined', async () => {
      const provider = new RdsProvider({ ...baseConfig });
      await provider.connect();
      expect(mockPostgresRaw).not.toHaveBeenCalled();
    });
  });

  describe('delegation', () => {
    it('isConnected reflects connection state', async () => {
      const provider = new RdsProvider(baseConfig);
      expect(provider.isConnected).toBe(false);
      await provider.connect();
      expect(provider.isConnected).toBe(true);
    });

    it('disconnect delegates to inner and sets isConnected=false', async () => {
      const provider = new RdsProvider(baseConfig);
      await provider.connect();
      await provider.disconnect();
      expect(mockPostgresDisconnect).toHaveBeenCalledTimes(1);
      expect(provider.isConnected).toBe(false);
    });

    it('raw() delegates to inner provider', async () => {
      const provider = new RdsProvider(baseConfig);
      await provider.connect();
      await provider.raw('SELECT 1');
      expect(mockPostgresRaw).toHaveBeenCalledWith('SELECT 1', undefined);
    });

    it('raw() throws when not connected', async () => {
      const provider = new RdsProvider(baseConfig);
      await expect(provider.raw('SELECT 1')).rejects.toThrow('not connected');
    });

    it('repository() delegates to inner provider', async () => {
      const provider = new RdsProvider(baseConfig);
      await provider.connect();
      provider.repository('users');
      expect(mockPostgresRepository).toHaveBeenCalledWith('users');
    });

    it('queryBuilder() delegates to inner provider', async () => {
      const provider = new RdsProvider(baseConfig);
      await provider.connect();
      provider.queryBuilder();
      expect(mockPostgresQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });
});
