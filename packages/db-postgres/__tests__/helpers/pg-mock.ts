/**
 * Shared mock factory for the `pg` module.
 *
 * Returns a fully-controllable Pool mock so tests never touch a real database.
 */

export interface MockQueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export interface MockPool {
  query: jest.Mock;
  connect: jest.Mock;
  end: jest.Mock;
}

export function createMockPool(defaultResult?: Partial<MockQueryResult>): MockPool {
  const result: MockQueryResult = {
    rows: defaultResult?.rows ?? [],
    rowCount: defaultResult?.rowCount ?? (defaultResult?.rows?.length ?? 0),
  };

  const mockClient = { release: jest.fn() };

  return {
    query: jest.fn().mockResolvedValue(result),
    connect: jest.fn().mockResolvedValue(mockClient),
    end: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Sets up `jest.mock('pg')` with a controllable Pool constructor.
 * Call this at the top of your describe block (before imports).
 */
export function setupPgMock() {
  const poolInstances: MockPool[] = [];

  jest.mock('pg', () => {
    return {
      Pool: jest.fn().mockImplementation(() => {
        const instance = createMockPool();
        poolInstances.push(instance);
        return instance;
      }),
    };
  });

  return { getPoolInstances: () => poolInstances };
}
