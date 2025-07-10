# 📋 Task #12: Mejoras del CLI

## 🎯 Objetivo

Mejorar significativamente el CLI de Fox Framework con generación de código avanzada, scaffolding completo, herramientas de desarrollo, y comandos de gestión del proyecto.

## 📋 Criterios de Aceptación

### Core Improvements

- [ ] **Advanced Generators**: Generadores para modelos, controllers, middleware, services
- [ ] **Project Scaffolding**: Creación completa de proyectos con templates
- [ ] **Interactive Mode**: CLI interactivo con prompts y validación
- [ ] **Plugin System**: CLI extensible con plugins
- [ ] **Build Tools**: Comandos de build, watch, y deployment
- [ ] **Development Tools**: Hot reload, debugging, testing helpers
- [ ] **Code Analysis**: Linting, formatting, y análisis estático

### Quality of Life

- [ ] **Autocomplete**: Bash/Zsh completion support
- [ ] **Configuration**: Gestión de configuración per-proyecto
- [ ] **Templates**: Templates customizables y compartibles
- [ ] **Version Management**: Gestión de versiones del framework
- [ ] **Help System**: Documentación integrada y contextual

### Integration Features

- [ ] **Git Integration**: Comandos git integrados
- [ ] **Database Tools**: Migrations, seeding, schema management
- [ ] **Testing Suite**: Running tests, coverage, benchmarks
- [ ] **Deployment**: Deploy scripts y CI/CD integration

## 🏗️ Arquitectura Propuesta

### Estructura de Archivos

```text
tsfox/cli/
├── cli.ts                        # Entry point principal
├── core/
│   ├── command.manager.ts        # Gestión de comandos
│   ├── prompt.manager.ts         # Sistema de prompts
│   ├── config.manager.ts         # Gestión de configuración
│   └── template.manager.ts       # Gestión de templates
├── commands/
│   ├── generate/
│   │   ├── controller.command.ts # Generar controllers
│   │   ├── model.command.ts      # Generar models
│   │   ├── middleware.command.ts # Generar middleware
│   │   ├── service.command.ts    # Generar services
│   │   └── migration.command.ts  # Generar migrations
│   ├── project/
│   │   ├── new.command.ts        # Nuevo proyecto
│   │   ├── init.command.ts       # Inicializar en directorio existente
│   │   └── upgrade.command.ts    # Upgrade framework
│   ├── dev/
│   │   ├── serve.command.ts      # Servidor de desarrollo
│   │   ├── build.command.ts      # Build para producción
│   │   ├── watch.command.ts      # Watch mode
│   │   └── test.command.ts       # Running tests
│   ├── database/
│   │   ├── migrate.command.ts    # Ejecutar migrations
│   │   ├── seed.command.ts       # Database seeding
│   │   └── schema.command.ts     # Schema management
│   └── deploy/
│       ├── docker.command.ts     # Docker deployment
│       ├── cloud.command.ts      # Cloud deployment
│       └── ci.command.ts         # CI/CD setup
├── generators/
│   ├── base.generator.ts         # Base generator class
│   ├── file.generator.ts         # File generation utilities
│   └── ast.generator.ts          # AST manipulation
├── templates/
│   ├── project/
│   │   ├── basic/                # Basic project template
│   │   ├── api/                  # API project template
│   │   ├── fullstack/            # Full-stack template
│   │   └── microservice/         # Microservice template
│   ├── components/
│   │   ├── controller.ts.hbs     # Controller template
│   │   ├── model.ts.hbs          # Model template
│   │   ├── middleware.ts.hbs     # Middleware template
│   │   └── service.ts.hbs        # Service template
│   └── config/
│       ├── tsconfig.json.hbs     # TypeScript config
│       ├── package.json.hbs      # Package.json template
│       └── docker.hbs            # Dockerfile template
└── utils/
    ├── file.utils.ts             # File system utilities
    ├── git.utils.ts              # Git integration
    └── npm.utils.ts              # NPM/package management
```

