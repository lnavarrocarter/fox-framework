/**
 * Shared mock factory for the `better-sqlite3` module.
 */

export interface MockStatement {
  get: jest.Mock;
  all: jest.Mock;
  run: jest.Mock;
}

export interface MockDb {
  prepare: jest.Mock;
  close: jest.Mock;
}

export function createMockStatement(result: {
  get?: unknown;
  all?: unknown[];
  run?: { changes: number; lastInsertRowid: number };
}): MockStatement {
  return {
    get: jest.fn().mockReturnValue(result.get ?? null),
    all: jest.fn().mockReturnValue(result.all ?? []),
    run: jest.fn().mockReturnValue(result.run ?? { changes: 1, lastInsertRowid: 1 }),
  };
}

export function createMockDb(): MockDb {
  return {
    prepare: jest.fn(),
    close: jest.fn(),
  };
}
