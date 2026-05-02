import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';

export const DockerRunCommand: CommandInterface = {
  name: 'run',
  description: 'Run the application in Docker',
  arguments: [],
  options: [
    {
      name: 'detach',
      alias: 'd',
      description: 'Run in detached mode',
      type: 'boolean',
      default: false
    },
    {
      name: 'port',
      alias: 'p',
      description: 'Port mapping',
      type: 'string',
      default: '3000:3000'
    },
    {
      name: 'env-file',
      description: 'Environment file',
      type: 'string'
    },
    {
      name: 'name',
      description: 'Container name',
      type: 'string'
    }
  ],

  validate: (args, options): ValidationResult => {
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    const fs = require('fs/promises');
    const { execAsync } = await import('../../utils/exec.utils');

    try {
      // Read package.json to get app name
      const packageJson = JSON.parse(
        await fs.readFile('package.json', 'utf8')
      );
      
      const imageName = `${packageJson.name}:${packageJson.version}`;
      const containerName = options.name || `${packageJson.name}-container`;
      
      console.log(`🚀 Running Docker container: ${containerName}`);

      const runArgs = [
        'docker', 'run',
        options.detach ? '-d' : '--rm',
        '-p', options.port,
        options.envFile ? `--env-file=${options.envFile}` : '',
        '--name', containerName,
        imageName
      ].filter(Boolean);

      console.log(`Running: ${runArgs.join(' ')}`);
      const result = await execAsync(runArgs.join(' '));

      if (!options.detach) {
        console.log('Container stopped.');
      } else {
        console.log('✅ Container started in detached mode.');
        console.log(`Container ID: ${result.stdout.trim()}`);
        console.log(`\n📱 Access your application at: http://localhost:${options.port.split(':')[0]}`);
        console.log(`\n🔍 View logs: docker logs -f ${containerName}`);
        console.log(`🛑 Stop container: docker stop ${containerName}`);
      }

    } catch (error: any) {
      console.error(`❌ Failed to run Docker container: ${error.message}`);
      throw error;
    }
  }
};
