import { DockerInitCommand } from '../init.command';
import { CLIContext } from '../../../interfaces/cli.interface';
import fs from 'fs/promises';
import path from 'path';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../../../generators/dockfile.generator', () => ({
  DockfileGenerator: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockResolvedValue([
      { path: '/tmp/test-project/Dockerfile', content: 'FROM node', action: 'create' },
      { path: '/tmp/test-project/.dockerignore', content: 'node_modules/', action: 'create' }
    ])
  }))
}));
jest.mock('../../../generators/compose.generator', () => ({
  ComposeGenerator: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockResolvedValue([
      { path: '/tmp/test-project/docker-compose.yml', content: 'version: "3"', action: 'create' }
    ])
  }))
}));
jest.mock('../../../core/template.manager', () => ({
  TemplateManager: jest.fn().mockImplementation(() => ({}))
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('DockerInitCommand', () => {
  let mockContext: CLIContext;
  let tempDir: string;

  beforeEach(() => {
    tempDir = '/tmp/test-project';
    mockContext = {
      command: DockerInitCommand,
      projectRoot: tempDir,
      verbose: false,
      quiet: false,
      noColor: false
    };

    jest.clearAllMocks();
  });

  describe('Command Definition', () => {
    it('should have correct name and description', () => {
      expect(DockerInitCommand.name).toBe('init');
      expect(DockerInitCommand.description).toBe('Initialize Docker configuration for the project');
    });

    it('should have correct options', () => {
      const options = DockerInitCommand.options;
      expect(options).toBeDefined();
      
      const alpineOption = options?.find(opt => opt.name === 'alpine');
      expect(alpineOption).toBeDefined();
      expect(alpineOption?.default).toBe(true);

      const multistageOption = options?.find(opt => opt.name === 'multistage');
      expect(multistageOption).toBeDefined();
      expect(multistageOption?.default).toBe(true);

      const nginxOption = options?.find(opt => opt.name === 'nginx');
      expect(nginxOption).toBeDefined();
      expect(nginxOption?.default).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should always validate successfully', () => {
      const result = DockerInitCommand.validate?.({}, {});
      expect(result).toEqual({ valid: true });
    });
  });

  describe('Action Execution', () => {
    it('should generate Docker configuration files', async () => {
      const args = {};
      const options = {
        alpine: true,
        multistage: true,
        nginx: false,
        ssl: false,
        production: false,
        testing: false
      };

      // Mock console.log to capture output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      try {
        await DockerInitCommand.action(args, options, mockContext);

        // Verify console output
        expect(consoleSpy).toHaveBeenCalledWith('🐳 Initializing Docker configuration...');
        expect(consoleSpy).toHaveBeenCalledWith('📦 Generating Dockerfile...');
        expect(consoleSpy).toHaveBeenCalledWith('🐳 Generating Docker Compose...');

      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('should generate nginx configuration when requested', async () => {
      const args = {};
      const options = {
        alpine: true,
        multistage: true,
        nginx: true,
        ssl: false,
        production: false,
        testing: false
      };

      // Mock fs.mkdir to prevent actual directory creation
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      try {
        await DockerInitCommand.action(args, options, mockContext);

        expect(consoleSpy).toHaveBeenCalledWith('🌐 Generating Nginx configuration...');

      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('should handle errors gracefully', async () => {
      const args = {};
      const options = { alpine: true };

      // Mock the DockfileGenerator to throw an error
      const { DockfileGenerator } = require('../../../generators/dockfile.generator');
      DockfileGenerator.mockImplementation(() => ({
        generate: jest.fn().mockRejectedValue(new Error('Generator failed'))
      }));
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await expect(DockerInitCommand.action(args, options, mockContext)).rejects.toThrow();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('❌ Failed to initialize Docker configuration')
        );

      } finally {
        consoleErrorSpy.mockRestore();
        // Restore the original mock
        DockfileGenerator.mockImplementation(() => ({
          generate: jest.fn().mockResolvedValue([
            { path: '/tmp/test-project/Dockerfile', content: 'FROM node', action: 'create' },
            { path: '/tmp/test-project/.dockerignore', content: 'node_modules/', action: 'create' }
          ])
        }));
      }
    });
  });

  describe('Next Steps Output', () => {
    it('should show appropriate next steps for development', async () => {
      const args = {};
      const options = {
        alpine: true,
        production: false
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      try {
        await DockerInitCommand.action(args, options, mockContext);

        expect(consoleSpy).toHaveBeenCalledWith('\n🚀 Next steps:');
        expect(consoleSpy).toHaveBeenCalledWith('  # Development');
        expect(consoleSpy).toHaveBeenCalledWith('  docker-compose -f docker-compose.dev.yml up');
        expect(consoleSpy).toHaveBeenCalledWith('  tsfox docker:run');

      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('should show production steps when production option is enabled', async () => {
      const args = {};
      const options = {
        alpine: true,
        production: true
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      try {
        await DockerInitCommand.action(args, options, mockContext);

        expect(consoleSpy).toHaveBeenCalledWith('  docker-compose -f docker-compose.prod.yml up -d');

      } finally {
        consoleSpy.mockRestore();
      }
    });
  });
});
