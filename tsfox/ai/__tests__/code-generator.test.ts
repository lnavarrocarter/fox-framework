// tsfox/ai/__tests__/code-generator.test.ts

import { CodeGeneratorAgent } from '../agents/code-generator.agent';
import { AIAgentConfig, ControllerSpec } from '../interfaces/ai-agent.interface';

describe('CodeGeneratorAgent', () => {
    let agent: CodeGeneratorAgent;
    let config: AIAgentConfig;

    beforeEach(async () => {
        config = {
            provider: 'openai',
            model: 'gpt-4',
            temperature: 0.2,
            maxTokens: 2000,
            apiKey: 'test-key'
        };
        
        agent = new CodeGeneratorAgent(config);
        await agent.configure(config);
    });

    describe('generateController', () => {
        it('should generate a controller with CRUD operations', async () => {
            const spec: ControllerSpec = {
                name: 'User',
                model: 'User',
                actions: [
                    { name: 'index', method: 'GET', path: '/' },
                    { name: 'show', method: 'GET', path: '/:id' },
                    { name: 'store', method: 'POST', path: '/' },
                    { name: 'update', method: 'PUT', path: '/:id' },
                    { name: 'destroy', method: 'DELETE', path: '/:id' }
                ],
                authentication: true,
                middleware: ['cors', 'validation']
            };

            const result = await agent.generateController(spec);

            expect(result).toBeDefined();
            expect(result.type).toBe('controller');
            expect(result.code).toContain('UserController');
            expect(result.code).toContain('index');
            expect(result.code).toContain('show');
            expect(result.code).toContain('store');
            expect(result.code).toContain('update');
            expect(result.code).toContain('destroy');
            expect(result.confidence).toBeGreaterThan(80);
            expect(result.dependencies).toContain('express');
            expect(result.tests).toBeDefined();
            expect(result.documentation).toBeDefined();
        });

        it('should generate minimal controller when no actions specified', async () => {
            const spec: ControllerSpec = {
                name: 'Simple',
                actions: []
            };

            const result = await agent.generateController(spec);

            expect(result).toBeDefined();
            expect(result.type).toBe('controller');
            expect(result.code).toContain('SimpleController');
        });
    });

    describe('generateMiddleware', () => {
        it('should generate middleware with configuration', async () => {
            const spec = {
                name: 'Auth',
                purpose: 'JWT Authentication middleware',
                beforeRoute: true,
                afterRoute: false
            };

            const result = await agent.generateMiddleware(spec);

            expect(result).toBeDefined();
            expect(result.type).toBe('middleware');
            expect(result.code).toContain('AuthMiddleware');
            expect(result.code).toContain('handle');
            expect(result.code).toContain('NextFunction');
            expect(result.confidence).toBeGreaterThan(80);
        });
    });

    describe('generateRoute', () => {
        it('should generate route configuration', async () => {
            const spec = {
                method: 'GET',
                path: '/users',
                controller: 'UserController',
                action: 'index'
            };

            const result = await agent.generateRoute(spec);

            expect(result).toBeDefined();
            expect(result.type).toBe('route');
            expect(result.code).toContain('RequestMethod.GET');
            expect(result.code).toContain('/users');
            expect(result.code).toContain('UserController');
        });
    });

    describe('generateModel', () => {
        it('should generate model with properties', async () => {
            const spec = {
                name: 'User',
                properties: [
                    { name: 'id', type: 'string', required: false },
                    { name: 'name', type: 'string', required: true },
                    { name: 'email', type: 'string', required: true },
                    { name: 'age', type: 'number', required: false }
                ]
            };

            const result = await agent.generateModel(spec);

            expect(result).toBeDefined();
            expect(result.type).toBe('model');
            expect(result.code).toContain('IUser');
            expect(result.code).toContain('class User');
            expect(result.code).toContain('name');
            expect(result.code).toContain('email');
            expect(result.code).toContain('toJSON');
            expect(result.code).toContain('fromJSON');
        });
    });

    describe('analyzeCode', () => {
        it('should return code analysis', async () => {
            const context = {
                projectPath: '/test/project',
                framework: 'fox' as const,
                language: 'typescript' as const,
                dependencies: { express: '4.18.0' },
                metrics: {
                    linesOfCode: 1000,
                    complexity: 5,
                    testCoverage: 80,
                    dependencies: 10,
                    performance: {
                        responseTime: 100,
                        memoryUsage: 50,
                        cpuUsage: 30,
                        errorRate: 0.1
                    }
                }
            };

            const analysis = await agent.analyzeCode(context);

            expect(analysis).toBeDefined();
            expect(analysis.complexity).toBeDefined();
            expect(analysis.maintainability).toBeDefined();
            expect(analysis.performance).toBeDefined();
            expect(analysis.security).toBeDefined();
            expect(Array.isArray(analysis.issues)).toBe(true);
            expect(Array.isArray(analysis.suggestions)).toBe(true);
        });
    });

    describe('detectPatterns', () => {
        it('should detect code patterns', async () => {
            const codebase = [
                'class UserController { }',
                'class ProductController { }',
                'class OrderController { }'
            ];

            const patterns = await agent.detectPatterns(codebase);

            expect(patterns).toBeDefined();
            expect(Array.isArray(patterns.patterns)).toBe(true);
            expect(Array.isArray(patterns.antiPatterns)).toBe(true);
            expect(Array.isArray(patterns.recommendations)).toBe(true);
        });
    });

    describe('error handling', () => {
        it('should handle configuration errors', async () => {
            const badConfig = {
                provider: 'invalid' as any,
                model: '',
                temperature: -1,
                maxTokens: 0
            };

            await expect(agent.configure(badConfig)).rejects.toThrow();
        });

        it('should handle generation errors gracefully', async () => {
            // Test with invalid spec
            const invalidSpec = {
                name: '',
                actions: []
            };

            // Should not throw but handle gracefully
            const result = await agent.generateController(invalidSpec);
            expect(result).toBeDefined();
        });
    });
});

