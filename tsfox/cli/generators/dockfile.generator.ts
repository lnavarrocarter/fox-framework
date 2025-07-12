import * as path from 'path';
import * as fs from 'fs/promises';
import { BaseGenerator } from './base.generator';
import { GeneratorContext, GeneratedFile } from '../interfaces/cli.interface';
import { DockerfileConfig, DockerGeneratorContext } from '../interfaces/docker.interface';

/**
 * Dockfile generator - Generate optimized container files
 */
export class DockfileGenerator extends BaseGenerator {
  name = 'dockfile';
  description = 'Generate optimized container files';

  async generate(context: DockerGeneratorContext): Promise<GeneratedFile[]> {
    const { options, projectRoot } = context;
    const config = this.getDockConfig(context);

    console.log('📦 Generating container configuration...');

    try {
      // Generate Dockerfile
      const containerfile = await this.generateContainerfile(config, options);
      const containerfilePath = path.join(projectRoot, 'Dockerfile');

      // Generate .dockerignore
      const containerignore = await this.generateContainerignore();
      const containerignorePath = path.join(projectRoot, '.dockerignore');

      const files: GeneratedFile[] = [
        {
          path: containerfilePath,
          content: containerfile,
          action: 'create'
        },
        {
          path: containerignorePath,
          content: containerignore,
          action: 'create'
        }
      ];

      // Generate multi-stage Dockerfile if requested
      if (options.multistage) {
        const multistageContainerfile = await this.generateMultistageContainerfile(config, options);
        files.push({
          path: path.join(projectRoot, 'Dockerfile.multistage'),
          content: multistageContainerfile,
          action: 'create'
        });
      }

      return files;
    } catch (error) {
      console.error('Error in container file generation:', error);
      throw error;
    }
  }

  /**
   * Generate standard Dockerfile
   */
  private async generateContainerfile(
    config: DockerfileConfig, 
    options: any
  ): Promise<string> {
    const templateName = this.getContainerfileTemplate(options);
    
    const variables = {
      baseImage: config.baseImage,
      nodeVersion: config.nodeVersion,
      workdir: config.workdir,
      port: config.port,
      user: config.user || 'node',
      healthCheck: config.healthCheck,
      environment: config.environment || {},
      volumes: config.volumes || [],
      hasTypeScript: this.hasTypeScript(),
      hasTests: this.hasTests(),
      production: options.production || false
    };

    return this.renderTemplate(templateName, variables);
  }

  /**
   * Generate multi-stage Dockerfile
   */
  private async generateMultistageContainerfile(
    config: DockerfileConfig,
    options: any
  ): Promise<string> {
    const variables = {
      baseImage: config.baseImage,
      nodeVersion: config.nodeVersion,
      workdir: config.workdir,
      port: config.port,
      user: config.user || 'node',
      healthCheck: config.healthCheck,
      environment: config.environment || {},
      hasTypeScript: this.hasTypeScript(),
      hasTests: this.hasTests()
    };

    return this.renderTemplate('docker/dockerfile/multistage.hbs', variables);
  }

  /**
   * Generate .dockerignore file
   */
  private async generateContainerignore(): Promise<string> {
    return `# Dependencies
node_modules/
npm-debug.log*

# Development files
*.log
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build output
dist/
build/
.next/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Git
.git/
.gitignore

# Container files
Dockerfile*
docker-compose*.yml
.dockerignore

# Tests
coverage/
.nyc_output/

# Misc
README.md
LICENSE
docs/`;
  }

  /**
   * Get appropriate Dockerfile template
   */
  private getContainerfileTemplate(options: any): string {
    if (options.alpine) {
      return 'docker/dockerfile/node.alpine.hbs';
    }
    return 'docker/dockerfile/node.ubuntu.hbs';
  }

  /**
   * Get container configuration from context
   */
  private getDockConfig(context: DockerGeneratorContext): DockerfileConfig {
    if (context.dockerConfig?.dockerfile) {
      return context.dockerConfig.dockerfile;
    }

    const packageJson = this.readPackageJson(context.projectRoot);
    
    return {
      baseImage: 'node',
      nodeVersion: '18-alpine',
      workdir: '/app',
      port: 3000,
      healthCheck: {
        test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
        interval: '30s',
        timeout: '10s',
        retries: 3,
        start_period: '40s'
      },
      user: 'node',
      environment: {
        NODE_ENV: 'production'
      }
    };
  }

  /**
   * Check if project uses TypeScript
   */
  private hasTypeScript(): boolean {
    try {
      const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
      require('fs').accessSync(tsConfigPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if project has tests
   */
  private hasTests(): boolean {
    try {
      const jestConfigPath = path.join(process.cwd(), 'jest.config.ts');
      require('fs').accessSync(jestConfigPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read package.json
   */
  private readPackageJson(projectRoot: string): any {
    try {
      const packagePath = path.join(projectRoot, 'package.json');
      const content = require('fs').readFileSync(packagePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return { name: 'fox-app', version: '1.0.0' };
    }
  }
}
