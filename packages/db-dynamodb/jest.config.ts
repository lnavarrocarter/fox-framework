import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@foxframework/core$': '<rootDir>/../../tsfox/index.ts',
    '^@foxframework/core/(.*)$': '<rootDir>/../../tsfox/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 15000,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
};

export default config;