// Integration tests
describe('CodeGeneratorAgent Integration', () => {
    let agent: CodeGeneratorAgent;

    beforeEach(async () => {
        const config = {
            provider: 'openai' as const,
            model: 'gpt-4',
            temperature: 0.1,
            maxTokens: 1000,
            apiKey: process.env.OPENAI_API_KEY || 'test-key'
        };
        
        agent = new CodeGeneratorAgent(config);
        await agent.configure(config);
    });

    it('should generate a complete user management system', async () => {
        // Generate model
        const modelResult = await agent.generateModel({
            name: 'User',
            properties: [
                { name: 'name', type: 'string', required: true },
                { name: 'email', type: 'string', required: true },
                { name: 'role', type: 'string', required: true }
            ]
        });

        // Generate controller
        const controllerResult = await agent.generateController({
            name: 'User',
            model: 'User',
            actions: [
                { name: 'index', method: 'GET', path: '/' },
                { name: 'store', method: 'POST', path: '/' }
            ],
            authentication: true
        });

        // Generate route
        const routeResult = await agent.generateRoute({
            method: 'GET',
            path: '/users',
            controller: 'UserController',
            action: 'index'
        });

        // Verify all components are generated
        expect(modelResult.code).toContain('User');
        expect(controllerResult.code).toContain('UserController');
        expect(routeResult.code).toContain('/users');

        // Verify consistency
        expect(controllerResult.dependencies).toContain('express');
        expect(routeResult.dependencies).toContain('UserController');
    });

    it('should maintain consistent naming conventions', async () => {
        const testCases = [
            { input: 'user', expected: 'User' },
            { input: 'user-profile', expected: 'UserProfile' },
            { input: 'APIController', expected: 'APIController' },
            { input: 'user_settings', expected: 'UserSettings' }
        ];

        for (const testCase of testCases) {
            const result = await agent.generateController({
                name: testCase.input,
                actions: [{ name: 'index', method: 'GET', path: '/' }]
            });

            expect(result.code).toContain(`${testCase.expected}Controller`);
        }
    });
});