### Interfaces Principales

```typescript
// cli.interface.ts
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
```

### Tipos y Configuración

```typescript
// cli.types.ts
export type CommandAction = (args: any, options: any, context: CLIContext) => Promise<void>;

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
}

export interface GeneratedFile {
  path: string;
  content: string;
  action: FileAction;
}

export type FileAction = 'create' | 'update' | 'append' | 'skip';
export type TemplateType = 'project' | 'component' | 'config';

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
```

## 💻 Ejemplos de Implementación

### CLI Core

```typescript
// cli.ts
#!/usr/bin/env node

import { Command } from 'commander';
import { CommandManager } from './core/command.manager';
import { ConfigManager } from './core/config.manager';
import { PromptManager } from './core/prompt.manager';

// Import all commands
import { GenerateCommands } from './commands/generate';
import { ProjectCommands } from './commands/project';
import { DevCommands } from './commands/dev';
import { DatabaseCommands } from './commands/database';
import { DeployCommands } from './commands/deploy';

export class FoxCLI {
  private program: Command;
  private commandManager: CommandManager;
  private configManager: ConfigManager;
  private promptManager: PromptManager;

  constructor() {
    this.program = new Command();
    this.commandManager = new CommandManager();
    this.configManager = new ConfigManager();
    this.promptManager = new PromptManager();
    
    this.setupProgram();
    this.registerCommands();
  }

  private setupProgram(): void {
    this.program
      .name('tsfox')
      .description('Fox Framework CLI - Build modern TypeScript applications')
      .version(this.getVersion())
      .option('-v, --verbose', 'Verbose output')
      .option('-q, --quiet', 'Quiet mode')
      .option('--no-color', 'Disable colored output')
      .hook('preAction', this.preActionHook.bind(this));
  }

  private registerCommands(): void {
    // Generate commands
    const generateCommand = this.program
      .command('generate')
      .alias('g')
      .description('Generate code components');

    this.commandManager.registerCommands(generateCommand, GenerateCommands);

    // Project commands
    this.commandManager.registerCommands(this.program, ProjectCommands);

    // Development commands
    const devCommand = this.program
      .command('dev')
      .description('Development tools');

    this.commandManager.registerCommands(devCommand, DevCommands);

    // Database commands
    const dbCommand = this.program
      .command('db')
      .description('Database management');

    this.commandManager.registerCommands(dbCommand, DatabaseCommands);

    // Deploy commands
    const deployCommand = this.program
      .command('deploy')
      .description('Deployment tools');

    this.commandManager.registerCommands(deployCommand, DeployCommands);
  }

  private async preActionHook(thisCommand: Command): Promise<void> {
    // Load project config if available
    const config = await this.configManager.loadProjectConfig();
    
    // Set global context
    (global as any).foxCLI = {
      config,
      verbose: thisCommand.opts().verbose,
      quiet: thisCommand.opts().quiet,
      noColor: thisCommand.opts().noColor
    };
  }

  async run(argv: string[] = process.argv): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      this.handleError(error);
      process.exit(1);
    }
  }

  private handleError(error: any): void {
    if ((global as any).foxCLI?.verbose) {
      console.error(error);
    } else {
      console.error(`Error: ${error.message}`);
    }
  }

  private getVersion(): string {
    // Load version from package.json
    return require('../../package.json').version;
  }
}

// Bootstrap CLI
if (require.main === module) {
  const cli = new FoxCLI();
  cli.run().catch(() => process.exit(1));
}
```

### Generator System

