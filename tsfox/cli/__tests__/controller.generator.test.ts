// tsfox/cli/__tests__/controller.generator.test.ts - Controller Generator Tests

import { ControllerGenerator } from '../generators/controller.generator';
import { TemplateManager } from '../core/template.manager';
import { GeneratorContext } from '../interfaces/cli.interface';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('ControllerGenerator', () => {
  let generator: ControllerGenerator;
  let templateManager: TemplateManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'controller-gen-test-'));
    templateManager = new TemplateManager();
    generator = new ControllerGenerator(templateManager);
  });

  afterEach(async () => {
    await fs.promises.rmdir(tempDir, { recursive: true });
  });

  describe('Basic Generation', () => {
    it('should generate basic controller', async () => {
      const context: GeneratorContext = {
        name: 'test',
        options: {},
        projectRoot: tempDir,
        config: {
          name: 'test-project',
          version: '1.0.0',
          framework: { version: '1.0.0', features: [] }
        },
        templates: templateManager
      };

      const files = await generator.generate(context);

      expect(files).toHaveLength(1);
      expect(files[0].path).toContain('test.controller.ts');
      expect(files[0].content).toContain('TestController');
    });

    it('should generate CRUD controller', async () => {
      const context: GeneratorContext = {
        name: 'user',
        options: { crud: true },
        projectRoot: tempDir,
        config: {
          name: 'test-project',
          version: '1.0.0',
          framework: { version: '1.0.0', features: [] }
        },
        templates: templateManager
      };

      const files = await generator.generate(context);

      expect(files[0].content).toContain('getAll');
      expect(files[0].content).toContain('getById');
      expect(files[0].content).toContain('create');
      expect(files[0].content).toContain('update');
      expect(files[0].content).toContain('delete');
    });

    it('should generate controller with test file', async () => {
      const context: GeneratorContext = {
        name: 'user',
        options: { test: true },
        projectRoot: tempDir,
        config: {
          name: 'test-project',
          version: '1.0.0',
          framework: { version: '1.0.0', features: [] }
        },
        templates: templateManager
      };

      const files = await generator.generate(context);

      expect(files).toHaveLength(2);
      expect(files.some(f => f.path.includes('.test.ts'))).toBe(true);
    });

    it('should generate controller with service', async () => {
      const context: GeneratorContext = {
        name: 'user',
        options: { service: true },
        projectRoot: tempDir,
        config: {
          name: 'test-project',
          version: '1.0.0',
          framework: { version: '1.0.0', features: [] }
        },
        templates: templateManager
      };

      const files = await generator.generate(context);

      expect(files).toHaveLength(2);
      expect(files.some(f => f.path.includes('.service.ts'))).toBe(true);
    });
  });

  describe('Name Formatting', () => {
    it('should handle different name formats', async () => {
      const testCases = [
        { input: 'user', expected: 'UserController' },
        { input: 'user-profile', expected: 'UserProfileController' },
        { input: 'user_settings', expected: 'UserSettingsController' },
        { input: 'UserAccount', expected: 'UserAccountController' }
      ];

      for (const testCase of testCases) {
        const context: GeneratorContext = {
          name: testCase.input,
          options: {},
          projectRoot: tempDir,
          config: {
            name: 'test-project',
            version: '1.0.0',
            framework: { version: '1.0.0', features: [] }
          },
          templates: templateManager
        };

        const files = await generator.generate(context);
        expect(files[0].content).toContain(testCase.expected);
      }
    });
  });

  describe('Validation', () => {
    it('should validate context', () => {
      const invalidContext = {
        name: '',
        options: {},
        projectRoot: tempDir,
        config: {
          name: 'test-project',
          version: '1.0.0',
          framework: { version: '1.0.0', features: [] }
        },
        templates: templateManager
      };

      expect(() => {
        generator['validateContext'](invalidContext);
      }).toThrow();
    });
  });
});
