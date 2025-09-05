// tsfox/cli/ai/generate.ts

import { Command } from 'commander';
import { CodeGeneratorAgent } from '../../ai/agents/code-generator.agent';
import { 
    ControllerSpec, 
    MiddlewareSpec, 
    RouteSpec, 
    ModelSpec,
    AIAgentConfig 
} from '../../ai/interfaces/ai-agent.interface';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';

export interface AIGenerateOptions {
    name: string;
    type: 'controller' | 'middleware' | 'route' | 'model' | 'service';
    output?: string;
    config?: string;
    interactive?: boolean;
}

/**
 * AI Generate Command
 * Generates code using AI capabilities
 */
export class AIGenerateCommand {
    private agent: CodeGeneratorAgent;
    private config: AIAgentConfig;

    constructor() {
        this.config = this.getDefaultConfig(); // Initialize first
        this.loadConfig(); // Then load from file if exists
        this.agent = new CodeGeneratorAgent(this.config);
    }

    private loadConfig(): void {
        const configPath = path.join(process.cwd(), 'fox-ai.config.json');
        
        if (fs.existsSync(configPath)) {
            try {
                this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch (error) {
                console.warn('Invalid AI config file, using defaults');
                this.config = this.getDefaultConfig();
            }
        } else {
            this.config = this.getDefaultConfig();
        }
    }

    private getDefaultConfig(): AIAgentConfig {
        return {
            provider: 'openai',
            model: 'gpt-4',
            temperature: 0.2,
            maxTokens: 2000,
            apiKey: process.env.OPENAI_API_KEY || ''
        };
    }

    async execute(options: AIGenerateOptions): Promise<void> {
        console.log('🧠 Fox AI Code Generator');
        console.log('========================');

        // Initialize AI agent
        await this.initializeAgent();

        // Generate code based on type
        switch (options.type) {
            case 'controller':
                await this.generateController(options);
                break;
            case 'middleware':
                await this.generateMiddleware(options);
                break;
            case 'route':
                await this.generateRoute(options);
                break;
            case 'model':
                await this.generateModel(options);
                break;
            case 'service':
                await this.generateService(options);
                break;
            default:
                console.error(`Unsupported type: ${options.type}`);
                process.exit(1);
        }
    }

    private async initializeAgent(): Promise<void> {
        try {
            await this.agent.configure(this.config);
            console.log('✅ AI Agent initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize AI agent:', (error as Error).message);
            console.log('💡 Using mock responses for demonstration');
        }
    }

    private async generateController(options: AIGenerateOptions): Promise<void> {
        console.log(`\n🎯 Generating controller: ${options.name}`);

        let spec: ControllerSpec;

        if (options.interactive) {
            spec = await this.promptControllerSpec(options.name);
        } else {
            spec = this.getDefaultControllerSpec(options.name);
        }

        try {
            const generated = await this.agent.generateController(spec);
            
            console.log(`✨ Generated code with ${generated.confidence}% confidence`);
            
            await this.saveGeneratedCode(
                generated,
                options.output || `src/controllers/${options.name.toLowerCase()}.controller.ts`
            );

            // Also save tests
            if (generated.tests) {
                await this.saveFile(
                    generated.tests,
                    `src/controllers/__tests__/${options.name.toLowerCase()}.controller.test.ts`
                );
            }

            console.log('✅ Controller generated successfully!');
            this.printGenerationSummary(generated);

        } catch (error) {
            console.error('❌ Failed to generate controller:', (error as Error).message);
        }
    }

    private async generateMiddleware(options: AIGenerateOptions): Promise<void> {
        console.log(`\n🎯 Generating middleware: ${options.name}`);

        let spec: MiddlewareSpec;

        if (options.interactive) {
            spec = await this.promptMiddlewareSpec(options.name);
        } else {
            spec = this.getDefaultMiddlewareSpec(options.name);
        }

        try {
            const generated = await this.agent.generateMiddleware(spec);
            
            console.log(`✨ Generated code with ${generated.confidence}% confidence`);
            
            await this.saveGeneratedCode(
                generated,
                options.output || `src/middleware/${options.name.toLowerCase()}.middleware.ts`
            );

            if (generated.tests) {
                await this.saveFile(
                    generated.tests,
                    `src/middleware/__tests__/${options.name.toLowerCase()}.middleware.test.ts`
                );
            }

            console.log('✅ Middleware generated successfully!');
            this.printGenerationSummary(generated);

        } catch (error) {
            console.error('❌ Failed to generate middleware:', (error as Error).message);
        }
    }

    private async generateRoute(options: AIGenerateOptions): Promise<void> {
        console.log(`\n🎯 Generating route: ${options.name}`);

        let spec: RouteSpec;

        if (options.interactive) {
            spec = await this.promptRouteSpec(options.name);
        } else {
            spec = this.getDefaultRouteSpec(options.name);
        }

        try {
            const generated = await this.agent.generateRoute(spec);
            
            console.log(`✨ Generated code with ${generated.confidence}% confidence`);
            
            await this.saveGeneratedCode(
                generated,
                options.output || `src/routes/${options.name.toLowerCase()}.routes.ts`
            );

            if (generated.tests) {
                await this.saveFile(
                    generated.tests,
                    `src/routes/__tests__/${options.name.toLowerCase()}.routes.test.ts`
                );
            }

            console.log('✅ Route generated successfully!');
            this.printGenerationSummary(generated);

        } catch (error) {
            console.error('❌ Failed to generate route:', (error as Error).message);
        }
    }

    private async generateModel(options: AIGenerateOptions): Promise<void> {
        console.log(`\n🎯 Generating model: ${options.name}`);

        let spec: ModelSpec;

        if (options.interactive) {
            spec = await this.promptModelSpec(options.name);
        } else {
            spec = this.getDefaultModelSpec(options.name);
        }

        try {
            const generated = await this.agent.generateModel(spec);
            
            console.log(`✨ Generated code with ${generated.confidence}% confidence`);
            
            await this.saveGeneratedCode(
                generated,
                options.output || `src/models/${options.name.toLowerCase()}.model.ts`
            );

            if (generated.tests) {
                await this.saveFile(
                    generated.tests,
                    `src/models/__tests__/${options.name.toLowerCase()}.model.test.ts`
                );
            }

            console.log('✅ Model generated successfully!');
            this.printGenerationSummary(generated);

        } catch (error) {
            console.error('❌ Failed to generate model:', (error as Error).message);
        }
    }

    private async generateService(options: AIGenerateOptions): Promise<void> {
        console.log(`\n🎯 Generating service: ${options.name}`);
        
        // This would be implemented similar to other generators
        console.log('🚧 Service generation coming soon!');
    }

    // Interactive prompts
    private async promptControllerSpec(name: string): Promise<ControllerSpec> {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'model',
                message: 'Associated model (optional):',
                default: name
            },
            {
                type: 'checkbox',
                name: 'actions',
                message: 'Select actions to generate:',
                choices: [
                    { name: 'index (GET /)', value: { name: 'index', method: 'GET', path: '/' } },
                    { name: 'show (GET /:id)', value: { name: 'show', method: 'GET', path: '/:id' } },
                    { name: 'store (POST /)', value: { name: 'store', method: 'POST', path: '/' } },
                    { name: 'update (PUT /:id)', value: { name: 'update', method: 'PUT', path: '/:id' } },
                    { name: 'destroy (DELETE /:id)', value: { name: 'destroy', method: 'DELETE', path: '/:id' } }
                ],
                default: [
                    { name: 'index', method: 'GET', path: '/' },
                    { name: 'show', method: 'GET', path: '/:id' }
                ]
            },
            {
                type: 'confirm',
                name: 'authentication',
                message: 'Require authentication?',
                default: false
            },
            {
                type: 'input',
                name: 'middleware',
                message: 'Additional middleware (comma separated):',
                default: ''
            },
            {
                type: 'confirm',
                name: 'useCustomPrompt',
                message: 'Use custom prompt for code generation?',
                default: false
            }
        ]);

        let customPrompt;
        let codeStyle;

        if (answers.useCustomPrompt) {
            const customAnswers = await this.promptCustomSettings();
            customPrompt = customAnswers.customPrompt;
            codeStyle = customAnswers.codeStyle;
        }

        return {
            name,
            model: answers.model,
            actions: answers.actions,
            authentication: answers.authentication,
            middleware: answers.middleware ? answers.middleware.split(',').map((m: string) => m.trim()) : [],
            customPrompt,
            codeStyle
        };
    }

    private async promptCustomSettings() {
        const answers = await inquirer.prompt([
            {
                type: 'editor',
                name: 'customPrompt',
                message: 'Enter your custom prompt (this will open your default editor):',
                default: ''
            },
            {
                type: 'confirm',
                name: 'useCodeStyle',
                message: 'Configure code style preferences?',
                default: false
            }
        ]);

        let codeStyle;
        if (answers.useCodeStyle) {
            const styleAnswers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'indentation',
                    message: 'Indentation type:',
                    choices: ['spaces', 'tabs'],
                    default: 'spaces'
                },
                {
                    type: 'number',
                    name: 'indentSize',
                    message: 'Indentation size:',
                    default: 2
                },
                {
                    type: 'list',
                    name: 'quotes',
                    message: 'Quote style:',
                    choices: ['single', 'double'],
                    default: 'single'
                },
                {
                    type: 'confirm',
                    name: 'semicolons',
                    message: 'Use semicolons?',
                    default: true
                },
                {
                    type: 'list',
                    name: 'classNaming',
                    message: 'Class naming convention:',
                    choices: ['PascalCase', 'camelCase'],
                    default: 'PascalCase'
                },
                {
                    type: 'list',
                    name: 'methodNaming',
                    message: 'Method naming convention:',
                    choices: ['camelCase', 'snake_case'],
                    default: 'camelCase'
                }
            ]);

            codeStyle = {
                indentation: styleAnswers.indentation,
                indentSize: styleAnswers.indentSize,
                quotes: styleAnswers.quotes,
                semicolons: styleAnswers.semicolons,
                naming: {
                    classes: styleAnswers.classNaming,
                    methods: styleAnswers.methodNaming
                }
            };
        }

        return {
            customPrompt: answers.customPrompt,
            codeStyle
        };
    }

    private async promptMiddlewareSpec(name: string): Promise<MiddlewareSpec> {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'purpose',
                message: 'Purpose of this middleware:',
                default: `${name} middleware`
            },
            {
                type: 'list',
                name: 'type',
                message: 'Middleware type:',
                choices: ['authentication', 'validation', 'logging', 'cors', 'rate-limiting', 'custom'],
                default: 'custom'
            },
            {
                type: 'number',
                name: 'order',
                message: 'Execution order:',
                default: 100
            },
            {
                type: 'confirm',
                name: 'routeSpecific',
                message: 'Route-specific middleware?',
                default: false
            },
            {
                type: 'confirm',
                name: 'useCustomPrompt',
                message: 'Use custom prompt for code generation?',
                default: false
            }
        ]);

        let customPrompt;
        let codeStyle;

        if (answers.useCustomPrompt) {
            const customAnswers = await this.promptCustomSettings();
            customPrompt = customAnswers.customPrompt;
            codeStyle = customAnswers.codeStyle;
        }

        return {
            name,
            purpose: answers.purpose,
            beforeRoute: answers.type !== 'afterRoute',
            afterRoute: answers.type === 'afterRoute',
            configuration: { type: answers.type, order: answers.order },
            customPrompt,
            codeStyle
        };
    }

    private async promptRouteSpec(name: string): Promise<RouteSpec> {
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'method',
                message: 'HTTP Method:',
                choices: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                default: 'GET'
            },
            {
                type: 'input',
                name: 'path',
                message: 'Route path:',
                default: `/${name.toLowerCase()}`
            },
            {
                type: 'input',
                name: 'controller',
                message: 'Controller name:',
                default: `${name}Controller`
            },
            {
                type: 'input',
                name: 'action',
                message: 'Action method:',
                default: 'index'
            },
            {
                type: 'confirm',
                name: 'authentication',
                message: 'Require authentication?',
                default: false
            },
            {
                type: 'confirm',
                name: 'useCustomPrompt',
                message: 'Use custom prompt for code generation?',
                default: false
            }
        ]);

        let customPrompt;
        let codeStyle;

        if (answers.useCustomPrompt) {
            const customAnswers = await this.promptCustomSettings();
            customPrompt = customAnswers.customPrompt;
            codeStyle = customAnswers.codeStyle;
        }

        return {
            method: answers.method,
            path: answers.path,
            controller: answers.controller,
            action: answers.action,
            authentication: answers.authentication,
            customPrompt,
            codeStyle
        };
    }

    private async promptModelSpec(name: string): Promise<ModelSpec> {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'properties',
                message: 'Properties (name:type, comma separated):',
                default: 'name:string,email:string,createdAt:Date'
            },
            {
                type: 'confirm',
                name: 'hasValidation',
                message: 'Add validation rules?',
                default: true
            },
            {
                type: 'confirm',
                name: 'useCustomPrompt',
                message: 'Use custom prompt for code generation?',
                default: false
            }
        ]);

        // Parse properties
        const properties = answers.properties.split(',').map((prop: string) => {
            const [name, type] = prop.trim().split(':');
            return {
                name: name.trim(),
                type: type.trim(),
                required: true
            };
        });

        let customPrompt;
        let codeStyle;

        if (answers.useCustomPrompt) {
            const customAnswers = await this.promptCustomSettings();
            customPrompt = customAnswers.customPrompt;
            codeStyle = customAnswers.codeStyle;
        }

        return {
            name,
            properties,
            validation: answers.hasValidation ? [] : undefined,
            customPrompt,
            codeStyle
        };
    }

    // Default specs for non-interactive mode
    private getDefaultControllerSpec(name: string): ControllerSpec {
        return {
            name,
            actions: [
                { name: 'index', method: 'GET', path: '/' },
                { name: 'show', method: 'GET', path: '/:id' },
                { name: 'store', method: 'POST', path: '/' },
                { name: 'update', method: 'PUT', path: '/:id' },
                { name: 'destroy', method: 'DELETE', path: '/:id' }
            ]
        };
    }

    private getDefaultMiddlewareSpec(name: string): MiddlewareSpec {
        return {
            name,
            purpose: `${name} middleware`,
            beforeRoute: true
        };
    }

    private getDefaultRouteSpec(name: string): RouteSpec {
        return {
            method: 'GET',
            path: `/${name.toLowerCase()}`,
            controller: `${name}Controller`,
            action: 'index'
        };
    }

    private getDefaultModelSpec(name: string): ModelSpec {
        return {
            name,
            properties: [
                { name: 'id', type: 'string', required: false },
                { name: 'createdAt', type: 'Date', required: false },
                { name: 'updatedAt', type: 'Date', required: false }
            ]
        };
    }

    // File operations
    private async saveGeneratedCode(generated: any, filePath: string): Promise<void> {
        await this.saveFile(generated.code, filePath);
        
        if (generated.documentation) {
            const docPath = filePath.replace(/\.ts$/, '.md');
            await this.saveFile(generated.documentation, docPath);
        }
    }

    private async saveFile(content: string, filePath: string): Promise<void> {
        const fullPath = path.resolve(filePath);
        const dir = path.dirname(fullPath);

        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`📝 Saved: ${filePath}`);
    }

    private printGenerationSummary(generated: any): void {
        console.log('\n📊 Generation Summary:');
        console.log(`   Type: ${generated.type}`);
        console.log(`   Confidence: ${generated.confidence}%`);
        console.log(`   Dependencies: ${generated.dependencies?.length || 0}`);
        console.log(`   Lines of code: ${generated.code.split('\n').length}`);
        
        if (generated.dependencies && generated.dependencies.length > 0) {
            console.log(`   📦 Dependencies: ${generated.dependencies.join(', ')}`);
        }
    }
}

// Register CLI command
export function registerAIGenerateCommand(program: Command): void {
    const generateCmd = program
        .command('ai:generate <type> <name>')
        .description('Generate code using AI capabilities')
        .option('-o, --output <path>', 'Output file path')
        .option('-c, --config <path>', 'AI configuration file')
        .option('-i, --interactive', 'Interactive mode with prompts')
        .action(async (type: string, name: string, options) => {
            const generator = new AIGenerateCommand();
            await generator.execute({
                type: type as any,
                name,
                ...options
            });
        });

    // Add subcommands for specific types
    generateCmd
        .command('controller <name>')
        .description('Generate AI-powered controller')
        .option('-i, --interactive', 'Interactive mode')
        .action(async (name: string, options) => {
            const generator = new AIGenerateCommand();
            await generator.execute({
                type: 'controller',
                name,
                ...options
            });
        });

    generateCmd
        .command('middleware <name>')
        .description('Generate AI-powered middleware')
        .option('-i, --interactive', 'Interactive mode')
        .action(async (name: string, options) => {
            const generator = new AIGenerateCommand();
            await generator.execute({
                type: 'middleware',
                name,
                ...options
            });
        });
}
