import type { Config } from 'jest';
const config: Config = { preset: 'ts-jest', testEnvironment: 'node', roots: ['<rootDir>/src/__tests__'], transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }] } };
export default config;
