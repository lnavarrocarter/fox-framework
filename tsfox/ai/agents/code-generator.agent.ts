// tsfox/ai/agents/code-generator.agent.ts

import { 
    AIAgentInterface, 
    AIAgentConfig, 
    GeneratedCode, 
    ControllerSpec, 
    MiddlewareSpec, 
    RouteSpec, 
    ModelSpec,
    CodeAnalysisContext,
    CodeAnalysis,
    PatternReport,
    OptimizationSuggestion,
    ArchitectureAnalysis,
    EvolutionPlan,
    BugReport,
    FixedCode,
    UserFeedback,
    LearningData,
    CodeStyleRules
} from '../interfaces/ai-agent.interface';
import { OpenAIProvider } from '../providers/openai.provider';
import { formatClassName, formatFileName } from '../../cli/generators';

export class CodeGeneratorAgent implements AIAgentInterface {
    private provider: OpenAIProvider;
    private config: AIAgentConfig;

    constructor(config: AIAgentConfig) {
        this.config = config;
        this.provider = new OpenAIProvider(config);
    }

    async configure(config: AIAgentConfig): Promise<void> {
        if (config.provider && config.provider !== 'openai') {
            throw new Error(`Unsupported AI provider: ${config.provider}`);
        }
        if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 1)) {
            throw new Error('Temperature must be between 0 and 1');
        }
        if (config.maxTokens !== undefined && config.maxTokens <= 0) {
            throw new Error('maxTokens must be greater than 0');
        }
        if (config.model !== undefined && config.model.trim() === '') {
            throw new Error('Model name cannot be empty');
        }
        this.config = { ...this.config, ...config };
        this.provider = new OpenAIProvider(this.config);
        await this.provider.initialize();
    }

    isConfigured(): boolean {
        return this.provider.isReady();
    }

    async generateController(spec: ControllerSpec): Promise<GeneratedCode> {
        const className = formatClassName(spec.name);
        
        const basePrompt = `
Generate a Fox Framework controller with the following specifications:

Name: ${className}Controller
Model: ${spec.model || 'Generic'}
Actions: ${JSON.stringify(spec.actions, null, 2)}
Middleware: ${spec.middleware?.join(', ') || 'None'}
Authentication: ${spec.authentication ? 'Required' : 'Not required'}
Authorization: ${spec.authorization?.join(', ') || 'None'}

Requirements:
1. Import proper Fox Framework types from 'tsfox/core/types'
2. Use Express Request and Response types
3. Implement all specified actions
4. Add proper error handling with try-catch
5. Include input validation
6. Add JSDoc documentation for all methods
7. Use async/await for database operations
8. Return proper HTTP status codes
9. Include TypeScript interfaces for request/response types
10. Follow RESTful conventions

Generate the complete controller file with imports, class definition, and all methods.
`;

        let prompt = basePrompt;

        // Add custom prompt if provided
        if (spec.customPrompt) {
            prompt += `\n\nADDITIONAL REQUIREMENTS:\n${spec.customPrompt}`;
        }

        // Add code style rules if provided
        if (spec.codeStyle) {
            prompt += `\n\nCODE STYLE REQUIREMENTS:\n${this.buildCodeStylePrompt(spec.codeStyle)}`;
        }

        const systemPrompt = this.buildSystemPrompt('controller');
        return await this.provider.generateCode(systemPrompt, prompt);
    }

    async generateMiddleware(spec: MiddlewareSpec): Promise<GeneratedCode> {
        const middlewareName = formatClassName(spec.name);
        
        const basePrompt = `
Generate a Fox Framework middleware with the following specifications:

Name: ${middlewareName}Middleware
Purpose: ${spec.purpose}
Before Route: ${spec.beforeRoute}
After Route: ${spec.afterRoute}
Dependencies: ${spec.dependencies?.join(', ') || 'None'}
Configuration: ${JSON.stringify(spec.configuration, null, 2)}

Requirements:
1. Use proper Express middleware signature (req, res, next)
2. Include TypeScript interfaces for configuration
3. Support both sync and async operations
4. Add proper error handling
5. Include logging where appropriate
6. Add JSDoc documentation
7. Support middleware chaining
8. Include configuration validation
9. Handle edge cases gracefully
10. Follow Fox middleware patterns

Generate the complete middleware file with exports and configuration interface.
`;

        let prompt = basePrompt;

        // Add custom prompt if provided
        if (spec.customPrompt) {
            prompt += `

ADDITIONAL REQUIREMENTS:
${spec.customPrompt}`;
        }

        // Add code style rules if provided
        if (spec.codeStyle) {
            prompt += `

CODE STYLE REQUIREMENTS:
${this.buildCodeStylePrompt(spec.codeStyle)}`;
        }

        const systemPrompt = this.buildSystemPrompt('middleware');
        return await this.provider.generateCode(systemPrompt, prompt);
    }

    async generateRoute(spec: RouteSpec): Promise<GeneratedCode> {
        const basePrompt = `
Generate a Fox Framework route with the following specifications:

Path: ${spec.path}
Method: ${spec.method}
Controller: ${spec.controller}
Action: ${spec.action}
Middleware: ${spec.middleware?.join(', ') || 'None'}
Authentication: ${spec.authentication ? 'Required' : 'Not required'}
Rate Limiting: ${spec.rateLimit ? `${spec.rateLimit.maxRequests} requests per ${spec.rateLimit.windowMs}ms` : 'Disabled'}

Requirements:
1. Use RequestMethod enum from tsfox/core/enums
2. Import proper Fox Framework types
3. Implement proper route structure
4. Include middleware integration
5. Support parameter validation
6. Add proper error handling
7. Include JSDoc documentation
8. Follow Fox routing conventions
9. Support async route handlers
10. Include proper TypeScript types for request/response

Generate the complete route file with imports, route definition, and proper configuration.
`;

        let prompt = basePrompt;

        // Add custom prompt if provided
        if (spec.customPrompt) {
            prompt += `\n\nADDITIONAL REQUIREMENTS:\n${spec.customPrompt}`;
        }

        // Add code style rules if provided
        if (spec.codeStyle) {
            prompt += `\n\nCODE STYLE REQUIREMENTS:\n${this.buildCodeStylePrompt(spec.codeStyle)}`;
        }

        const systemPrompt = this.buildSystemPrompt('route');
        return await this.provider.generateCode(systemPrompt, prompt);
    }

    async generateModel(spec: ModelSpec): Promise<GeneratedCode> {
        const className = formatClassName(spec.name);
        
        const basePrompt = `
Generate a Fox Framework model with the following specifications:

Name: ${className}
Properties: ${JSON.stringify(spec.properties, null, 2)}
Relationships: ${spec.relationships ? JSON.stringify(spec.relationships, null, 2) : 'None'}
Validation: ${spec.validation ? JSON.stringify(spec.validation, null, 2) : 'None'}
Hooks: ${spec.hooks ? JSON.stringify(spec.hooks, null, 2) : 'None'}

Requirements:
1. Define proper TypeScript interfaces
2. Include validation interfaces and methods
3. Support relationship definitions
4. Add serialization methods (toJSON, fromJSON)
5. Include proper error handling
6. Add JSDoc documentation
7. Support model lifecycle hooks
8. Include static factory methods
9. Add proper typing for all properties
10. Follow Fox Framework data patterns

Generate the complete model file with interface definitions and implementation.
`;

        let prompt = basePrompt;

        // Add custom prompt if provided
        if (spec.customPrompt) {
            prompt += `\n\nADDITIONAL REQUIREMENTS:\n${spec.customPrompt}`;
        }

        // Add code style rules if provided
        if (spec.codeStyle) {
            prompt += `\n\nCODE STYLE REQUIREMENTS:\n${this.buildCodeStylePrompt(spec.codeStyle)}`;
        }

        const systemPrompt = this.buildSystemPrompt('model');
        return await this.provider.generateCode(systemPrompt, prompt);
    }

    async generateService(spec: any): Promise<GeneratedCode> {
        const className = formatClassName(spec.name);
        
        const prompt = `
Generate a Fox Framework service with the following specifications:

Name: ${className}Service
Dependencies: ${spec.dependencies?.join(', ') || 'None'}
Methods: ${JSON.stringify(spec.methods, null, 2)}

Requirements:
1. Implement service interface
2. Use dependency injection
3. Include proper error handling
4. Support async operations
5. Add proper logging
6. Include TypeScript interfaces
7. Add JSDoc documentation
8. Support service lifecycle
9. Include unit test helpers
10. Follow Fox service patterns

Generate the complete service file with implementation.
`;

        const systemPrompt = this.buildSystemPrompt('service');
        return await this.provider.generateCode(systemPrompt, prompt);
    }

    private buildSystemPrompt(type: GeneratedCode['type']): string {
        const basePrompt = `
You are an expert TypeScript developer working with the Fox Framework.

Fox Framework characteristics:
- Uses Factory pattern for server instantiation
- Implements Interface Segregation and Dependency Injection
- Uses Express.js as underlying HTTP server
- Follows TypeScript best practices
- Implements modular routing system
- Has built-in template engine
- Supports middleware pipeline
- Uses enums for request methods and configuration

Current project structure:
- Controllers in src/controllers/
- Routes in src/routes/
- Services in src/services/
- Models with interfaces in tsfox/core/types.ts
- Features in tsfox/core/features/

Generate high-quality, production-ready TypeScript code that follows Fox Framework patterns.
`;

        const typeSpecificPrompts = {
            controller: `
Generate a Fox Framework controller following these patterns:
- Use proper TypeScript interfaces
- Implement request/response handling
- Include proper error handling
- Add input validation
- Follow RESTful conventions
- Include JSDoc documentation
`,
            middleware: `
Generate Fox Framework middleware following these patterns:
- Use Express middleware signature (req, res, next)
- Include proper error handling
- Support both sync and async operations
- Include configuration interface
- Add proper TypeScript typing
`,
            route: `
Generate Fox Framework routes following these patterns:
- Use RequestMethod enum from core/enums
- Implement proper route structure
- Include middleware integration
- Support parameter validation
- Follow Fox routing conventions
`,
            service: `
Generate Fox Framework service following these patterns:
- Implement service interface
- Use dependency injection
- Include proper error handling
- Support async operations
- Add proper logging
`,
            model: `
Generate Fox Framework model following these patterns:
- Define proper TypeScript interfaces
- Include validation rules
- Support relationships
- Add serialization methods
- Follow Fox data patterns
`
        };

        return basePrompt + typeSpecificPrompts[type];
    }

    /**
     * Build code style prompt from CodeStyleRules
     */
    private buildCodeStylePrompt(codeStyle: CodeStyleRules): string {
        let stylePrompt = '';

        if (codeStyle.indentation) {
            const indentType = codeStyle.indentation;
            const indentSize = codeStyle.indentSize || (indentType === 'spaces' ? 2 : 1);
            stylePrompt += `\n- Use ${indentType} indentation with ${indentSize} ${indentType === 'spaces' ? 'spaces' : 'tab width'}`;
        }

        if (codeStyle.semicolons !== undefined) {
            stylePrompt += `\n- Semicolons: ${codeStyle.semicolons ? 'required' : 'not required'}`;
        }

        if (codeStyle.quotes) {
            stylePrompt += `\n- Use ${codeStyle.quotes} quotes`;
        }

        if (codeStyle.trailingCommas !== undefined) {
            stylePrompt += `\n- Trailing commas: ${codeStyle.trailingCommas ? 'include' : 'exclude'}`;
        }

        if (codeStyle.naming) {
            if (codeStyle.naming.classes) {
                stylePrompt += `\n- Class naming: ${codeStyle.naming.classes}`;
            }
            if (codeStyle.naming.methods) {
                stylePrompt += `\n- Method naming: ${codeStyle.naming.methods}`;
            }
            if (codeStyle.naming.variables) {
                stylePrompt += `\n- Variable naming: ${codeStyle.naming.variables}`;
            }
            if (codeStyle.naming.constants) {
                stylePrompt += `\n- Constant naming: ${codeStyle.naming.constants}`;
            }
            if (codeStyle.naming.files) {
                stylePrompt += `\n- File naming: ${codeStyle.naming.files}`;
            }
        }

        if (codeStyle.patterns) {
            if (codeStyle.patterns.errorHandling) {
                stylePrompt += `\n- Error handling pattern: ${codeStyle.patterns.errorHandling}`;
            }
            if (codeStyle.patterns.validation) {
                stylePrompt += `\n- Validation pattern: ${codeStyle.patterns.validation}`;
            }
            if (codeStyle.patterns.logging) {
                stylePrompt += `\n- Logging pattern: ${codeStyle.patterns.logging}`;
            }
            if (codeStyle.patterns.database) {
                stylePrompt += `\n- Database pattern: ${codeStyle.patterns.database}`;
            }
        }

        return stylePrompt;
    }

    // Placeholder implementations for analysis and learning methods
    async analyzeCode(context: CodeAnalysisContext): Promise<CodeAnalysis> {
        // Mock implementation for demonstration
        return {
            complexity: 75,
            maintainability: 80,
            performance: 85,
            security: 90,
            issues: [
                {
                    type: 'warning',
                    message: 'Consider adding input validation',
                    file: 'controller.ts',
                    line: 10,
                    column: 5,
                    severity: 'medium'
                }
            ],
            suggestions: [
                'Add comprehensive input validation',
                'Implement error boundaries',
                'Add performance monitoring'
            ]
        };
    }

    async detectPatterns(codebase: string[]): Promise<PatternReport> {
        // Mock implementation
        return {
            patterns: [
                {
                    name: 'Factory Pattern',
                    type: 'creational',
                    frequency: 85,
                    impact: 'positive',
                    description: 'Well implemented factory pattern for server creation'
                }
            ],
            antiPatterns: [
                {
                    name: 'God Object',
                    type: 'structural',
                    frequency: 15,
                    impact: 'negative',
                    description: 'Some classes have too many responsibilities'
                }
            ],
            recommendations: [
                'Continue using factory pattern',
                'Split large classes into smaller ones',
                'Implement dependency injection consistently'
            ]
        };
    }

    async suggestOptimizations(analysis: CodeAnalysis): Promise<OptimizationSuggestion[]> {
        return [
            {
                type: 'performance',
                priority: 'high',
                description: 'Implement caching for frequently accessed data',
                implementation: 'Add Redis caching layer',
                impact: 40
            },
            {
                type: 'security',
                priority: 'medium',
                description: 'Add rate limiting to API endpoints',
                implementation: 'Implement express-rate-limit middleware',
                impact: 30
            }
        ];
    }

    async analyzeArchitecture(projectPath: string): Promise<ArchitectureAnalysis> {
        return {
            structure: {
                modules: [
                    {
                        name: 'Core',
                        type: 'library',
                        size: 50,
                        complexity: 30,
                        dependencies: []
                    }
                ],
                dependencies: [],
                layers: [
                    {
                        name: 'Presentation',
                        modules: ['controllers', 'routes'],
                        level: 1
                    }
                ]
            },
            patterns: ['Factory', 'Dependency Injection'],
            complexity: 60,
            maintainability: 75,
            scalability: 80,
            recommendations: [
                'Consider implementing microservices for scaling',
                'Add more comprehensive testing',
                'Implement API versioning'
            ]
        };
    }

    async suggestArchitectureEvolution(current: ArchitectureAnalysis): Promise<EvolutionPlan> {
        return {
            currentState: 'Monolithic application with good separation of concerns',
            targetState: 'Modular microservices architecture',
            steps: [
                {
                    id: 'step1',
                    title: 'Extract services',
                    description: 'Extract business logic into separate services',
                    type: 'refactor',
                    effort: 40,
                    impact: 60,
                    dependencies: []
                }
            ],
            timeline: '3-6 months',
            risks: [
                'Complexity increase during transition',
                'Potential performance impact'
            ]
        };
    }

    async detectBugs(codebase: string[]): Promise<BugReport> {
        return {
            bugs: [
                {
                    id: 'bug1',
                    type: 'null-pointer',
                    message: 'Potential null pointer exception',
                    file: 'controller.ts',
                    line: 25,
                    severity: 'medium',
                    fixable: true,
                    suggestion: 'Add null check before accessing property'
                }
            ],
            severity: 'medium',
            totalCount: 1,
            fixable: 1
        };
    }

    async fixBugs(bugs: BugReport): Promise<FixedCode> {
        return {
            fixes: [
                {
                    bugId: 'bug1',
                    status: 'success',
                    originalCode: 'user.name.toLowerCase()',
                    fixedCode: 'user?.name?.toLowerCase() ?? ""',
                    explanation: 'Added null safety checks'
                }
            ],
            success: 1,
            failed: 0,
            warnings: []
        };
    }

    async learnFromFeedback(feedback: UserFeedback): Promise<void> {
        // Implementation would store feedback for model improvement
        console.log('Learning from feedback:', feedback);
    }

    async updateModel(learningData: LearningData): Promise<void> {
        // Implementation would update the AI model
        console.log('Updating model with learning data');
    }
}