```typescript
// generators/base.generator.ts
export abstract class BaseGenerator implements GeneratorInterface {
  abstract name: string;
  abstract description: string;

  constructor(protected templateManager: TemplateManager) {}

  abstract generate(context: GeneratorContext): Promise<GeneratedFile[]>;

  protected async renderTemplate(
    templatePath: string,
    variables: Record<string, any>
  ): Promise<string> {
    return this.templateManager.render(templatePath, variables);
  }

  protected async writeFile(
    filePath: string,
    content: string,
    action: FileAction = 'create'
  ): Promise<void> {
    const fullPath = path.resolve(filePath);
    
    if (action === 'create' && fs.existsSync(fullPath)) {
      const overwrite = await this.promptOverwrite(fullPath);
      if (!overwrite) {
        console.log(`Skipped: ${filePath}`);
        return;
      }
    }

    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, content, 'utf8');
    
    console.log(`${action === 'create' ? 'Created' : 'Updated'}: ${filePath}`);
  }

  protected async promptOverwrite(filePath: string): Promise<boolean> {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `File ${filePath} already exists. Overwrite?`,
        default: false
      }
    ]);
    
    return overwrite;
  }

  protected toPascalCase(str: string): string {
    return str.replace(/(^\w|_\w)/g, m => m.replace('_', '').toUpperCase());
  }

  protected toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  protected toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

// Example: Controller Generator
export class ControllerGenerator extends BaseGenerator {
  name = 'controller';
  description = 'Generate a new controller';

  async generate(context: GeneratorContext): Promise<GeneratedFile[]> {
    const { name, options } = context;
    const className = this.toPascalCase(name) + 'Controller';
    const fileName = this.toKebabCase(name) + '.controller.ts';
    const filePath = path.join(context.projectRoot, 'src/controllers', fileName);

    const templateVariables = {
      className,
      name: this.toCamelCase(name),
      kebabName: this.toKebabCase(name),
      withCrud: options.crud || false,
      withValidation: options.validation || false,
      withAuth: options.auth || false,
      modelName: options.model ? this.toPascalCase(options.model) : null
    };

    const content = await this.renderTemplate(
      'controller.ts.hbs',
      templateVariables
    );

    await this.writeFile(filePath, content);

    // Generate test file if requested
    if (options.test) {
      await this.generateTestFile(context, className, fileName);
    }

    // Update routes if requested
    if (options.updateRoutes) {
      await this.updateRoutesFile(context, className, name);
    }

    return [
      {
        path: filePath,
        content,
        action: 'create'
      }
    ];
  }

  private async generateTestFile(
    context: GeneratorContext,
    className: string,
    fileName: string
  ): Promise<void> {
    const testFileName = fileName.replace('.ts', '.test.ts');
    const testPath = path.join(context.projectRoot, 'src/controllers/__tests__', testFileName);

    const testContent = await this.renderTemplate('controller.test.ts.hbs', {
      className,
      fileName: fileName.replace('.ts', '')
    });

    await this.writeFile(testPath, testContent);
  }

  private async updateRoutesFile(
    context: GeneratorContext,
    className: string,
    name: string
  ): Promise<void> {
    const routesPath = path.join(context.projectRoot, 'src/routes/index.ts');
    
    if (!fs.existsSync(routesPath)) {
      console.warn('Routes file not found, skipping route registration');
      return;
    }

    const routesContent = await fs.promises.readFile(routesPath, 'utf8');
    const updatedContent = this.addControllerRoute(routesContent, className, name);
    
    await fs.promises.writeFile(routesPath, updatedContent);
    console.log('Updated: src/routes/index.ts');
  }

  private addControllerRoute(content: string, className: string, name: string): string {
    // Simple string replacement - in real implementation, use AST manipulation
    const importLine = `import { ${className} } from '../controllers/${this.toKebabCase(name)}.controller';`;
    const routeLine = `router.use('/${this.toKebabCase(name)}', ${className});`;

    // Add import
    if (!content.includes(importLine)) {
      content = content.replace(
        /(import.*from.*controllers.*;\n)/,
        `$1${importLine}\n`
      );
    }

    // Add route
    if (!content.includes(routeLine)) {
      content = content.replace(
        /(\/\/ Add your routes here)/,
        `$1\n${routeLine}`
      );
    }

    return content;
  }
}
```

### Project Template System

