import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';

export const DockerComposeCommand: CommandInterface = {
  name: 'compose',
  description: 'Run docker-compose commands',
  arguments: [
    {
      name: 'action',
      description: 'Compose action (up, down, logs, ps, etc.)',
      required: true,
      type: 'string'
    }
  ],
  options: [
    {
      name: 'file',
      alias: 'f',
      description: 'Compose file',
      type: 'string',
      default: 'docker-compose.dev.yml'
    },
    {
      name: 'detach',
      alias: 'd',
      description: 'Detached mode',
      type: 'boolean',
      default: false
    },
    {
      name: 'build',
      description: 'Build images before starting',
      type: 'boolean',
      default: false
    },
    {
      name: 'service',
      description: 'Service name for specific actions',
      type: 'string'
    }
  ],

  validate: (args, options): ValidationResult => {
    const validActions = ['up', 'down', 'logs', 'ps', 'restart', 'stop', 'start', 'pull', 'build'];
    
    if (!validActions.includes(args.action)) {
      return {
        valid: false,
        message: `Invalid action: ${args.action}. Valid actions: ${validActions.join(', ')}`
      };
    }

    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    const { execAsync } = await import('../../utils/exec.utils');
    const fs = require('fs/promises');

    try {
      // Check if compose file exists
      try {
        await fs.access(options.file);
      } catch (error) {
        console.error(`❌ Compose file not found: ${options.file}`);
        console.log('💡 Run "tsfox docker:init" to generate Docker configuration');
        return;
      }

      console.log(`🐳 Running docker-compose ${args.action}...`);

      const composeArgs = [
        'docker-compose',
        '-f', options.file,
        args.action
      ];

      // Add action-specific options
      if (args.action === 'up') {
        if (options.detach) composeArgs.push('-d');
        if (options.build) composeArgs.push('--build');
      }

      if (args.action === 'logs') {
        composeArgs.push('-f'); // Follow logs by default
        if (options.service) composeArgs.push(options.service);
      }

      if (options.service && ['restart', 'stop', 'start'].includes(args.action)) {
        composeArgs.push(options.service);
      }

      console.log(`Running: ${composeArgs.join(' ')}`);
      
      const result = await execAsync(composeArgs.join(' '));

      if (result.stdout) {
        console.log(result.stdout);
      }

      if (args.action === 'up') {
        console.log('✅ Services started successfully!');
        if (options.detach) {
          console.log(`\n📱 Access your application at: http://localhost:3000`);
          console.log(`🔍 View logs: tsfox docker:compose logs`);
          console.log(`🛑 Stop services: tsfox docker:compose down`);
        }
      } else if (args.action === 'down') {
        console.log('✅ Services stopped successfully!');
      }

    } catch (error: any) {
      console.error(`❌ Docker compose ${args.action} failed: ${error.message}`);
      throw error;
    }
  }
};
