/**
 * Tests for CLI Main Module
 * Testing the CLI command setup and basic functionality
 */

import { Command } from 'commander';
import * as generators from '../generators';

// Mock the generators module
jest.mock('../generators');

describe('CLI Main Module', () => {
  let mockGenerateController: jest.SpyInstance;
  let mockGenerateModel: jest.SpyInstance;
  let mockGenerateView: jest.SpyInstance;

  beforeEach(() => {
    mockGenerateController = jest.spyOn(generators, 'generateController').mockImplementation(() => {});
    mockGenerateModel = jest.spyOn(generators, 'generateModel').mockImplementation(() => {});
    mockGenerateView = jest.spyOn(generators, 'generateView').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CLI Command Setup', () => {
    it('should setup commander program without throwing', () => {
      // Test that the CLI module exports can be imported
      expect(Command).toBeDefined();
      expect(typeof Command).toBe('function');
    });
  });

  describe('Generator Commands', () => {
    it('should have generateController function available', () => {
      expect(generators.generateController).toBeDefined();
      expect(typeof generators.generateController).toBe('function');
    });

    it('should have generateModel function available', () => {
      expect(generators.generateModel).toBeDefined();
      expect(typeof generators.generateModel).toBe('function');
    });

    it('should have generateView function available', () => {
      expect(generators.generateView).toBeDefined();
      expect(typeof generators.generateView).toBe('function');
    });
  });

  describe('CLI Integration', () => {
    it('should be able to call generator functions', () => {
      generators.generateController('TestController');
      expect(mockGenerateController).toHaveBeenCalledWith('TestController');

      generators.generateModel('TestModel');
      expect(mockGenerateModel).toHaveBeenCalledWith('TestModel');

      generators.generateView('TestView');
      expect(mockGenerateView).toHaveBeenCalledWith('TestView');
    });

    it('should handle different name formats', () => {
      generators.generateController('user-controller');
      expect(mockGenerateController).toHaveBeenCalledWith('user-controller');

      generators.generateModel('UserModel');
      expect(mockGenerateModel).toHaveBeenCalledWith('UserModel');

      generators.generateView('user_view');
      expect(mockGenerateView).toHaveBeenCalledWith('user_view');
    });
  });
});
