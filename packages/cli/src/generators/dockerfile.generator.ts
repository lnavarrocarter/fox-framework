import { BaseGenerator } from './base.generator';
import { GeneratorContext, GeneratedFile } from '../interfaces/cli.interface';
import { DockerConfigInterface, DockerfileConfig, HealthCheckConfig, DockerGeneratorContext } from '../interfaces/docker.interface';
import path from 'path';
import fs from 'fs/promises';

export class DockerfileGenerator extends BaseGenerator {
  name = 'dockerfile';
  description = 'Generate optimized Dockerfiles with multi-stage builds';

  async generate(context: DockerGeneratorContext): Promise<GeneratedFile[]> {
    const { options, projectRoot } = context;
    const config = this.getDockerConfig(context);

    const files: GeneratedFile[] = [];

    // Generate main Dockerfile
    const dockerfile = await this.generateDockerfile(config, options);
    files.push({
      path: path.join(projectRoot, 'Dockerfile'),
      content: dockerfile,
      action: 'create'
    });

    // Generate .dockerignore
    const dockerignore = await this.generateDockerignore();
    files.push({
      path: path.join(projectRoot, '.dockerignore'),
      content: dockerignore,
      action: 'create'
    });

    // Generate multi-stage Dockerfile if requested
    if (options.multistage) {
      const multistageDockerfile = await this.generateMultistageDockerfile(config, options);
      files.push({
        path: path.join(projectRoot, 'Dockerfile.multistage'),
        content: multistageDockerfile,
        action: 'create'
      });
    }

    // Generate development Dockerfile
    const devDockerfile = await this.generateDevelopmentDockerfile(config, options);
    files.push({
      path: path.join(projectRoot, 'Dockerfile.dev'),
      content: devDockerfile,
      action: 'create'
    });

    return files;
  }

  private async generateDockerfile(
    config: DockerfileConfig,
    options: any
  ): Promise<string> {
    const baseImage = options.alpine ? 'node:18-alpine' : 'node:18-slim';
    const packageManager = await this.detectPackageManager();
    const hasTypeScript = await this.hasTypeScript();
    
    return `# Production Dockerfile for Fox Framework Application
FROM ${baseImage}

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init || apt-get update && apt-get install -y dumb-init

# Create app directory and user
WORKDIR ${config.workdir}
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ${config.user || 'foxuser'}

# Copy package files
COPY package*.json ./
${packageManager === 'yarn' ? 'COPY yarn.lock ./' : ''}
${packageManager === 'pnpm' ? 'COPY pnpm-lock.yaml ./' : ''}

# Install dependencies
RUN ${this.getInstallCommand(packageManager, 'production')}

# Copy source code
COPY --chown=${config.user || 'foxuser'}:nodejs . .

${hasTypeScript ? `# Build TypeScript
RUN ${this.getBuildCommand(packageManager)}` : ''}

# Set environment variables
${Object.entries(config.environment || {})
  .map(([key, value]) => `ENV ${key}=${value}`)
  .join('\n')}

# Expose port
EXPOSE ${config.port}

# Health check
${this.generateHealthCheckInstruction(config.healthCheck)}

# Switch to non-root user
USER ${config.user || 'foxuser'}

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["${this.getStartCommand(packageManager)}"]
`;
  }

  private async generateMultistageDockerfile(
    config: DockerfileConfig,
    options: any
  ): Promise<string> {
    const baseImage = options.alpine ? 'node:18-alpine' : 'node:18-slim';
    const packageManager = await this.detectPackageManager();
    const hasTypeScript = await this.hasTypeScript();

    return `# Multi-stage Dockerfile for Fox Framework Application

###################
# BUILD STAGE
###################
FROM ${baseImage} AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ || apt-get update && apt-get install -y python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
${packageManager === 'yarn' ? 'COPY yarn.lock ./' : ''}
${packageManager === 'pnpm' ? 'COPY pnpm-lock.yaml ./' : ''}

# Install all dependencies (including dev dependencies)
RUN ${this.getInstallCommand(packageManager, 'all')}

# Copy source code
COPY . .

${hasTypeScript ? `# Build TypeScript
RUN ${this.getBuildCommand(packageManager)}` : ''}

# Run tests (optional, comment out for faster builds)
# RUN ${this.getTestCommand(packageManager)}

# Clean dev dependencies
RUN ${this.getCleanCommand(packageManager)}

###################
# PRODUCTION STAGE
###################
FROM ${baseImage} AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init || apt-get update && apt-get install -y dumb-init

# Create app directory and user
WORKDIR ${config.workdir}
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ${config.user || 'foxuser'}

# Copy package files and install production dependencies
COPY package*.json ./
${packageManager === 'yarn' ? 'COPY yarn.lock ./' : ''}
${packageManager === 'pnpm' ? 'COPY pnpm-lock.yaml ./' : ''}

RUN ${this.getInstallCommand(packageManager, 'production')}

# Copy built application from builder stage
COPY --from=builder --chown=${config.user || 'foxuser'}:nodejs /app/${hasTypeScript ? 'dist' : 'src'} ./${hasTypeScript ? 'dist' : 'src'}
COPY --from=builder --chown=${config.user || 'foxuser'}:nodejs /app/package.json ./

# Set environment variables
${Object.entries(config.environment || {})
  .map(([key, value]) => `ENV ${key}=${value}`)
  .join('\n')}

# Expose port
EXPOSE ${config.port}

# Health check
${this.generateHealthCheckInstruction(config.healthCheck)}

# Switch to non-root user
USER ${config.user || 'foxuser'}

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["${this.getStartCommand(packageManager)}"]

###################
# DEVELOPMENT STAGE
###################
FROM ${baseImage} AS development

# Install development tools
RUN apk add --no-cache bash curl || apt-get update && apt-get install -y bash curl

WORKDIR ${config.workdir}

# Copy package files
COPY package*.json ./
${packageManager === 'yarn' ? 'COPY yarn.lock ./' : ''}
${packageManager === 'pnpm' ? 'COPY pnpm-lock.yaml ./' : ''}

# Install all dependencies
RUN ${this.getInstallCommand(packageManager, 'all')}

# Expose port
EXPOSE ${config.port}

# Development environment variables
ENV NODE_ENV=development

# Start in development mode
CMD ["${this.getDevCommand(packageManager)}"]
`;
  }

