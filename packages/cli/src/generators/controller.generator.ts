// tsfox/cli/generators/controller.generator.ts
import path from 'path';
import { BaseGenerator } from './base.generator';
import { GeneratorContext, GeneratedFile } from '../interfaces/cli.interface';

export class ControllerGenerator extends BaseGenerator {
  name = 'controller';
  description = 'Generate a new controller with optional CRUD operations';

  async generate(context: GeneratorContext): Promise<GeneratedFile[]> {
    this.validateContext(context);

    const { name, options } = context;
    const className = this.toPascalCase(name) + 'Controller';
    const fileName = this.toKebabCase(name) + '.controller.ts';
    const filePath = path.join(context.projectRoot, 'src/controllers', fileName);

    // Ensure controllers directory exists
    await this.ensureDirectory(path.dirname(filePath));

    const templateVariables = {
      className,
      name: this.toCamelCase(name),
      kebabName: this.toKebabCase(name),
      pascalName: this.toPascalCase(name),
      withCrud: options.crud || false,
      withValidation: options.validation || false,
      withAuth: options.auth || false,
      modelName: options.model ? this.toPascalCase(options.model) : this.toPascalCase(name),
      serviceName: this.toPascalCase(name) + 'Service',
      routePath: `/${this.toKebabCase(name)}`,
      currentYear: new Date().getFullYear(),
      currentDate: new Date().toISOString().split('T')[0]
    };

    const content = await this.renderTemplate(
      'components/controller.ts.hbs',
      templateVariables
    );

    await this.writeFile(filePath, content);

    const files: GeneratedFile[] = [
      {
        path: filePath,
        content,
        action: 'create'
      }
    ];

    // Generate test file if requested
    if (options.test) {
      const testFile = await this.generateTestFile(context, templateVariables);
      files.push(testFile);
    }

    // Generate service if requested
    if (options.service) {
      const serviceFile = await this.generateServiceFile(context, templateVariables);
      files.push(serviceFile);
    }

    // Update routes if requested
    if (options.updateRoutes) {
      await this.updateRoutesFile(context, templateVariables);
    }

    return files;
  }

  /**
   * Generate test file for controller
   */
  private async generateTestFile(
    context: GeneratorContext,
    variables: any
  ): Promise<GeneratedFile> {
    const testFileName = `${variables.kebabName}.controller.test.ts`;
    const testPath = path.join(context.projectRoot, 'src/controllers/__tests__', testFileName);

    await this.ensureDirectory(path.dirname(testPath));

    const testContent = await this.renderTemplate('components/controller.test.ts.hbs', {
      ...variables,
      testClassName: variables.className + 'Test'
    });

    await this.writeFile(testPath, testContent);

    return {
      path: testPath,
      content: testContent,
      action: 'create'
    };
  }

  /**
   * Generate service file for controller
   */
  private async generateServiceFile(
    context: GeneratorContext,
    variables: any
  ): Promise<GeneratedFile> {
    const serviceFileName = `${variables.kebabName}.service.ts`;
    const servicePath = path.join(context.projectRoot, 'src/services', serviceFileName);

    await this.ensureDirectory(path.dirname(servicePath));

    const serviceContent = await this.renderTemplate('components/service.ts.hbs', {
      ...variables,
      serviceClassName: variables.serviceName
    });

    await this.writeFile(servicePath, serviceContent);

    return {
      path: servicePath,
      content: serviceContent,
      action: 'create'
    };
  }

  /**
   * Update routes file with new controller
   */
  private async updateRoutesFile(
    context: GeneratorContext,
    variables: any
  ): Promise<void> {
    const routesPath = path.join(context.projectRoot, 'src/routes/index.ts');
    
    if (!this.fileExists(routesPath)) {
      console.warn('Routes file not found, creating basic routes file');
      await this.createBasicRoutesFile(routesPath);
    }

    // Add import
    const importStatement = `import { ${variables.className} } from '../controllers/${variables.kebabName}.controller';`;
    await this.addImport(routesPath, importStatement);

    // Add route registration
    const routeRegistration = `router.use('${variables.routePath}', new ${variables.className}().router);`;
    
    const content = await this.readFile(routesPath);
    if (!content.includes(routeRegistration)) {
      // Find insertion point for routes
      const lines = content.split('\n');
      let insertIndex = lines.length - 2; // Before export default

      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes('router.use(') || lines[i].includes('router.get(')) {
          insertIndex = i + 1;
          break;
        }
      }

      lines.splice(insertIndex, 0, routeRegistration);
      const updatedContent = lines.join('\n');
      await this.writeFile(routesPath, updatedContent, 'update');
    }

    console.log('Updated: src/routes/index.ts');
  }

  /**
   * Create basic routes file if it doesn't exist
   */
  private async createBasicRoutesFile(routesPath: string): Promise<void> {
    const basicRoutesContent = `import { Router } from 'express';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add your routes here

export default router;
`;

    await this.writeFile(routesPath, basicRoutesContent);
  }
}
