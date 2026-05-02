import { CommandInterface, CLIContext, ValidationResult, GeneratedFile } from '../../interfaces/cli.interface';
import { DockfileGenerator } from '../../generators/dockfile.generator';
import { ComposeGenerator } from '../../generators/compose.generator';
import { TemplateManager } from '../../core/template.manager';

export const DockerInitCommand: CommandInterface = {
  name: 'init',
  description: 'Initialize Docker configuration for the project',
  arguments: [],
  options: [
    {
      name: 'alpine',
      description: 'Use Alpine Linux base image',
      type: 'boolean',
      default: true
    },
    {
      name: 'multistage',
      description: 'Generate multi-stage Dockerfile',
      type: 'boolean',
      default: true
    },
    {
      name: 'nginx',
      description: 'Include Nginx configuration',
      type: 'boolean',
      default: false
    },
    {
      name: 'ssl',
      description: 'Include SSL configuration',
      type: 'boolean',
      default: false
    },
    {
      name: 'production',
      description: 'Generate production docker-compose',
      type: 'boolean',
      default: false
    },
    {
      name: 'testing',
      description: 'Generate testing docker-compose',
      type: 'boolean',
      default: false
    }
  ],

  validate: (args, options): ValidationResult => {
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    console.log('🐳 Initializing Docker configuration...');

    try {
      // Create template manager
      const templateManager = new TemplateManager();

      // Generate Dockerfile
      console.log('📦 Generating Dockerfile...');
      const dockerfileGenerator = new DockfileGenerator(templateManager);
      const dockerfileFiles = await dockerfileGenerator.generate({
        name: 'docker',
        options,
        projectRoot: context.projectRoot,
        config: context.config || {
          name: 'unknown',
          version: '1.0.0',
          framework: { version: '1.0.0', features: [] }
        },
        templates: templateManager
      });

      // Generate docker-compose
      console.log('🐳 Generating Docker Compose...');
      const composeGenerator = new ComposeGenerator(templateManager);
      const composeFiles = await composeGenerator.generate({
        name: 'compose',
        options: { ...options, development: true },
        projectRoot: context.projectRoot,
        config: context.config || {
          name: 'unknown',
          version: '1.0.0',
          framework: { version: '1.0.0', features: [] }
        },
        templates: templateManager
      });

      // Generate nginx config if requested
      if (options.nginx) {
        await generateNginxConfig(options, context);
      }

      const allFiles = [...dockerfileFiles, ...composeFiles];

      // Write all generated files to disk
      console.log('\n📝 Writing files to disk...');
      await writeGeneratedFiles(allFiles);

      console.log(`\n✅ Docker configuration generated successfully!`);
      console.log(`Generated ${allFiles.length} file(s):`);
      
      allFiles.forEach(file => {
        console.log(`  - ${file.path}`);
      });

      console.log('\n🚀 Next steps:');
      console.log('  # Development');
      console.log('  docker-compose -f docker-compose.dev.yml up');
      console.log('  ');
      console.log('  # Build production image');
      console.log('  tsfox docker:build');
      console.log('  ');
      console.log('  # Run production');
      if (options.production) {
        console.log('  docker-compose -f docker-compose.prod.yml up -d');
      } else {
        console.log('  tsfox docker:run');
      }

    } catch (error: any) {
      console.error(`\n❌ Failed to initialize Docker configuration: ${error.message}`);
      throw error;
    }
  }
};

/**
 * Write generated files to disk
 */
async function writeGeneratedFiles(files: GeneratedFile[]): Promise<void> {
  const fs = require('fs/promises');
  const path = require('path');

  for (const file of files) {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(file.path);
      await fs.mkdir(dir, { recursive: true });

      // Write file content
      await fs.writeFile(file.path, file.content, 'utf8');
      console.log(`  ✓ ${file.path}`);
    } catch (error: any) {
      console.error(`  ✗ ${file.path}: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Generate Nginx configuration files
 */
async function generateNginxConfig(options: any, context: CLIContext): Promise<void> {
  const path = require('path');
  const fs = require('fs/promises');

  console.log('🌐 Generating Nginx configuration...');

  // Create nginx directory
  const nginxDir = path.join(context.projectRoot, 'nginx');
  await fs.mkdir(nginxDir, { recursive: true });

  // Basic nginx.conf
  const nginxConf = `
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /health {
            proxy_pass http://app/health;
        }
    }
${options.ssl ? `
    server {
        listen 443 ssl;
        server_name localhost;

        ssl_certificate /etc/nginx/ssl/server.crt;
        ssl_certificate_key /etc/nginx/ssl/server.key;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
` : ''}
}
`.trim();

  const nginxConfPath = path.join(nginxDir, 'nginx.conf');
  await fs.writeFile(nginxConfPath, nginxConf);

  if (options.ssl) {
    // Create SSL directory
    const sslDir = path.join(nginxDir, 'ssl');
    await fs.mkdir(sslDir, { recursive: true });

    // Create placeholder SSL files
    const sslReadme = `
# SSL Configuration

Place your SSL certificate files here:
- server.crt (SSL certificate)
- server.key (Private key)

For development, you can generate self-signed certificates:

\`\`\`bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
  -keyout server.key -out server.crt \\
  -subj "/C=US/ST=State/L=City/O=Org/CN=localhost"
\`\`\`
`.trim();

    await fs.writeFile(path.join(sslDir, 'README.md'), sslReadme);
  }

  console.log('  ✓ Nginx configuration generated');
}
