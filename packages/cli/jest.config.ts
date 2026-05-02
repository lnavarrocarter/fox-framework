import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', allowJs: true }],
  },
  // inquirer v9+, chalk v5+, ora v7+ are ESM-only — must be transformed by ts-jest
  transformIgnorePatterns: ['node_modules/(?!(inquirer|chalk|ora|@inquirer)/)'],
  testTimeout: 15000,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
};

export default config;
