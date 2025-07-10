import {
    parseSections,
    replaceVariables,
    replaceVariableSymbols,
    executeActions,
    evaluateAction,
    wrapHTML
} from '../fox.engine.function';

// Mock console.error to avoid test output noise
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Mock global object for action evaluation tests
declare let global: any;

describe('Fox Engine Functions - Enhanced Branch Coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        mockConsoleError.mockRestore();
    });

    describe('executeActions - Enhanced Coverage', () => {
        it('should handle actions with complex Exec:: content', () => {
            const section = 'Start <action>Exec::complexFunction(param1, param2)</action> End';
            
            const result = executeActions(section);
            
            // Should process the action regardless of complexity
            expect(result).toContain('Start');
            expect(result).toContain('End');
            expect(result).not.toContain('<action>');
        });

        it('should process multiple actions sequentially', () => {
            const section = '<action>Exec::first</action> middle <action>Exec::second</action>';
            
            const result = executeActions(section);
            
            // evaluateAction returns the original action when function not found
            expect(result).toBe('Exec::first middle Exec::second');
        });

        it('should handle malformed action tags gracefully', () => {
            const section = '<action>NotExecFormat</action>';
            
            const result = executeActions(section);
            
            // Non-Exec:: action should remain unchanged
            expect(result).toBe('<action>NotExecFormat</action>');
        });

        it('should handle empty action content', () => {
            const section = '<action></action>';
            
            const result = executeActions(section);
            
            // Empty action should remain unchanged since it doesn't match Exec:: pattern
            expect(result).toBe('<action></action>');
        });

        it('should handle actions with whitespace', () => {
            const section = '<action>  Exec::testFunction  </action>';
            
            const result = executeActions(section);
            
            expect(result).toContain('Exec::testFunction');
        });
    });

    describe('evaluateAction - Enhanced Coverage', () => {
        beforeEach(() => {
            // Reset global/window mock
            if (typeof global !== 'undefined') {
                global.window = undefined;
            }
        });

        afterEach(() => {
            // Clean up global state
            if (typeof global !== 'undefined') {
                delete global.window;
            }
        });

        it('should handle window object with valid function', () => {
            // Mock window with a test function
            global.window = {
                testFunc: jest.fn().mockReturnValue('test result')
            };
            
            // Mock eval to return the function result
            const originalEval = global.eval;
            global.eval = jest.fn().mockReturnValue('mocked result');
            
            const action = '()=>[testFunc]';
            
            const result = evaluateAction(action);
            
            expect(result).toBe('mocked result');
            
            // Restore eval
            global.eval = originalEval;
        });

        it('should handle eval throwing an error', () => {
            global.window = {
                errorFunc: jest.fn()
            };
            
            // Mock eval to throw error
            const originalEval = global.eval;
            global.eval = jest.fn().mockImplementation(() => {
                throw new Error('Eval execution error');
            });
            
            const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
            
            const action = '()=>[errorFunc]';
            
            const result = evaluateAction(action);
            
            expect(result).toBe('');
            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining("Error executing action function"),
                expect.any(Error)
            );
            
            // Restore eval
            global.eval = originalEval;
            mockConsoleError.mockRestore();
        });

        it('should handle window property that is not a function', () => {
            global.window = {
                notAFunction: 'just a string value'
            };
            
            const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
            
            const action = '()=>[notAFunction]';
            
            const result = evaluateAction(action);
            
            expect(result).toBe('');
            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining("Action function 'notAFunction' is not defined.")
            );
            
            mockConsoleError.mockRestore();
        });

        it('should handle undefined window environment', () => {
            // Ensure window is undefined
            global.window = undefined;
            
            const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
            
            const action = '()=>[someFunction]';
            
            const result = evaluateAction(action);
            
            expect(result).toBe('');
            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining("Action function 'someFunction' is not defined.")
            );
            
            mockConsoleError.mockRestore();
        });

        it('should handle action with empty function name', () => {
            global.window = {};
            
            const action = '()=>[  ]'; // Empty function name with spaces
            
            const result = evaluateAction(action);
            
            // Should return original action since regex doesn't match whitespace
            expect(result).toBe('()=>[  ]');
        });

        it('should handle various regex match cases', () => {
            // Test different function name patterns
            const testCases = [
                '()=>[validName]',
                '()=>[name123]',
                '()=>[mixedCase_Name]'
            ];

            testCases.forEach(action => {
                const result = evaluateAction(action);
                // All should result in empty string due to undefined functions
                expect(result).toBe('');
            });
        });
    });

    describe('replaceVariables - Edge Cases', () => {
        it('should handle options object with prototype properties', () => {
            const section = 'Hello Input::name and Input::inherited';
            
            // Create object with prototype property using constructor function
            function BaseOptions(this: any) {}
            BaseOptions.prototype.inherited = 'from prototype';
            
            const options = new (BaseOptions as any)();
            options.name = 'Direct';
            options.hasOwnProperty = Object.prototype.hasOwnProperty.bind(options);
            
            const result = replaceVariables(section, options);
            
            // Should only replace direct properties, not inherited ones
            expect(result).toBe('Hello Direct and ');
        });

        it('should handle options with custom hasOwnProperty that returns false', () => {
            const section = 'Hello Input::name';
            const options = { 
                name: 'Test',
                hasOwnProperty: () => false // Always returns false
            };
            
            const result = replaceVariables(section, options);
            
            expect(result).toBe('Hello ');
        });

        it('should handle mixed variable types in same section', () => {
            const section = 'Input::greeting $name from Input::location on $date';
            const options = {
                greeting: 'Hello',
                name: 'John',
                location: 'Madrid',
                date: '2024',
                hasOwnProperty: (key: string) => ['greeting', 'name', 'location', 'date'].includes(key)
            };
            
            const result = replaceVariables(section, options);
            
            expect(result).toBe('Hello John from Madrid on 2024');
        });
    });

    describe('replaceVariableSymbols - Edge Cases', () => {
        it('should handle $ at end of string', () => {
            const section = 'End with $';
            const options = { hasOwnProperty: () => false };
            
            const result = replaceVariableSymbols(section, options);
            
            expect(result).toBe('End with $');
        });

        it('should handle multiple $ symbols without valid variable names', () => {
            const section = '$ $$ $invalid';
            const options = { hasOwnProperty: () => false };
            
            const result = replaceVariableSymbols(section, options);
            
            // $invalid will be matched but replaced with empty string since hasOwnProperty returns false
            expect(result).toBe('$ $$ ');
        });

        it('should handle $variable at start of string', () => {
            const section = '$start middle $end';
            const options = { 
                start: 'Beginning',
                end: 'Finish',
                hasOwnProperty: (key: string) => ['start', 'end'].includes(key)
            };
            
            const result = replaceVariableSymbols(section, options);
            
            expect(result).toBe('Beginning middle Finish');
        });
    });

    describe('parseSections - Edge Cases', () => {
        it('should handle sections with no content', () => {
            const data = '<section></section>';
            const result = parseSections(data);
            
            expect(result).toEqual(['']);
        });

        it('should handle malformed section tags', () => {
            const data = '<section>content<section>more</section>';
            const result = parseSections(data);
            
            // Should handle gracefully based on regex matching
            expect(result).toHaveLength(1);
        });

        it('should handle sections with attributes', () => {
            const data = '<section id="test">content</section>';
            const result = parseSections(data);
            
            // Regex doesn't match sections with attributes, so should return empty array
            expect(result).toEqual([]);
        });

        it('should handle very large section content', () => {
            const largeContent = 'x'.repeat(10000);
            const data = `<section>${largeContent}</section>`;
            const result = parseSections(data);
            
            expect(result).toHaveLength(1);
            expect(result[0]).toBe(largeContent);
        });
    });

    describe('wrapHTML - Edge Cases', () => {
        it('should handle content with existing html tags', () => {
            const content = '<html><body>Already wrapped</body></html>';
            const result = wrapHTML(content);
            
            expect(result).toBe('<html><body><html><body>Already wrapped</body></html></body></html>');
        });

        it('should handle content with line breaks', () => {
            const content = 'Line 1\nLine 2\nLine 3';
            const result = wrapHTML(content);
            
            expect(result).toBe('<html><body>Line 1\nLine 2\nLine 3</body></html>');
        });

        it('should handle content with unicode characters', () => {
            const content = '<p>Unicode: 🦊 框架 العربية</p>';
            const result = wrapHTML(content);
            
            expect(result).toBe('<html><body><p>Unicode: 🦊 框架 العربية</p></body></html>');
        });
    });
});
