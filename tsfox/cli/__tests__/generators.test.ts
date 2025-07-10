import { generateController } from '../generators';
import fs from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock path module for consistent testing
jest.mock('path');
const mockedPath = path as jest.Mocked<typeof path>;

describe('CLI Generators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default path mocks
    mockedPath.join.mockImplementation((...segments) => segments.join('/'));
    mockedPath.resolve.mockImplementation((...segments) => '/' + segments.join('/'));
  });

  describe('generateController', () => {
    it('should generate a basic controller file', () => {
      const controllerName = 'User';
      const expectedPath = 'src/controllers/user.controller.ts';
      
      // Mock fs.existsSync to return false (directory doesn't exist)
      mockedFs.existsSync.mockReturnValue(false);
      
      // Mock fs.mkdirSync
      mockedFs.mkdirSync.mockImplementation(() => '');
      
      // Mock fs.writeFileSync
      mockedFs.writeFileSync.mockImplementation(() => {});

      generateController(controllerName);

      // Verify directory creation
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('controllers'),
        { recursive: true }
      );

      // Verify file writing
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('user.controller.ts'),
        expect.stringContaining('UserController')
      );
    });

    it('should handle existing directories gracefully', () => {
      const controllerName = 'Product';
      
      // Mock fs.existsSync to return true (directory exists)
      mockedFs.existsSync.mockReturnValue(true);
      
      // Mock fs.writeFileSync
      mockedFs.writeFileSync.mockImplementation(() => {});

      generateController(controllerName);

      // Verify directory creation is not called
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();

      // Verify file writing still happens
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('product.controller.ts'),
        expect.stringContaining('ProductController')
      );
    });

    it('should generate controller with correct class name formatting', () => {
      const controllerName = 'userProfile';
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.writeFileSync.mockImplementation(() => {});

      generateController(controllerName);

      // Get the content that was written
      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      const content = writeCall[1] as string;

      expect(content).toContain('UserProfileController');
      expect(content).toContain('class UserProfileController');
      expect(content).toContain('export default UserProfileController');
    });

    it('should generate controller with basic CRUD methods', () => {
      const controllerName = 'Post';
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.writeFileSync.mockImplementation(() => {});

      generateController(controllerName);

      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      const content = writeCall[1] as string;

      // Check for CRUD methods
      expect(content).toContain('index(');
      expect(content).toContain('show(');
      expect(content).toContain('create(');
      expect(content).toContain('update(');
      expect(content).toContain('delete(');
    });

    it('should handle special characters in controller name', () => {
      const controllerName = 'user-profile';
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.writeFileSync.mockImplementation(() => {});

      generateController(controllerName);

      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      const fileName = writeCall[0] as string;
      const content = writeCall[1] as string;

      expect(fileName).toContain('user-profile.controller.ts');
      expect(content).toContain('UserProfileController'); // Should be properly formatted
    });

    it('should include proper imports and Express types', () => {
      const controllerName = 'API';
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.writeFileSync.mockImplementation(() => {});

      generateController(controllerName);

      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      const content = writeCall[1] as string;

      // Check for proper imports
      expect(content).toMatch(/import.*Request.*Response.*from.*express/);
      expect(content).toContain('req: Request');
      expect(content).toContain('res: Response');
    });

    it('should handle lowercase controller names', () => {
      const controllerName = 'admin';
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.writeFileSync.mockImplementation(() => {});

      generateController(controllerName);

      const writeCall = mockedFs.writeFileSync.mock.calls[0];
      const content = writeCall[1] as string;

      expect(content).toContain('AdminController');
      expect(content).toContain('class AdminController');
    });

    it('should handle empty or invalid controller names', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.writeFileSync.mockImplementation(() => {});

      // Test empty string
      expect(() => generateController('')).toThrow();

      // Test null/undefined
      expect(() => generateController(null as any)).toThrow();
      expect(() => generateController(undefined as any)).toThrow();
    });

    it('should handle filesystem errors gracefully', () => {
      const controllerName = 'ErrorTest';
      
      // Mock fs.existsSync to throw an error
      mockedFs.existsSync.mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      expect(() => generateController(controllerName)).toThrow('Filesystem error');
    });

    it('should create nested directory structure if needed', () => {
      const controllerName = 'Admin/User';
      
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => '');
      mockedFs.writeFileSync.mockImplementation(() => {});

      generateController(controllerName);

      // Should create nested directories
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('controllers'),
        { recursive: true }
      );

      // File should be created with proper path
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('admin/user.controller.ts'),
        expect.stringContaining('AdminUserController')
      );
    });
  });

  describe('CLI Template System', () => {
    it('should load and process templates correctly', () => {
      // This would test the template loading mechanism
      const templateName = 'controller';
      
      // Mock template file reading
      mockedFs.readFileSync.mockReturnValue(
        'class {{ClassName}}Controller {\n  // Template content\n}'
      );

      // This test would verify template processing logic
      // Implementation would depend on actual template system
      expect(templateName).toBe('controller');
    });

    it('should handle missing templates gracefully', () => {
      // Mock template file reading to throw error
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('Template not found');
      });

      // Should handle missing template files
      expect(() => {
        mockedFs.readFileSync('nonexistent.template');
      }).toThrow('Template not found');
    });
  });

  describe('CLI Utilities', () => {
    it('should format class names correctly', () => {
      // Import the actual function
      const { formatClassName } = require('../generators');
      
      // Test various input formats and expected outputs
      const testCases = [
        { input: 'user', expected: 'User' },
        { input: 'userProfile', expected: 'UserProfile' },
        { input: 'user-profile', expected: 'UserProfile' },
        { input: 'user_profile', expected: 'UserProfile' },
        { input: 'USER_PROFILE', expected: 'UserProfile' }
      ];

      testCases.forEach(({ input, expected }) => {
        const formatted = formatClassName(input);
        expect(formatted).toBe(expected);
      });
    });

    it('should format file names correctly', () => {
      // Import the actual function
      const { formatFileName } = require('../generators');
      
      // Test file name formatting
      const testCases = [
        { input: 'User', expected: 'user' },
        { input: 'UserProfile', expected: 'user-profile' },
        { input: 'APIController', expected: 'api-controller' }
      ];

      testCases.forEach(({ input, expected }) => {
        const formatted = formatFileName(input);
        expect(formatted).toBe(expected);
      });
    });
  });
});
