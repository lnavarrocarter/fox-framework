import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  globalTeardown: '<rootDir>/jest.teardown.ts',
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
  // Test timeout increased for performance tests
  testTimeout: 30000,
  // Force exit to prevent hanging
  forceExit: true,
  // Detect open handles in development
  detectOpenHandles: process.env.NODE_ENV === 'development',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/tsfox/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^inquirer$': '<rootDir>/__mocks__/inquirer.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(inquirer)/)'
  ],
  clearMocks: true,
  restoreMocks: true
};

export default config;
