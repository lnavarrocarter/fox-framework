// tsfox/cli/commands/generate/controller.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';
import { ControllerGenerator } from '../../generators/controller.generator';
import { TemplateManager } from '../../core/template.manager';

export const ControllerCommand: CommandInterface = {
  name: 'controller',
  description: 'Generate a new controller',
  aliases: ['c'],
  arguments: [
    {
      name: 'name',
      description: 'Controller name',
      required: true,
      type: 'string'
    }
  ],
  options: [
    {
      name: 'crud',
      description: 'Generate CRUD operations',
      type: 'boolean',
      default: false
    },
    {
      name: 'test',
      alias: 't',
      description: 'Generate test file',
      type: 'boolean',
      default: false
    },
    {
      name: 'service',
      alias: 's',
      description: 'Generate service file',
      type: 'boolean',
      default: false
    },
    {
      name: 'validation',
      alias: 'v',
      description: 'Include validation',
      type: 'boolean',
      default: false
    },
    {
      name: 'auth',
      alias: 'a',
      description: 'Include authentication',
      type: 'boolean',
      default: false
    },
    {
      name: 'model',
      alias: 'm',
      description: 'Associated model name',
      type: 'string'
    },
    {
      name: 'update-routes',
      alias: 'r',
      description: 'Update routes file',
      type: 'boolean',
      default: false
    }
  ],

  validate: (args, options): ValidationResult => {
    if (!args.name || args.name.trim() === '') {
      return {
        valid: false,
        message: 'Controller name is required'
      };
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(args.name)) {
      return {
        valid: false,
        message: 'Controller name must be a valid identifier (letters, numbers, underscore)'
      };
    }

    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    const { name } = args;

    console.log(`Generating controller: ${name}`);
    
    if (options.crud) {
      console.log('  ✓ CRUD operations enabled');
    }
    
    if (options.test) {
      console.log('  ✓ Test file will be generated');
    }
    
    if (options.service) {
      console.log('  ✓ Service file will be generated');
    }

    try {
      // Create template manager
      const templateManager = new TemplateManager();
      
      // Create generator
      const generator = new ControllerGenerator(templateManager);

      // Generate files
      const files = await generator.generate({
        name,
        options,
        projectRoot: context.projectRoot,
        config: context.config || {
          name: 'unknown',
          version: '1.0.0',
          framework: { version: '1.0.0', features: [] }
        },
        templates: templateManager
      });

      console.log(`\n✅ Controller generated successfully!`);
      console.log(`Generated ${files.length} file(s):`);
      
      files.forEach(file => {
        console.log(`  - ${file.path}`);
      });

      if (options.updateRoutes) {
        console.log(`\n💡 Routes updated. Don't forget to restart your server.`);
      }

      console.log(`\n🚀 Next steps:`);
      console.log(`  1. Review the generated files`);
      if (!options.service) {
        console.log(`  2. Implement your business logic`);
      } else {
        console.log(`  2. Implement your service methods`);
      }
      if (!options.updateRoutes) {
        console.log(`  3. Add routes to your router`);
      }
      console.log(`  4. Add validation schemas if needed`);
      console.log(`  5. Run tests: npm test`);

    } catch (error: any) {
      console.error(`\n❌ Failed to generate controller: ${error.message}`);
      throw error;
    }
  }
};
