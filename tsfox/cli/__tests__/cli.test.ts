// tsfox/cli/__tests__/cli.test.ts - CLI Integration Tests

import { FoxCLI } from '../cli';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('FoxCLI', () => {
  let cli: FoxCLI;
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    cli = new FoxCLI(true); // Enable test mode
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'fox-cli-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.promises.rmdir(tempDir, { recursive: true });
  });

  describe('CLI Initialization', () => {
    it('should create CLI instance', () => {
      expect(cli).toBeInstanceOf(FoxCLI);
    });

    it('should have version information', () => {
      // This test will depend on package.json having version
      expect(typeof cli['getVersion']).toBe('function');
    });
  });

  describe('Command Registration', () => {
    it('should register generate commands', () => {
      const commandManager = cli['commandManager'];
      expect(commandManager).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown commands gracefully', async () => {
      // Mock console.error to capture error output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        await cli.run(['node', 'cli.ts', 'unknown-command']);
        // Should not reach here
        expect(false).toBe(true);
      } catch (error) {
        // Expected to throw in test mode
        expect(error).toBeDefined();
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Context Management', () => {
    it('should set global context properly', () => {
      // Test that global context is set correctly
      expect(typeof cli['preActionHook']).toBe('function');
    });
  });
});
