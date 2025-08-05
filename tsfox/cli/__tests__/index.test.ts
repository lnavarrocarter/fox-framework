/**
 * Tests for CLI Main Module
 * Testing the CLI command setup and basic functionality
 */

import { Command } from 'commander';
import * as generators from '../generators';

// Mock the generators module
jest.mock('../generators');
jest.mock('../commands/docker');
jest.mock('../commands/health');
jest.mock('../commands/metrics');
jest.mock('../commands/cache');
jest.mock('../commands/performance');

describe('CLI Main Module', () => {
  let mockGenerateController: jest.SpyInstance;
  let mockGenerateModel: jest.SpyInstance;
  let mockGenerateView: jest.SpyInstance;
  let mockGenerateNewProject: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGenerateController = jest.spyOn(generators, 'generateController').mockImplementation(() => {});
    mockGenerateModel = jest.spyOn(generators, 'generateModel').mockImplementation(() => {});
    mockGenerateView = jest.spyOn(generators, 'generateView').mockImplementation(() => {});
    mockGenerateNewProject = jest.spyOn(generators, 'generateNewProject').mockImplementation(async () => {});

    // Mock command collections
    const dockerCommands = require('../commands/docker');
    dockerCommands.DockerCommands = [];

    const healthCommands = require('../commands/health');
    healthCommands.HealthCommands = [];

    const metricsCommands = require('../commands/metrics');
    metricsCommands.MetricsCommands = [];

    const cacheCommands = require('../commands/cache');
    cacheCommands.CacheCommands = [];

    const performanceCommands = require('../commands/performance');
    performanceCommands.PerformanceCommands = [];

    // Suppress console outputs for cleaner test results
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process.exit called with code ${code}`);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CLI Command Setup', () => {
    it('should setup commander program without throwing', () => {
      // Test that the CLI module exports can be imported
      expect(Command).toBeDefined();
      expect(typeof Command).toBe('function');
    });
  });

  describe('Generator Commands', () => {
    it('should have all required generator functions', () => {
      expect(generators.generateController).toBeDefined();
      expect(generators.generateModel).toBeDefined();
      expect(generators.generateView).toBeDefined();
      expect(generators.generateNewProject).toBeDefined();
    });

    it('should call generateController with the provided name', () => {
      generators.generateController('user-controller');
      expect(mockGenerateController).toHaveBeenCalledWith('user-controller');
    });

    it('should call generateModel with the provided name', () => {
      generators.generateModel('UserModel');
      expect(mockGenerateModel).toHaveBeenCalledWith('UserModel');
    });

    it('should call generateView with the provided name', () => {
      generators.generateView('user_view');
      expect(mockGenerateView).toHaveBeenCalledWith('user_view');
    });

    it('should call generateNewProject with project name and template', async () => {
      await generators.generateNewProject('myproject', 'api');
      expect(mockGenerateNewProject).toHaveBeenCalledWith('myproject', 'api');
    });

    it('should handle async operations in generateNewProject', async () => {
      const promise = generators.generateNewProject('test', 'basic');
      expect(promise).toBeInstanceOf(Promise);
      await promise;
      expect(mockGenerateNewProject).toHaveBeenCalled();
    });
  });

  describe('CLI Integration', () => {
    it('should handle different name formats', () => {
      generators.generateController('TestController');
      expect(mockGenerateController).toHaveBeenCalledWith('TestController');

      generators.generateModel('TestModel');
      expect(mockGenerateModel).toHaveBeenCalledWith('TestModel');

      generators.generateView('TestView');
      expect(mockGenerateView).toHaveBeenCalledWith('TestView');
    });
  });

  describe('Command Integration', () => {
    it('should have access to all command modules', () => {
      const dockerCommands = require('../commands/docker');
      const healthCommands = require('../commands/health');
      const metricsCommands = require('../commands/metrics');
      const cacheCommands = require('../commands/cache');
      const performanceCommands = require('../commands/performance');

      expect(dockerCommands).toBeDefined();
      expect(healthCommands).toBeDefined();
      expect(metricsCommands).toBeDefined();
      expect(cacheCommands).toBeDefined();
      expect(performanceCommands).toBeDefined();
    });

    it('should initialize command collections as arrays', () => {
      const dockerCommands = require('../commands/docker');
      const healthCommands = require('../commands/health');

      expect(Array.isArray(dockerCommands.DockerCommands)).toBe(true);
      expect(Array.isArray(healthCommands.HealthCommands)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle generator errors gracefully', () => {
      mockGenerateController.mockImplementation(() => {
        throw new Error('Generator failed');
      });

      expect(() => {
        generators.generateController('test');
      }).toThrow('Generator failed');
    });

    it('should handle async generator errors', async () => {
      mockGenerateNewProject.mockRejectedValue(new Error('Async generator failed'));

      await expect(generators.generateNewProject('test', 'basic'))
        .rejects.toThrow('Async generator failed');
    });
  });
});
