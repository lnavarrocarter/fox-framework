import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tsfox'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'tsfox/**/*.ts',
    'src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/tsfox/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^inquirer$': '<rootDir>/__mocks__/inquirer.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(inquirer)/)'
  ],
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true
};

export default config;
