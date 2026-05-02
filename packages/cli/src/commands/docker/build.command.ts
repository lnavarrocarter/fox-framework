import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';

export const DockerBuildCommand: CommandInterface = {
  name: 'build',
  description: 'Build Docker image',
  arguments: [
    {
      name: 'tag',
      description: 'Image tag',
      required: false,
      type: 'string'
    }
  ],
  options: [
    {
      name: 'platform',
      description: 'Target platform',
      type: 'string'
    },
    {
      name: 'no-cache',
      description: 'Build without cache',
      type: 'boolean',
      default: false
    },
    {
      name: 'push',
      description: 'Push to registry after build',
      type: 'boolean',
      default: false
    },
    {
      name: 'target',
      description: 'Build target stage',
      type: 'string',
      choices: ['development', 'production']
    }
  ],

  validate: (args, options): ValidationResult => {
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    const fs = require('fs/promises');
    const { execAsync } = await import('../../utils/exec.utils');

    try {
      // Read package.json to get app name and version
      const packageJson = JSON.parse(
        await fs.readFile('package.json', 'utf8')
      );
      
      const tag = args.tag || `${packageJson.name}:${packageJson.version}`;
      
      console.log(`🐳 Building Docker image: ${tag}`);

      const buildArgs = [
        'docker', 'build',
        '-t', tag,
        options.platform ? `--platform=${options.platform}` : '',
        options.noCache ? '--no-cache' : '',
        options.target ? `--target=${options.target}` : '',
        '.'
      ].filter(Boolean);

      console.log(`Running: ${buildArgs.join(' ')}`);
      await execAsync(buildArgs.join(' '));

      if (options.push) {
        console.log(`📤 Pushing image: ${tag}`);
        await execAsync(`docker push ${tag}`);
      }

      console.log('✅ Docker image built successfully!');

      // Show image info
      try {
        const imageInfo = await execAsync(`docker images ${tag} --format "table {{.Repository}}:{{.Tag}}\\t{{.Size}}\\t{{.CreatedAt}}"`);
        console.log('\n📊 Image Information:');
        console.log(imageInfo.stdout);
      } catch (error) {
        // Ignore errors getting image info
      }

    } catch (error: any) {
      console.error(`❌ Failed to build Docker image: ${error.message}`);
      throw error;
    }
  }
};