  private async generateDevelopmentDockerfile(
    config: DockerfileConfig,
    options: any
  ): Promise<string> {
    const baseImage = options.alpine ? 'node:18-alpine' : 'node:18-slim';
    const packageManager = await this.detectPackageManager();

    return `# Development Dockerfile for Fox Framework Application
FROM ${baseImage}

# Install development tools and dependencies
RUN apk add --no-cache bash curl git || apt-get update && apt-get install -y bash curl git

WORKDIR ${config.workdir}

# Copy package files
COPY package*.json ./
${packageManager === 'yarn' ? 'COPY yarn.lock ./' : ''}
${packageManager === 'pnpm' ? 'COPY pnpm-lock.yaml ./' : ''}

# Install all dependencies (including dev dependencies)
RUN ${this.getInstallCommand(packageManager, 'all')}

# Expose port
EXPOSE ${config.port}

# Set development environment
ENV NODE_ENV=development

# Create volume mount points
VOLUME ["/app/src", "/app/node_modules"]

# Health check for development
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \\
  CMD curl -f http://localhost:${config.port}/health || exit 1

# Start in development mode with hot reload
CMD ["${this.getDevCommand(packageManager)}"]
`;
  }

  private async generateDockerignore(): Promise<string> {
    return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Development files
*.log
.env*
!.env.example

# Build output
dist/
build/
.next/
out/

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Git
.git/
.gitignore

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# Tests and coverage
coverage/
.nyc_output/
__tests__/
*.test.ts
*.test.js
*.spec.ts
*.spec.js

# Documentation
README.md
LICENSE
docs/
*.md

# Misc
.github/
.dev/
examples/
`;
  }

  private generateHealthCheckInstruction(healthCheck?: HealthCheckConfig): string {
    if (!healthCheck) {
      return 'HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \\\n  CMD curl -f http://localhost:3000/health || exit 1';
    }

    const test = Array.isArray(healthCheck.test) 
      ? healthCheck.test.join(' ')
      : healthCheck.test;

    return `HEALTHCHECK --interval=${healthCheck.interval} --timeout=${healthCheck.timeout} --start-period=${healthCheck.start_period || '40s'} --retries=${healthCheck.retries} \\
  CMD ${test}`;
  }

  private async detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm'> {
    try {
      await fs.access('yarn.lock');
      return 'yarn';
    } catch {}

    try {
      await fs.access('pnpm-lock.yaml');
      return 'pnpm';
    } catch {}

    return 'npm';
  }

  private getInstallCommand(packageManager: string, type: 'production' | 'all'): string {
    const commands = {
      npm: type === 'production' ? 'npm ci --only=production' : 'npm ci',
      yarn: type === 'production' ? 'yarn install --frozen-lockfile --production' : 'yarn install --frozen-lockfile',
      pnpm: type === 'production' ? 'pnpm install --frozen-lockfile --prod' : 'pnpm install --frozen-lockfile'
    };

    return commands[packageManager as keyof typeof commands] || commands.npm;
  }

  private getBuildCommand(packageManager: string): string {
    const commands = {
      npm: 'npm run build',
      yarn: 'yarn build',
      pnpm: 'pnpm build'
    };

    return commands[packageManager as keyof typeof commands] || commands.npm;
  }

  private getStartCommand(packageManager: string): string {
    const commands = {
      npm: 'npm start',
      yarn: 'yarn start',
      pnpm: 'pnpm start'
    };

    return commands[packageManager as keyof typeof commands] || commands.npm;
  }

  private getDevCommand(packageManager: string): string {
    const commands = {
      npm: 'npm run dev',
      yarn: 'yarn dev',
      pnpm: 'pnpm dev'
    };

    return commands[packageManager as keyof typeof commands] || commands.npm;
  }

  private getTestCommand(packageManager: string): string {
    const commands = {
      npm: 'npm test',
      yarn: 'yarn test',
      pnpm: 'pnpm test'
    };

    return commands[packageManager as keyof typeof commands] || commands.npm;
  }

  private getCleanCommand(packageManager: string): string {
    const commands = {
      npm: 'npm prune --production',
      yarn: 'yarn install --production --ignore-scripts --prefer-offline',
      pnpm: 'pnpm prune --prod'
    };

    return commands[packageManager as keyof typeof commands] || commands.npm;
  }

  private async hasTypeScript(): Promise<boolean> {
    try {
      await fs.access('tsconfig.json');
      return true;
    } catch {
      return false;
    }
  }

  private getDockerConfig(context: DockerGeneratorContext): DockerfileConfig {
    const packageJson = this.readPackageJson(context.projectRoot);
    
    return {
      baseImage: 'node:18-alpine',
      nodeVersion: '18',
      workdir: '/app',
      port: 3000,
      healthCheck: {
        test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
        interval: '30s',
        timeout: '10s',
        retries: 3,
        start_period: '40s'
      },
      user: 'foxuser',
      environment: {
        NODE_ENV: 'production',
        PORT: '3000'
      }
    };
  }

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