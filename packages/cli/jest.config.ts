import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  // inquirer v9+, chalk v5+, ora v7+, log-symbols are ESM-only
  // ts-jest transform is unreliable for ESM subpath imports (#ansi-styles)
  // → use CommonJS mocks via moduleNameMapper instead
  transformIgnorePatterns: [
    'node_modules/(?!(tslib)/)',
  ],
  moduleNameMapper: {
    '^chalk$': '<rootDir>/src/__mocks__/chalk.ts',
    '^inquirer$': '<rootDir>/src/__mocks__/inquirer.ts',
  },
  testTimeout: 15000,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
};

export default config;
