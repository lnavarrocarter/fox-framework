// tsfox/cli/interfaces/cli.interface.ts
export interface CommandInterface {
  name: string;
  description: string;
  aliases?: string[];
  arguments?: ArgumentDefinition[];
  options?: OptionDefinition[];
  action: CommandAction;
  validate?: (args: any, options: any) => ValidationResult;
}

export interface GeneratorInterface {
  name: string;
  description: string;
  generate(context: GeneratorContext): Promise<GeneratedFile[]>;
  validate?(context: GeneratorContext): ValidationResult;
}

export interface TemplateInterface {
  name: string;
  type: TemplateType;
  files: TemplateFile[];
  variables: TemplateVariable[];
  hooks?: TemplateHooks;
}

export interface ProjectConfig {
  name: string;
  version: string;
  framework: {
    version: string;
    features: string[];
  };
  database?: DatabaseConfig;
  deployment?: DeploymentConfig;
  customTemplates?: string[];
}

export interface CLIContext {
  command: CommandInterface;
  projectRoot: string;
  verbose: boolean;
  quiet: boolean;
  noColor: boolean;
  config?: ProjectConfig;
  templateManager?: TemplateManager;
}

export interface GeneratorContext {
  name: string;
  options: Record<string, any>;
  projectRoot: string;
  config: ProjectConfig;
  templates: TemplateManager;
}

export interface ArgumentDefinition {
  name: string;
  description: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  choices?: string[];
}

export interface OptionDefinition {
  name: string;
  alias?: string;
  description: string;
  type?: 'string' | 'number' | 'boolean' | 'array';
  default?: any;
  required?: boolean;
  choices?: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  action: FileAction;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface DatabaseConfig {
  provider: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
  connection: Record<string, any>;
}

export interface DeploymentConfig {
  type: 'docker' | 'cloud' | 'traditional';
  config: Record<string, any>;
}

export interface TemplateFile {
  source: string;
  destination: string;
  condition?: (context: GeneratorContext) => boolean;
}

export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  default?: any;
  choices?: string[];
  validate?: (value: any) => boolean;
}

export interface TemplateHooks {
  beforeGenerate?: (context: GeneratorContext) => Promise<void>;
  afterGenerate?: (context: GeneratorContext, files: GeneratedFile[]) => Promise<void>;
}

export type CommandAction = (args: any, options: any, context: CLIContext) => Promise<void>;
export type FileAction = 'create' | 'update' | 'append' | 'skip';
export type TemplateType = 'project' | 'component' | 'config';

// Forward declaration for TemplateManager
export interface TemplateManager {
  render(templatePath: string, variables: Record<string, any>): Promise<string>;
  loadTemplate(name: string): Promise<TemplateInterface>;
}
