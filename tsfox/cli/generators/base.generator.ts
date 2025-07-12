// tsfox/cli/generators/base.generator.ts
import fs from 'fs';
import path from 'path';
import { GeneratorInterface, GeneratorContext, GeneratedFile, FileAction } from '../interfaces/cli.interface';
import { TemplateManager } from '../core/template.manager';
import { PromptManager } from '../core/prompt.manager';

export abstract class BaseGenerator implements GeneratorInterface {
  abstract name: string;
  abstract description: string;

  protected templateManager: TemplateManager;
  protected promptManager: PromptManager;

  constructor(templateManager: TemplateManager) {
    this.templateManager = templateManager;
    this.promptManager = new PromptManager();
  }

  abstract generate(context: GeneratorContext): Promise<GeneratedFile[]>;

  /**
   * Render template with variables
   */
  protected async renderTemplate(
    templatePath: string,
    variables: Record<string, any>
  ): Promise<string> {
    return this.templateManager.render(templatePath, variables);
  }

  /**
   * Write file with overwrite handling
   */
  protected async writeFile(
    filePath: string,
    content: string,
    action: FileAction = 'create'
  ): Promise<void> {
    const fullPath = path.resolve(filePath);
    
    if (action === 'create' && fs.existsSync(fullPath)) {
      const overwrite = await this.promptManager.confirmOverwrite(fullPath);
      if (!overwrite) {
        console.log(`Skipped: ${filePath}`);
        return;
      }
    }

    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    
    if (action === 'append') {
      await fs.promises.appendFile(fullPath, content, 'utf8');
    } else {
      await fs.promises.writeFile(fullPath, content, 'utf8');
    }
    
    console.log(`${action === 'create' ? 'Created' : 'Updated'}: ${filePath}`);
  }

  /**
   * Check if file exists
   */
  protected fileExists(filePath: string): boolean {
    return fs.existsSync(path.resolve(filePath));
  }

  /**
   * Read file content
   */
  protected async readFile(filePath: string): Promise<string> {
    const fullPath = path.resolve(filePath);
    return fs.promises.readFile(fullPath, 'utf8');
  }

  /**
   * Convert string to PascalCase
   */
  protected toPascalCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .split(/[-_\s]+/)
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Convert string to camelCase
   */
  protected toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Convert string to kebab-case
   */
  protected toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[-_\s]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Convert string to snake_case
   */
  protected toSnakeCase(str: string): string {
    return this.toKebabCase(str).replace(/-/g, '_');
  }

  /**
   * Ensure directory exists
   */
  protected async ensureDirectory(dirPath: string): Promise<void> {
    await fs.promises.mkdir(path.resolve(dirPath), { recursive: true });
  }

  /**
   * Get relative path from project root
   */
  protected getRelativePath(filePath: string, projectRoot: string): string {
    return path.relative(projectRoot, filePath);
  }

  /**
   * Add import to file
   */
  protected async addImport(
    filePath: string,
    importStatement: string
  ): Promise<void> {
    if (!this.fileExists(filePath)) {
      return;
    }

    const content = await this.readFile(filePath);
    
    // Check if import already exists
    if (content.includes(importStatement.trim())) {
      return;
    }

    // Find insertion point (after existing imports)
    const lines = content.split('\n');
    let insertIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') || line.startsWith('export ')) {
        insertIndex = i + 1;
      } else if (line && !line.startsWith('//') && !line.startsWith('/*')) {
        break;
      }
    }

    lines.splice(insertIndex, 0, importStatement);
    
    const updatedContent = lines.join('\n');
    await fs.promises.writeFile(filePath, updatedContent, 'utf8');
  }

  /**
   * Add content to end of file
   */
  protected async appendToFile(
    filePath: string,
    content: string
  ): Promise<void> {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      await this.writeFile(fullPath, content);
      return;
    }

    await fs.promises.appendFile(fullPath, `\n${content}`, 'utf8');
    console.log(`Updated: ${filePath}`);
  }

  /**
   * Insert content at specific line
   */
  protected async insertAtLine(
    filePath: string,
    lineNumber: number,
    content: string
  ): Promise<void> {
    const fileContent = await this.readFile(filePath);
    const lines = fileContent.split('\n');
    
    lines.splice(lineNumber, 0, content);
    
    const updatedContent = lines.join('\n');
    await fs.promises.writeFile(filePath, updatedContent, 'utf8');
    console.log(`Updated: ${filePath}`);
  }

  /**
   * Replace content in file
   */
  protected async replaceInFile(
    filePath: string,
    searchString: string,
    replaceString: string
  ): Promise<void> {
    const content = await this.readFile(filePath);
    const updatedContent = content.replace(searchString, replaceString);
    
    await fs.promises.writeFile(filePath, updatedContent, 'utf8');
    console.log(`Updated: ${filePath}`);
  }

  /**
   * Validate context
   */
  protected validateContext(context: GeneratorContext): void {
    if (!context.name) {
      throw new Error('Generator context must have a name');
    }

    if (!context.projectRoot) {
      throw new Error('Generator context must have a project root');
    }

    if (!fs.existsSync(context.projectRoot)) {
      throw new Error(`Project root does not exist: ${context.projectRoot}`);
    }
  }

  /**
   * Get project structure info
   */
  protected async getProjectInfo(projectRoot: string): Promise<any> {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const foxConfigPath = path.join(projectRoot, 'fox.config.json');

    const info: any = {
      hasPackageJson: fs.existsSync(packageJsonPath),
      hasFoxConfig: fs.existsSync(foxConfigPath),
      directories: {
        src: fs.existsSync(path.join(projectRoot, 'src')),
        controllers: fs.existsSync(path.join(projectRoot, 'src/controllers')),
        models: fs.existsSync(path.join(projectRoot, 'src/models')),
        services: fs.existsSync(path.join(projectRoot, 'src/services')),
        middleware: fs.existsSync(path.join(projectRoot, 'src/middleware')),
        routes: fs.existsSync(path.join(projectRoot, 'src/routes'))
      }
    };

    if (info.hasPackageJson) {
      const packageContent = await fs.promises.readFile(packageJsonPath, 'utf8');
      info.packageJson = JSON.parse(packageContent);
    }

    if (info.hasFoxConfig) {
      const configContent = await fs.promises.readFile(foxConfigPath, 'utf8');
      info.foxConfig = JSON.parse(configContent);
    }

    return info;
  }
}