```typescript
// commands/project/new.command.ts
export const NewProjectCommand: CommandInterface = {
  name: 'new <name>',
  description: 'Create a new Fox Framework project',
  arguments: [
    {
      name: 'name',
      description: 'Project name',
      required: true,
      type: 'string'
    }
  ],
  options: [
    {
      name: 'template',
      alias: 't',
      description: 'Project template',
      type: 'string',
      default: 'basic'
    },
    {
      name: 'database',
      alias: 'd',
      description: 'Database provider',
      type: 'string',
      choices: ['postgresql', 'mysql', 'sqlite', 'mongodb']
    },
    {
      name: 'auth',
      description: 'Include authentication',
      type: 'boolean',
      default: false
    },
    {
      name: 'docker',
      description: 'Include Docker configuration',
      type: 'boolean',
      default: false
    }
  ],

  async action(args, options, context) {
    const projectName = args.name;
    const projectPath = path.resolve(projectName);

    // Check if directory exists
    if (fs.existsSync(projectPath)) {
      throw new Error(`Directory ${projectName} already exists`);
    }

    // Interactive mode if no template specified
    if (!options.template) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'template',
          message: 'Choose a project template:',
          choices: [
            { name: 'Basic API Server', value: 'api' },
            { name: 'Full-stack Application', value: 'fullstack' },
            { name: 'Microservice', value: 'microservice' },
            { name: 'Basic (minimal)', value: 'basic' }
          ]
        },
        {
          type: 'list',
          name: 'database',
          message: 'Choose a database:',
          choices: ['postgresql', 'mysql', 'sqlite', 'mongodb', 'none']
        },
        {
          type: 'confirm',
          name: 'auth',
          message: 'Include authentication?',
          default: false
        },
        {
          type: 'confirm',
          name: 'docker',
          message: 'Include Docker configuration?',
          default: false
        }
      ]);

      Object.assign(options, answers);
    }

    console.log(`Creating new Fox Framework project: ${projectName}`);
    
    // Create project directory
    await fs.promises.mkdir(projectPath, { recursive: true });

    // Generate project from template
    const generator = new ProjectGenerator(context.templateManager);
    await generator.generate({
      name: projectName,
      options,
      projectRoot: projectPath,
      config: context.config,
      templates: context.templateManager
    });

    // Install dependencies
    console.log('Installing dependencies...');
    await execAsync('npm install', { cwd: projectPath });

    // Initialize git repository
    if (options.git !== false) {
      await execAsync('git init', { cwd: projectPath });
      await execAsync('git add .', { cwd: projectPath });
      await execAsync('git commit -m "Initial commit"', { cwd: projectPath });
    }

    console.log(`
✅ Project ${projectName} created successfully!

Next steps:
  cd ${projectName}
  npm run dev

