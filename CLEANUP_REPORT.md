# Cleanup Report — Fox Framework Technical Debt

Generated: 2025-07-14

## 1. Deleted: `tsfox/cli/` (entire directory)
- **Risk: LOW**
- Full duplicate of `packages/cli/src/`. Same structure, same files, same code.
- `tsconfig.json` already excluded it from build (`"exclude": ["tsfox/cli/**/*"]`).
- Real CLI lives at `packages/cli/` (`@foxframework/cli`) with its own `package.json`, `tsconfig.json`, `jest.config.ts`, and `bin.ts` entry.
- 3 files unique to `tsfox/cli/` (not in `packages/cli/`): `project-generator.ts`, `commands/project/wizard.ts`, `__tests__/cli.test.ts`. All self-referential within `tsfox/cli/` — no external consumers. Dead code.
- Action: `rm -rf tsfox/cli`

## 2. Deleted: `tsfox/temp/` (empty directory)
- **Risk: NONE**
- Empty directory, zero references in codebase.
- Action: `rm -rf tsfox/temp`

## 3. Deleted: `tsfox/server.test.ts`
- **Risk: NONE**
- Trivial smoke test (`expect(true).toBe(true)`), zero references.
- Action: `rm tsfox/server.test.ts`

## 4. Cleaned: `tsconfig.json`
- **Risk: LOW**
- Removed `"src/**/*"` from exclude (orphaned — `src/` dir doesn't exist at root).
- Removed `"tsfox/cli/**/*"` from exclude (directory deleted).
- New exclude: `["node_modules", "**/*.test.ts", "examples/**/*"]`

## 5. Cleaned: `tsconfig.example.json`
- **Risk: LOW**
- Removed `"src/**/*"` from include (orphaned — `src/` doesn't exist).
- New include: `["tsfox/**/*"]`

## 6. Kept: `__mocks__/inquirer.js`
- **Risk: N/A** (keep)
- Required by `jest.config.ts` and `jest.config.safe.ts` via `moduleNameMapper: { '^inquirer$': '<rootDir>/__mocks__/inquirer.js' }`.
- Needed because inquirer v9+ is ESM-only and must be mocked in Jest (CJS).

## Validation
- `tsc --noEmit` should still pass (tsfox/cli was already excluded, src/ never existed).
- Jest configs still reference `__mocks__/inquirer.js` — unchanged.
- `packages/cli/` remains the canonical CLI package.
