/**
 * Tests for Fox Engine Functions
 * Testing the custom Fox template engine parsing functions
 */

import { 
  parseSections, 
  replaceVariables, 
  replaceVariableSymbols,
  executeActions,
  evaluateAction,
  wrapHTML 
} from '../fox.engine.function';

describe('Fox Engine Functions', () => {
  
  describe('parseSections', () => {
    it('should parse single section correctly', () => {
      const data = '<section>Hello World</section>';
      const result = parseSections(data);
      
      expect(result).toEqual(['Hello World']);
    });

    it('should parse multiple sections correctly', () => {
      const data = '<section>Section 1</section><section>Section 2</section>';
      const result = parseSections(data);
      
      expect(result).toEqual(['Section 1', 'Section 2']);
    });

    it('should parse sections with multiline content', () => {
      const data = `<section>
        Line 1
        Line 2
      </section>`;
      const result = parseSections(data);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('Line 1');
      expect(result[0]).toContain('Line 2');
    });

    it('should return empty array when no sections found', () => {
      const data = 'No sections here';
      const result = parseSections(data);
      
      expect(result).toEqual([]);
    });

    it('should handle nested content in sections', () => {
      const data = '<section><div>Nested content</div></section>';
      const result = parseSections(data);
      
      expect(result).toEqual(['<div>Nested content</div>']);
    });
  });

  describe('replaceVariables', () => {
    it('should replace Input:: variables correctly', () => {
      const section = 'Hello Input::name';
      const options = { name: 'World', hasOwnProperty: (key: string) => key === 'name' };
      const result = replaceVariables(section, options);
      
      expect(result).toBe('Hello World');
    });

    it('should replace multiple Input:: variables', () => {
      const section = 'Input::greeting Input::name!';
      const options = { 
        greeting: 'Hello', 
        name: 'John',
        hasOwnProperty: (key: string) => ['greeting', 'name'].includes(key)
      };
      const result = replaceVariables(section, options);
      
      expect(result).toBe('Hello John!');
    });

    it('should replace Input:: variables with empty string when not found', () => {
      const section = 'Hello Input::missing';
      const options = { hasOwnProperty: () => false };
      const result = replaceVariables(section, options);
      
      expect(result).toBe('Hello ');
    });

    it('should handle section without Input:: variables', () => {
      const section = 'Static content';
      const options = { hasOwnProperty: () => false };
      const result = replaceVariables(section, options);
      
      expect(result).toBe('Static content');
    });
  });

  describe('replaceVariableSymbols', () => {
    it('should replace $ variables correctly', () => {
      const section = 'Hello $name';
      const options = { name: 'World', hasOwnProperty: (key: string) => key === 'name' };
      const result = replaceVariableSymbols(section, options);
      
      expect(result).toBe('Hello World');
    });

    it('should replace multiple $ variables', () => {
      const section = '$greeting $name!';
      const options = { 
        greeting: 'Hi', 
        name: 'Jane',
        hasOwnProperty: (key: string) => ['greeting', 'name'].includes(key)
      };
      const result = replaceVariableSymbols(section, options);
      
      expect(result).toBe('Hi Jane!');
    });

    it('should replace $ variables with empty string when not found', () => {
      const section = 'Hello $missing';
      const options = { hasOwnProperty: () => false };
      const result = replaceVariableSymbols(section, options);
      
      expect(result).toBe('Hello ');
    });

    it('should handle section without $ variables', () => {
      const section = 'Static content';
      const options = { hasOwnProperty: () => false };
      const result = replaceVariableSymbols(section, options);
      
      expect(result).toBe('Static content');
    });
  });

  describe('executeActions', () => {
    it('should handle section without actions', () => {
      const section = 'No actions here';
      const result = executeActions(section);
      
      expect(result).toBe('No actions here');
    });

    it('should process action tags and replace with evaluated result', () => {
      const section = 'Before <action>Exec::nonexistent</action> After';
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = executeActions(section);
      
      // The action tags are processed and replaced with the evaluation result
      expect(result).toBe('Before Exec::nonexistent After');
      consoleSpy.mockRestore();
    });

    it('should process multiple action tags', () => {
      const section = '<action>Exec::test1</action> and <action>Exec::test2</action>';
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = executeActions(section);
      
      // Current implementation processes all action tags in the section
      expect(result).toBe('Exec::test1 and Exec::test2');
      consoleSpy.mockRestore();
    });
  });

  describe('evaluateAction', () => {
    it('should return action unchanged when no match found', () => {
      const action = 'invalid action format';
      const result = evaluateAction(action);
      
      expect(result).toBe('invalid action format');
    });

    it('should handle action when function not found', () => {
      const action = '()=>[nonexistentFunction]';
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = evaluateAction(action);
      
      expect(result).toBe('');
      expect(consoleSpy).toHaveBeenCalledWith(
        "Action function 'nonexistentFunction' is not defined."
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle malformed action syntax', () => {
      const action = 'malformed()=>[test';
      const result = evaluateAction(action);
      
      expect(result).toBe('malformed()=>[test');
    });
  });

  describe('wrapHTML', () => {
    it('should wrap content in basic HTML structure', () => {
      const content = '<h1>Hello World</h1>';
      const result = wrapHTML(content);
      
      expect(result).toBe('<html><body><h1>Hello World</h1></body></html>');
    });

    it('should wrap empty content', () => {
      const content = '';
      const result = wrapHTML(content);
      
      expect(result).toBe('<html><body></body></html>');
    });

    it('should wrap complex content', () => {
      const content = '<div><p>Paragraph</p><span>Text</span></div>';
      const result = wrapHTML(content);
      
      expect(result).toBe('<html><body><div><p>Paragraph</p><span>Text</span></div></body></html>');
    });

    it('should handle content with special characters', () => {
      const content = '<p>Special: &amp; &lt; &gt;</p>';
      const result = wrapHTML(content);
      
      expect(result).toBe('<html><body><p>Special: &amp; &lt; &gt;</p></body></html>');
    });
  });
});
