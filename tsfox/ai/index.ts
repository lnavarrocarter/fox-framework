// tsfox/ai/index.ts

export * from './interfaces/ai-agent.interface';
export * from './agents/code-generator.agent';
export * from './providers/openai.provider';

// Core AI System
export { CodeGeneratorAgent } from './agents/code-generator.agent';

// Main AI Factory
import { CodeGeneratorAgent } from './agents/code-generator.agent';
import { AIAgentConfig } from './interfaces/ai-agent.interface';

export class FoxAI {
    private static instance: FoxAI;
    private codeGenerator: CodeGeneratorAgent;
    private config: AIAgentConfig;

    private constructor(config: AIAgentConfig) {
        this.config = config;
        this.codeGenerator = new CodeGeneratorAgent(config);
    }

    static async create(config: AIAgentConfig): Promise<FoxAI> {
        if (!FoxAI.instance) {
            FoxAI.instance = new FoxAI(config);
            await FoxAI.instance.initialize();
        }
        return FoxAI.instance;
    }

    static getInstance(): FoxAI {
        if (!FoxAI.instance) {
            throw new Error('FoxAI not initialized. Call FoxAI.create() first.');
        }
        return FoxAI.instance;
    }

    private async initialize(): Promise<void> {
        await this.codeGenerator.configure(this.config);
    }

    getCodeGenerator(): CodeGeneratorAgent {
        return this.codeGenerator;
    }

    async updateConfig(config: Partial<AIAgentConfig>): Promise<void> {
        this.config = { ...this.config, ...config };
        await this.codeGenerator.configure(this.config);
    }

    getConfig(): AIAgentConfig {
        return { ...this.config };
    }
}

// Utility functions
export function getDefaultAIConfig(): AIAgentConfig {
    return {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.2,
        maxTokens: 2000,
        apiKey: process.env.OPENAI_API_KEY || ''
    };
}

export default FoxAI;
