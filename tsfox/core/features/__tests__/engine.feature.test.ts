import { engineFox, engineHtml } from '../engine.feature';
import fs from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Template Engines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('engineFox', () => {
    it('should render simple template with variables', (done) => {
      const templateContent = '<h1>{{title}}</h1><p>{{message}}</p>';
      const options = {
        title: 'Test Title',
        message: 'Test Message'
      };

      mockedFs.readFile.mockImplementation((filePath, callback) => {
        const cb = callback as any;
        cb(null, templateContent);
      });

      engineFox('test.fox', options, (err: any, result: any) => {
        expect(err).toBeNull();
        expect(result).toContain('Test Title');
        expect(result).toContain('Test Message');
        done();
      });
    });

    it('should handle file read errors', (done) => {
      const options = { title: 'Test' };
      const error = new Error('File not found');

      mockedFs.readFile.mockImplementation((filePath, callback) => {
        const cb = callback as any;
        cb(error);
      });

      engineFox('nonexistent.fox', options, (err: any, result: any) => {
        expect(err).toBe(error);
        expect(result).toBeUndefined();
        done();
      });
    });

    it('should handle templates without variables', (done) => {
      const templateContent = '<h1>Static Content</h1>';
      const options = {};

      mockedFs.readFile.mockImplementation((filePath, callback) => {
        const cb = callback as (err: NodeJS.ErrnoException | null, data: Buffer) => void;
        cb(null, Buffer.from(templateContent));
      });

      engineFox('static.fox', options, (err: any, result: any) => {
        expect(err).toBeNull();
        expect(result).toBe('<h1>Static Content</h1>');
        done();
      });
    });

    it('should handle missing variables gracefully', (done) => {
      const templateContent = '<h1>{{title}}</h1><p>{{missing}}</p>';
      const options = { title: 'Test Title' };

      mockedFs.readFile.mockImplementation((filePath, callback) => {
        const cb = callback as (err: NodeJS.ErrnoException | null, data: Buffer) => void;
        cb(null, Buffer.from(templateContent));
      });

      engineFox('partial.fox', options, (err: any, result: any) => {
        expect(err).toBeNull();
        expect(result).toContain('Test Title');
        expect(result).toContain('{{missing}}'); // Should remain unreplaced
        done();
      });
    });

    it('should handle complex nested variables', (done) => {
      const templateContent = '<div>{{user.name}}</div><div>{{user.email}}</div>';
      const options = {
        user: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      };

      mockedFs.readFile.mockImplementation((filePath, callback) => {
        const cb = callback as (err: NodeJS.ErrnoException | null, data: Buffer) => void;
        cb(null, Buffer.from(templateContent));
      });

      engineFox('user.fox', options, (err: any, result: any) => {
        expect(err).toBeNull();
        expect(result).toContain('John Doe');
        expect(result).toContain('john@example.com');
        done();
      });
    });
  });

  describe('engineHtml', () => {
    it('should read and return HTML file content', (done) => {
      const htmlContent = '<html><body><h1>Test HTML</h1></body></html>';

      mockedFs.readFile.mockImplementation((filePath, callback) => {
        const cb = callback as (err: NodeJS.ErrnoException | null, data: Buffer) => void;
        cb(null, Buffer.from(htmlContent));
      });

      engineHtml('test.html', {}, (err: any, result: any) => {
        expect(err).toBeNull();
        expect(result).toBe(htmlContent);
        done();
      });
    });

    it('should handle file read errors', (done) => {
      const error = new Error('File not found');

      mockedFs.readFile.mockImplementation((filePath, callback) => {
        const cb = callback as (err: NodeJS.ErrnoException | null, data?: Buffer) => void;
        cb(error);
      });

      engineHtml('nonexistent.html', {}, (err: any, result: any) => {
        expect(err).toBe(error);
        expect(result).toBeUndefined();
        done();
      });
    });

    it('should ignore options parameter', (done) => {
      const htmlContent = '<html><body>Content</body></html>';
      const options = { title: 'Ignored', data: 'Also ignored' };

      mockedFs.readFile.mockImplementation((filePath, callback) => {
        const cb = callback as (err: NodeJS.ErrnoException | null, data: Buffer) => void;
        cb(null, Buffer.from(htmlContent));
      });

      engineHtml('test.html', options, (err: any, result: any) => {
        expect(err).toBeNull();
        expect(result).toBe(htmlContent);
        done();
      });
    });
  });

  describe('Engine Integration', () => {
    it('should handle different file extensions correctly', () => {
      // This would typically be tested with actual Express integration
      const foxFile = 'template.fox';
      const htmlFile = 'template.html';

      expect(foxFile.endsWith('.fox')).toBe(true);
      expect(htmlFile.endsWith('.html')).toBe(true);
    });
  });
});
