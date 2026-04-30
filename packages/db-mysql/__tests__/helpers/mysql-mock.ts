/**
 * Shared mock factory for the `mysql2/promise` module.
 *
 * Returns a fully-controllable Pool mock so tests never touch a real database.
 */

export interface MockPool {
  execute: jest.Mock;
  getConnection: jest.Mock;
  end: jest.Mock;
}

export function createMockPool(): MockPool {
  const mockConnection = { release: jest.fn() };

  return {
    execute: jest.fn().mockResolvedValue([[], []]),
    getConnection: jest.fn().mockResolvedValue(mockConnection),
    end: jest.fn().mockResolvedValue(undefined),
  };
}
