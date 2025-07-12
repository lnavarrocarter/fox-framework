import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';

export const DockerLogsCommand: CommandInterface = {
  name: 'logs',
  description: 'View container logs',
  arguments: [
    {
      name: 'service',
      description: 'Service name',
      required: false,
      type: 'string'
    }
  ],
  options: [
    {
      name: 'follow',
      alias: 'f',
      description: 'Follow log output',
      type: 'boolean',
      default: false
    },
    {
      name: 'tail',
      description: 'Number of lines to show from end',
      type: 'number',
      default: 100
    },
    {
      name: 'container',
      description: 'View logs from specific container instead of compose',
      type: 'boolean',
      default: false
    },
    {
      name: 'file',
      alias: 'f',
      description: 'Compose file to use',
      type: 'string',
      default: 'docker-compose.dev.yml'
    }
  ],

  validate: (args, options): ValidationResult => {
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    const { execAsync } = await import('../../utils/exec.utils');

    try {
      let logArgs: string[];

      if (options.container) {
        // View logs from a specific container
        const containerName = args.service || await getRunningContainerName();
        
        logArgs = [
          'docker', 'logs',
          options.follow ? '-f' : '',
          `--tail=${options.tail}`,
          containerName
        ].filter(Boolean);

      } else {
        // View logs from docker-compose
        logArgs = [
          'docker-compose',
          '-f', options.file,
          'logs',
          options.follow ? '-f' : '',
          `--tail=${options.tail}`,
          args.service || ''
        ].filter(Boolean);
      }

      console.log(`📋 Viewing logs${args.service ? ` for ${args.service}` : ''}...`);
      console.log(`Running: ${logArgs.join(' ')}`);

      const result = await execAsync(logArgs.join(' '));
      console.log(result.stdout);

    } catch (error: any) {
      console.error(`❌ Failed to view logs: ${error.message}`);
      throw error;
    }
  }
};

/**
 * Get the name of a running container
 */
async function getRunningContainerName(): Promise<string> {
  const { execAsync } = await import('../../utils/exec.utils');
  const fs = require('fs/promises');

  try {
    // Try to get app name from package.json
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    return `${packageJson.name}-container`;
  } catch {
    // Fallback: get first running container
    const result = await execAsync('docker ps --format "{{.Names}}" | head -1');
    const containerName = result.stdout.trim();
    
    if (!containerName) {
      throw new Error('No running containers found');
    }
    
    return containerName;
  }
}