Available commands:
  npm run dev      - Start development server
  npm run build    - Build for production
  npm test         - Run tests
  tsfox generate   - Generate components
  tsfox db migrate - Run database migrations
    `);
  }
};

class ProjectGenerator extends BaseGenerator {
  name = 'project';
  description = 'Generate a complete project structure';

  async generate(context: GeneratorContext): Promise<GeneratedFile[]> {
    const { name, options, projectRoot } = context;
    const templateType = options.template || 'basic';

    // Load template configuration
    const template = await this.loadTemplate(templateType);
    
    // Prepare template variables
    const variables = {
      projectName: name,
      pascalName: this.toPascalCase(name),
      kebabName: this.toKebabCase(name),
      database: options.database,
      hasAuth: options.auth,
      hasDocker: options.docker,
      foxVersion: this.getFoxVersion(),
      nodeVersion: process.version
    };

    const files: GeneratedFile[] = [];

    // Generate all template files
    for (const file of template.files) {
      if (file.condition && !file.condition(context)) {
        continue;
      }

      const content = await this.renderTemplate(file.source, variables);
      const destPath = path.join(projectRoot, this.renderPath(file.destination, variables));

      await this.writeFile(destPath, content);
      files.push({
        path: destPath,
        content,
        action: 'create'
      });
    }

    return files;
  }

  private async loadTemplate(templateType: string): Promise<TemplateInterface> {
    const templatePath = path.join(__dirname, '../../templates/project', templateType);
    const configPath = path.join(templatePath, 'template.json');
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Template ${templateType} not found`);
    }

    return JSON.parse(await fs.promises.readFile(configPath, 'utf8'));
  }

  private renderPath(pathTemplate: string, variables: Record<string, any>): string {
    return pathTemplate.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  private getFoxVersion(): string {
    return require('../../../package.json').version;
  }
}
```

### Development Commands

```typescript
// commands/dev/serve.command.ts
export const ServeCommand: CommandInterface = {
  name: 'serve',
  description: 'Start development server with hot reload',
  aliases: ['start', 's'],
  options: [
    {
      name: 'port',
      alias: 'p',
      description: 'Port number',
      type: 'number',
      default: 3000
    },
    {
      name: 'watch',
      alias: 'w',
      description: 'Enable file watching',
      type: 'boolean',
      default: true
    },
    {
      name: 'debug',
      description: 'Enable debug mode',
      type: 'boolean',
      default: false
    }
  ],

  async action(args, options, context) {
    const projectRoot = process.cwd();
    const serverPath = path.join(projectRoot, 'src/server/index.ts');

    if (!fs.existsSync(serverPath)) {
      throw new Error('Server entry point not found. Make sure you are in a Fox Framework project.');
    }

    console.log('Starting Fox Framework development server...');

    if (options.watch) {
      await this.startWithWatch(serverPath, options);
    } else {
      await this.startOnce(serverPath, options);
    }
  },

  async startWithWatch(serverPath: string, options: any) {
    const { spawn } = require('child_process');
    let serverProcess: any = null;

    const startServer = () => {
      if (serverProcess) {
        serverProcess.kill();
      }

      const args = [
        'ts-node',
        options.debug ? '--inspect' : '',
        serverPath
      ].filter(Boolean);

      serverProcess = spawn('node', args, {
        stdio: 'inherit',
        env: {
          ...process.env,
          PORT: options.port.toString(),
          NODE_ENV: 'development'
        }
      });

      serverProcess.on('error', (error: Error) => {
        console.error('Server error:', error);
      });
    };

    // Initial start
    startServer();

    // Watch for file changes
    const chokidar = require('chokidar');
    const watcher = chokidar.watch(['src/**/*.ts', 'src/**/*.js'], {
      ignored: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
      persistent: true
    });

    watcher.on('change', (filePath: string) => {
      console.log(`File changed: ${filePath}`);
      console.log('Restarting server...');
      startServer();
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down development server...');
      if (serverProcess) {
        serverProcess.kill();
      }
      watcher.close();
      process.exit(0);
    });

    console.log(`Development server running on port ${options.port}`);
    console.log('Watching for file changes...');
  },

  async startOnce(serverPath: string, options: any) {
    // Simple one-time execution
    const { execAsync } = require('../../utils/exec.utils');
    
    await execAsync(`ts-node ${serverPath}`, {
      env: {
        ...process.env,
        PORT: options.port.toString(),
        NODE_ENV: 'development'
      }
    });
  }
};

