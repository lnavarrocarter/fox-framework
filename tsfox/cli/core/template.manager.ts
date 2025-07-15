// tsfox/cli/core/template.manager.ts
import fs from 'fs';
import path from 'path';
import { TemplateInterface, GeneratorContext } from '../interfaces/cli.interface';

export class TemplateManager {
  private templatesDir: string;
  private handlebars: any;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.join(__dirname, '../templates');
    
    // Initialize Handlebars (will be lazy-loaded)
    this.handlebars = null;
  }

  /**
   * Initialize Handlebars with helpers
   */
  private initializeHandlebars(): void {
    if (this.handlebars) return;

    try {
      this.handlebars = require('handlebars');
      this.registerHelpers();
    } catch (error) {
      // Fallback to simple template replacement if handlebars is not available
      this.handlebars = null;
    }
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    if (!this.handlebars) return;

    // String helpers
    this.handlebars.registerHelper('pascalCase', (str: string) => {
      return str.replace(/(^\w|_\w)/g, m => m.replace('_', '').toUpperCase());
    });

    this.handlebars.registerHelper('camelCase', (str: string) => {
      const pascal = str.replace(/(^\w|_\w)/g, m => m.replace('_', '').toUpperCase());
      return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    });

    this.handlebars.registerHelper('kebabCase', (str: string) => {
      return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    });

    this.handlebars.registerHelper('snakeCase', (str: string) => {
      return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    });

    this.handlebars.registerHelper('upperCase', (str: string) => {
      return str.toUpperCase();
    });

    this.handlebars.registerHelper('lowerCase', (str: string) => {
      return str.toLowerCase();
    });

    // Conditional helpers
    this.handlebars.registerHelper('eq', (a: any, b: any) => {
      return a === b;
    });

    this.handlebars.registerHelper('ne', (a: any, b: any) => {
      return a !== b;
    });

    this.handlebars.registerHelper('and', (a: any, b: any) => {
      return a && b;
    });

    this.handlebars.registerHelper('or', (a: any, b: any) => {
      return a || b;
    });

    // Comparison helpers
    this.handlebars.registerHelper('gt', (a: any, b: any) => {
      return a > b;
    });

    this.handlebars.registerHelper('gte', (a: any, b: any) => {
      return a >= b;
    });

    this.handlebars.registerHelper('lt', (a: any, b: any) => {
      return a < b;
    });

    this.handlebars.registerHelper('lte', (a: any, b: any) => {
      return a <= b;
    });

    // Array helpers
    this.handlebars.registerHelper('join', (array: any[], separator: string) => {
      return array ? array.join(separator) : '';
    });

    // Date helpers
    this.handlebars.registerHelper('currentYear', () => {
      return new Date().getFullYear();
    });

    this.handlebars.registerHelper('currentDate', () => {
      return new Date().toISOString().split('T')[0];
    });

    this.handlebars.registerHelper('timestamp', () => {
      return new Date().toISOString();
    });
  }

  /**
   * Render template with variables
   */
  async render(templatePath: string, variables: Record<string, any>): Promise<string> {
    const fullPath = path.resolve(this.templatesDir, templatePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    const templateContent = await fs.promises.readFile(fullPath, 'utf8');
    
    this.initializeHandlebars();
    
    if (this.handlebars) {
      // Use Handlebars for advanced templating
      const template = this.handlebars.compile(templateContent);
      return template(variables);
    } else {
      // Fallback to simple variable replacement
      return this.simpleVariableReplacement(templateContent, variables);
    }
  }

  /**
   * Simple variable replacement for when Handlebars is not available
   */
  private simpleVariableReplacement(content: string, variables: Record<string, any>): string {
    let result = content;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  }

  /**
   * Load template configuration
   */
  async loadTemplate(templateName: string): Promise<TemplateInterface> {
    const templateDir = path.join(this.templatesDir, 'project', templateName);
    const configPath = path.join(templateDir, 'template.json');

    if (!fs.existsSync(configPath)) {
      throw new Error(`Template configuration not found: ${templateName}`);
    }

    const configContent = await fs.promises.readFile(configPath, 'utf8');
    const template: TemplateInterface = JSON.parse(configContent);

    // Validate template
    this.validateTemplate(template);

    return template;
  }

  /**
   * Get available templates
   */
  async getAvailableTemplates(): Promise<string[]> {
    const projectTemplatesDir = path.join(this.templatesDir, 'project');
    
    if (!fs.existsSync(projectTemplatesDir)) {
      return [];
    }

    const entries = await fs.promises.readdir(projectTemplatesDir, { withFileTypes: true });
    
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  }

  /**
   * Copy template files
   */
  async copyTemplateFiles(
    templateName: string,
    destinationDir: string,
    variables: Record<string, any>
  ): Promise<void> {
    const sourceDir = path.join(this.templatesDir, 'project', templateName);
    
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Template directory not found: ${templateName}`);
    }

    await this.copyDirectory(sourceDir, destinationDir, variables);
  }

  /**
   * Recursively copy directory with template processing
   */
  private async copyDirectory(
    sourceDir: string,
    destDir: string,
    variables: Record<string, any>
  ): Promise<void> {
    await fs.promises.mkdir(destDir, { recursive: true });

    const entries = await fs.promises.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        // Skip template.json files
        if (entry.name === 'template.json') continue;
        
        await this.copyDirectory(sourcePath, destPath, variables);
      } else {
        // Process template files
        if (entry.name.endsWith('.hbs') || entry.name.endsWith('.template')) {
          const content = await this.render(
            path.relative(this.templatesDir, sourcePath),
            variables
          );
          
          const finalDestPath = destPath.replace(/\.(hbs|template)$/, '');
          await fs.promises.writeFile(finalDestPath, content, 'utf8');
        } else {
          // Copy non-template files as-is
          await fs.promises.copyFile(sourcePath, destPath);
        }
      }
    }
  }

  /**
   * Validate template configuration
   */
  private validateTemplate(template: TemplateInterface): void {
    if (!template.name) {
      throw new Error('Template must have a name');
    }

    if (!template.type) {
      throw new Error('Template must have a type');
    }

    if (!Array.isArray(template.files)) {
      throw new Error('Template must have a files array');
    }

    if (!Array.isArray(template.variables)) {
      throw new Error('Template must have a variables array');
    }
  }

  /**
   * Set templates directory
   */
  setTemplatesDirectory(dir: string): void {
    this.templatesDir = dir;
  }

  /**
   * Get templates directory
   */
  getTemplatesDirectory(): string {
    return this.templatesDir;
  }
}
