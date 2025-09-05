// tsfox/ai/interfaces/ai-agent.interface.ts

export interface AIAgentConfig {
    provider: 'openai' | 'claude' | 'local';
    model: string;
    temperature: number;
    maxTokens: number;
    apiKey?: string;
    endpoint?: string;
    customPrompts?: CustomPromptConfig;
}

export interface CustomPromptConfig {
    systemPromptExtensions?: string[];
    codeStyle?: CodeStyleRules;
    patterns?: string[];
    constraints?: string[];
    examples?: CodeExample[];
}

export interface CodeStyleRules {
    indentation?: 'spaces' | 'tabs';
    indentSize?: number;
    semicolons?: boolean;
    quotes?: 'single' | 'double';
    trailingCommas?: boolean;
    bracketSpacing?: boolean;
    arrowParens?: 'always' | 'avoid';
    naming?: NamingConventions;
    patterns?: ArchitecturalPatterns;
}

export interface NamingConventions {
    classes?: 'PascalCase' | 'camelCase';
    methods?: 'camelCase' | 'snake_case';
    variables?: 'camelCase' | 'snake_case';
    constants?: 'UPPER_SNAKE_CASE' | 'UPPER_CAMEL_CASE';
    files?: 'kebab-case' | 'camelCase' | 'PascalCase';
}

export interface ArchitecturalPatterns {
    errorHandling?: 'try-catch' | 'result-pattern' | 'either';
    validation?: 'joi' | 'zod' | 'class-validator' | 'custom';
    logging?: 'console' | 'winston' | 'pino' | 'custom';
    database?: 'repository' | 'active-record' | 'data-mapper';
}

export interface CodeAnalysisContext {
    projectPath: string;
    framework: 'fox';
    language: 'typescript';
    dependencies: Record<string, string>;
    metrics: CodeMetrics;
}

export interface CodeMetrics {
    linesOfCode: number;
    complexity: number;
    testCoverage: number;
    dependencies: number;
    performance: PerformanceMetrics;
}

export interface PerformanceMetrics {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
}

export interface GeneratedCode {
    code: string;
    type: 'controller' | 'middleware' | 'route' | 'service' | 'model';
    dependencies: string[];
    tests: string;
    documentation: string;
    confidence: number; // 0-100
}

export interface ControllerSpec {
    name: string;
    model?: string;
    actions: ActionSpec[];
    middleware?: string[];
    authentication?: boolean;
    authorization?: string[];
    validation?: ValidationSpec[];
    customPrompt?: string;
    codeStyle?: CodeStyleRules;
}

export interface ActionSpec {
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    description?: string;
    parameters?: ParameterSpec[];
    response?: ResponseSpec;
    middleware?: string[];
}

export interface ParameterSpec {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    validation?: ValidationRule[];
    description?: string;
}

export interface ValidationRule {
    type: 'required' | 'min' | 'max' | 'pattern' | 'email' | 'custom';
    value?: any;
    message?: string;
}

export interface ValidationSpec {
    field: string;
    rules: ValidationRule[];
}

export interface ResponseSpec {
    type: string;
    properties?: Record<string, any>;
    statusCode?: number;
}

export interface MiddlewareSpec {
    name: string;
    purpose: string;
    beforeRoute?: boolean;
    afterRoute?: boolean;
    dependencies?: string[];
    configuration?: Record<string, any>;
    customPrompt?: string;
    codeStyle?: CodeStyleRules;
}

export interface RouteSpec {
    method: string;
    path: string;
    controller: string;
    action: string;
    middleware?: string[];
    authentication?: boolean;
    rateLimit?: RateLimitSpec;
    customPrompt?: string;
    codeStyle?: CodeStyleRules;
}

export interface RateLimitSpec {
    windowMs: number;
    maxRequests: number;
}

export interface ModelSpec {
    name: string;
    properties: PropertySpec[];
    relationships?: RelationshipSpec[];
    validation?: ValidationSpec[];
    hooks?: HookSpec[];
    customPrompt?: string;
    codeStyle?: CodeStyleRules;
}

export interface PropertySpec {
    name: string;
    type: string;
    required: boolean;
    unique?: boolean;
    default?: any;
    validation?: ValidationRule[];
}

export interface RelationshipSpec {
    type: 'oneToOne' | 'oneToMany' | 'manyToMany';
    target: string;
    foreignKey?: string;
}

export interface HookSpec {
    type: 'beforeCreate' | 'afterCreate' | 'beforeUpdate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete';
    handler: string;
}

