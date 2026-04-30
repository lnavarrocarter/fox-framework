import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'examples/**',
      'src/**',
      '**/*.js',
      '**/*.mjs',
      '**/*.d.ts',
    ],
  },
  // TypeScript source files
  {
    files: ['tsfox/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // any — common in framework internals, warn only
      '@typescript-eslint/no-explicit-any': 'warn',
      // Unused vars — warn so CI doesn't fail until cleaned up
      // TODO: upgrade to 'error' once all unused vars are prefixed with _
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Raw console — warn; framework should use LoggerFactory
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      // namespace — warn for now, clean up in a future sprint
      '@typescript-eslint/no-namespace': 'warn',
      // ban-types replacement for Function
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      // Empty interface and this-alias — warn until cleaned up
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
    },
  },
];
