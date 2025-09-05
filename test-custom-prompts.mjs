#!/usr/bin/env node

// Simple test script for custom prompts
import { CodeGeneratorAgent } from '../ai/agents/code-generator.agent.js';

const config = {
    provider: 'openai',
    apiKey: 'test-key',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000
};

async function testCustomPrompts() {
    const agent = new CodeGeneratorAgent(config);
    
    console.log('🚀 Testing Custom Prompts System');
    console.log('=====================================\n');
    
    // Test Controller with custom prompt and style
    const controllerSpec = {
        name: 'UserProfile',
        model: 'User',
        actions: [
            { name: 'index', method: 'GET', path: '/' },
            { name: 'show', method: 'GET', path: '/:id' }
        ],
        authentication: true,
        middleware: ['auth', 'validation'],
        customPrompt: `
Generate a controller following enterprise patterns:
- Use dependency injection with constructor parameters
- Implement comprehensive error handling with custom exceptions
- Add input validation using Zod schemas
- Include structured logging with correlation IDs
- Add OpenAPI/Swagger documentation comments
- Use Result pattern for error handling
- Include unit tests structure comments
        `,
        codeStyle: {
            indentation: 'spaces',
            indentSize: 4,
            quotes: 'single',
            semicolons: true,
            naming: {
                classes: 'PascalCase',
                methods: 'camelCase',
                variables: 'camelCase',
                constants: 'UPPER_SNAKE_CASE'
            },
            patterns: {
                errorHandling: 'result-pattern',
                validation: 'zod',
                logging: 'winston'
            }
        }
    };
    
    try {
        console.log('📝 Generating controller with custom prompt and style...\n');
        const result = await agent.generateController(controllerSpec);
        
        console.log('✅ Generated Controller:');
        console.log('Type:', result.type);
        console.log('Path:', result.path);
        console.log('Language:', result.language);
        console.log('\n📄 Code Preview:');
        console.log('================');
        console.log(result.code.substring(0, 800) + '...\n');
        
        if (result.tests) {
            console.log('🧪 Tests included:', result.tests.length > 0 ? 'Yes' : 'No');
        }
        
        if (result.documentation) {
            console.log('📚 Documentation included:', result.documentation.length > 0 ? 'Yes' : 'No');
        }
        
    } catch (error) {
        console.error('❌ Error generating controller:', error.message);
    }
}

testCustomPrompts();