export interface CodeAnalysis {
    complexity: number;
    maintainability: number;
    performance: number;
    security: number;
    issues: CodeIssue[];
    suggestions: string[];
}

export interface CodeIssue {
    type: 'error' | 'warning' | 'info';
    message: string;
    file: string;
    line: number;
    column: number;
    severity: 'high' | 'medium' | 'low';
}

export interface PatternReport {
    patterns: DetectedPattern[];
    antiPatterns: DetectedPattern[];
    recommendations: string[];
}

export interface DetectedPattern {
    name: string;
    type: string;
    frequency: number;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
}

export interface OptimizationSuggestion {
    type: 'performance' | 'security' | 'maintainability' | 'architecture';
    priority: 'high' | 'medium' | 'low';
    description: string;
    implementation: string;
    impact: number;
}

export interface ArchitectureAnalysis {
    structure: ArchitectureStructure;
    patterns: string[];
    complexity: number;
    maintainability: number;
    scalability: number;
    recommendations: string[];
}

export interface ArchitectureStructure {
    modules: ModuleInfo[];
    dependencies: DependencyInfo[];
    layers: LayerInfo[];
}

export interface ModuleInfo {
    name: string;
    type: string;
    size: number;
    complexity: number;
    dependencies: string[];
}

export interface DependencyInfo {
    from: string;
    to: string;
    type: 'import' | 'extend' | 'implement';
    strength: number;
}

export interface LayerInfo {
    name: string;
    modules: string[];
    level: number;
}

export interface EvolutionPlan {
    currentState: string;
    targetState: string;
    steps: EvolutionStep[];
    timeline: string;
    risks: string[];
}

export interface EvolutionStep {
    id: string;
    title: string;
    description: string;
    type: 'refactor' | 'migrate' | 'upgrade' | 'restructure';
    effort: number;
    impact: number;
    dependencies: string[];
}

export interface BugReport {
    bugs: BugInfo[];
    severity: 'critical' | 'high' | 'medium' | 'low';
    totalCount: number;
    fixable: number;
}

export interface BugInfo {
    id: string;
    type: string;
    message: string;
    file: string;
    line: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    fixable: boolean;
    suggestion?: string;
}

export interface FixedCode {
    fixes: CodeFix[];
    success: number;
    failed: number;
    warnings: string[];
}

export interface CodeFix {
    bugId: string;
    status: 'success' | 'failed' | 'partial';
    originalCode: string;
    fixedCode: string;
    explanation: string;
}

export interface UserFeedback {
    type: 'generation' | 'optimization' | 'analysis';
    rating: number; // 1-5
    comment?: string;
    context: string;
    timestamp: Date;
}

export interface LearningData {
    codeExamples: CodeExample[];
    userFeedback: UserFeedback[];
    performanceMetrics: PerformanceMetrics[];
    optimizationResults: OptimizationResult[];
}

export interface CodeExample {
    type: string;
    code: string;
    context: string;
    quality: number;
    usage: number;
}

export interface OptimizationResult {
    type: string;
    before: PerformanceMetrics;
    after: PerformanceMetrics;
    improvement: number;
    technique: string;
}

export interface AIAgentInterface {
    // Configuration
    configure(config: AIAgentConfig): Promise<void>;
    isConfigured(): boolean;
    
    // Code Generation
    generateController(spec: ControllerSpec): Promise<GeneratedCode>;
    generateMiddleware(spec: MiddlewareSpec): Promise<GeneratedCode>;
    generateRoute(spec: RouteSpec): Promise<GeneratedCode>;
    generateModel(spec: ModelSpec): Promise<GeneratedCode>;
    
    // Code Analysis
    analyzeCode(context: CodeAnalysisContext): Promise<CodeAnalysis>;
    detectPatterns(codebase: string[]): Promise<PatternReport>;
    suggestOptimizations(analysis: CodeAnalysis): Promise<OptimizationSuggestion[]>;
    
    // Architecture
    analyzeArchitecture(projectPath: string): Promise<ArchitectureAnalysis>;
    suggestArchitectureEvolution(current: ArchitectureAnalysis): Promise<EvolutionPlan>;
    
    // Bug Detection & Fixing
    detectBugs(codebase: string[]): Promise<BugReport>;
    fixBugs(bugs: BugReport): Promise<FixedCode>;
    
    // Learning
    learnFromFeedback(feedback: UserFeedback): Promise<void>;
    updateModel(learningData: LearningData): Promise<void>;
}