// Build command
export const BuildCommand: CommandInterface = {
  name: 'build',
  description: 'Build the project for production',
  options: [
    {
      name: 'output',
      alias: 'o',
      description: 'Output directory',
      type: 'string',
      default: 'dist'
    },
    {
      name: 'minify',
      description: 'Minify output',
      type: 'boolean',
      default: true
    }
  ],

  async action(args, options, context) {
    console.log('Building Fox Framework project...');

    const { execAsync } = require('../../utils/exec.utils');
    
    // Clean output directory
    await execAsync(`rm -rf ${options.output}`);
    
    // Build TypeScript
    await execAsync(`tsc --outDir ${options.output} --declaration`);
    
    // Copy non-TS files
    await execAsync(`cp -r src/**/*.{json,hbs,html,css} ${options.output}/ 2>/dev/null || true`);
    
    console.log(`✅ Build completed! Output: ${options.output}`);
  }
};
```

## 🧪 Plan de Testing

### CLI Tests

```typescript
// __tests__/cli/generators.test.ts
describe('CLI Generators', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'fox-cli-test-'));
  });

  afterEach(async () => {
    await fs.promises.rmdir(tempDir, { recursive: true });
  });

  test('should generate controller', async () => {
    const generator = new ControllerGenerator(new TemplateManager());
    
    const context: GeneratorContext = {
      name: 'user',
      options: { crud: true, test: true },
      projectRoot: tempDir,
      config: {} as ProjectConfig,
      templates: new TemplateManager()
    };

    const files = await generator.generate(context);

    expect(files).toHaveLength(2); // Controller + test
    
    const controllerPath = path.join(tempDir, 'src/controllers/user.controller.ts');
    const testPath = path.join(tempDir, 'src/controllers/__tests__/user.controller.test.ts');
    
    expect(fs.existsSync(controllerPath)).toBe(true);
    expect(fs.existsSync(testPath)).toBe(true);
    
    const content = await fs.promises.readFile(controllerPath, 'utf8');
    expect(content).toContain('class UserController');
    expect(content).toContain('async create');
    expect(content).toContain('async findAll');
  });

  test('should create new project', async () => {
    const projectName = 'test-project';
    const projectPath = path.join(tempDir, projectName);

    // Mock CLI execution
    const mockCLI = {
      run: jest.fn()
    };

    await NewProjectCommand.action(
      { name: projectName },
      { template: 'api', database: 'postgresql' },
      { templateManager: new TemplateManager() }
    );

    expect(fs.existsSync(projectPath)).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'src/server/index.ts'))).toBe(true);
  });
});
```

### Integration Tests

```typescript
// __tests__/cli/integration.test.ts
describe('CLI Integration', () => {
  test('end-to-end project creation and development', async () => {
    const projectName = 'integration-test-project';
    const projectPath = path.join(os.tmpdir(), projectName);

    try {
      // Create project
      await execAsync(`tsfox new ${projectName} --template api --database sqlite`, {
        cwd: os.tmpdir()
      });

      // Verify project structure
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src/server/index.ts'))).toBe(true);

      // Generate components
      await execAsync('tsfox generate controller user --crud', {
        cwd: projectPath
      });

      expect(fs.existsSync(path.join(projectPath, 'src/controllers/user.controller.ts'))).toBe(true);

      // Build project
      await execAsync('tsfox build', {
        cwd: projectPath
      });

      expect(fs.existsSync(path.join(projectPath, 'dist'))).toBe(true);

    } finally {
      // Cleanup
      if (fs.existsSync(projectPath)) {
        await fs.promises.rmdir(projectPath, { recursive: true });
      }
    }
  });
});
```

## ✅ Definition of Done

- [ ] CLI con comandos avanzados implementado
- [ ] Sistema de generadores funcionando
- [ ] Templates de proyecto completos
- [ ] Desarrollo con hot reload
- [ ] Build system optimizado
- [ ] Comandos de base de datos
- [ ] Interactive prompts implementados
- [ ] Autocomplete para bash/zsh
- [ ] Tests del CLI con >90% cobertura
- [ ] Documentation completa

## 🔗 Dependencias

### Precedentes

- [09-plugin-system.md](./09-plugin-system.md) - Para plugins del CLI
- [11-database-abstraction.md](./11-database-abstraction.md) - Para comandos de DB

### Dependientes

- [14-docker-integration.md](./14-docker-integration.md) - Deploy commands
- [16-cloud-deployment.md](./16-cloud-deployment.md) - Cloud deploy commands

## 📅 Estimación

**Tiempo estimado**: 8-10 días  
**Complejidad**: Alta  
**Prioridad**: Enhancement

## 📊 Métricas de Éxito

- CLI commands execution time <2s
- Project generation <30s
- Developer satisfaction >90%
- Template coverage 100% use cases
- Zero breaking changes in upgrades
