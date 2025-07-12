import * as path from 'path';
import * as fs from 'fs/promises';
import { BaseGenerator } from './base.generator';
import { GeneratorContext, GeneratedFile } from '../interfaces/cli.interface';
import { 
  ComposeConfig, 
  ServiceConfig, 
  DockerGeneratorContext,
  VolumeConfig,
  NetworkConfig 
} from '../interfaces/docker.interface';

/**
 * Docker Compose generator
 */
export class ComposeGenerator extends BaseGenerator {
  name = 'compose';
  description = 'Generate docker-compose configurations';

  async generate(context: DockerGeneratorContext): Promise<GeneratedFile[]> {
    const { options, projectRoot } = context;
    const files: GeneratedFile[] = [];

    console.log('🐳 Generating Docker Compose configurations...');

    // Development compose
    if (options.development !== false) {
      const devCompose = await this.generateDevelopmentCompose(context);
      files.push({
        path: path.join(projectRoot, 'docker-compose.dev.yml'),
        content: devCompose,
        action: 'create'
      });
    }

    // Production compose
    if (options.production) {
      const prodCompose = await this.generateProductionCompose(context);
      files.push({
        path: path.join(projectRoot, 'docker-compose.prod.yml'),
        content: prodCompose,
        action: 'create'
      });
    }

    // Testing compose
    if (options.testing) {
      const testCompose = await this.generateTestingCompose(context);
      files.push({
        path: path.join(projectRoot, 'docker-compose.test.yml'),
        content: testCompose,
        action: 'create'
      });
    }

    return files;
  }

  /**
   * Generate development docker-compose
   */
  private async generateDevelopmentCompose(context: DockerGeneratorContext): Promise<string> {
    const config = this.getComposeConfig(context, 'development');
    
    const variables = {
      appName: this.getAppName(context),
      services: config.services,
      networks: config.networks || {},
      volumes: config.volumes || {},
      hasDatabase: this.hasDatabase(context),
      hasRedis: this.hasRedis(context),
      hasNginx: context.options?.nginx || false
    };

    return this.renderTemplate('docker/compose/development.yml.hbs', variables);
  }

  /**
   * Generate production docker-compose
   */
  private async generateProductionCompose(context: DockerGeneratorContext): Promise<string> {
    const config = this.getComposeConfig(context, 'production');
    
    const variables = {
      appName: this.getAppName(context),
      services: config.services,
      networks: config.networks || {},
      volumes: config.volumes || {},
      hasDatabase: this.hasDatabase(context),
      hasRedis: this.hasRedis(context),
      hasNginx: true, // Always include nginx in production
      ssl: context.options?.ssl || false
    };

    return this.renderTemplate('docker/compose/production.yml.hbs', variables);
  }

  /**
   * Generate testing docker-compose
   */
  private async generateTestingCompose(context: DockerGeneratorContext): Promise<string> {
    const config = this.getComposeConfig(context, 'testing');
    
    const variables = {
      appName: this.getAppName(context),
      services: config.services,
      networks: config.networks || {},
      volumes: config.volumes || {}
    };

    return this.renderTemplate('docker/compose/testing.yml.hbs', variables);
  }

  /**
   * Get compose configuration for environment
   */
  private getComposeConfig(context: DockerGeneratorContext, environment: string): ComposeConfig {
    const appName = this.getAppName(context);
    const isDev = environment === 'development';
    const isTest = environment === 'testing';

    const services: Record<string, ServiceConfig> = {
      app: {
        build: {
          context: '.',
          target: isDev ? 'development' : 'production'
        },
        ports: [isDev ? '3000:3000' : '80:3000'],
        environment: {
          NODE_ENV: environment,
          PORT: '3000'
        },
        volumes: isDev ? [
          '.:/app',
          '/app/node_modules'
        ] : undefined,
        depends_on: this.getDependencies(context),
        healthcheck: isTest ? undefined : {
          test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
          interval: '30s',
          timeout: '10s',
          retries: 3
        },
        restart: (isDev || isTest ? 'unless-stopped' : 'always') as 'unless-stopped' | 'always'
      }
    };

    // Add database service
    if (this.hasDatabase(context)) {
      const dbType = this.getDatabaseType(context);
      services[dbType] = this.getDatabaseService(dbType, isDev || isTest);
    }

    // Add Redis service
    if (this.hasRedis(context)) {
      services.redis = {
        image: 'redis:alpine',
        ports: isDev || isTest ? ['6379:6379'] : undefined,
        volumes: isDev || isTest ? undefined : ['redis_data:/data'],
        restart: 'unless-stopped'
      };
    }

    // Add Nginx service for production
    if ((!isDev && !isTest) || context.options?.nginx) {
      services.nginx = {
        image: 'nginx:alpine',
        ports: ['80:80', '443:443'],
        volumes: [
          './nginx/nginx.conf:/etc/nginx/nginx.conf',
          './nginx/ssl:/etc/nginx/ssl'
        ],
        depends_on: ['app'],
        restart: 'unless-stopped'
      };
    }

    return {
      version: '3.8',
      services,
      networks: {
        default: {
          driver: 'bridge'
        }
      },
      volumes: this.getVolumes(context, isDev || isTest)
    };
  }

  /**
   * Get database service configuration
   */
  private getDatabaseService(dbType: string, isDev: boolean): ServiceConfig {
    const configs = {
      postgresql: {
        image: 'postgres:15-alpine',
        environment: {
          POSTGRES_DB: 'foxapp',
          POSTGRES_USER: 'foxuser',
          POSTGRES_PASSWORD: 'foxpass'
        },
        ports: isDev ? ['5432:5432'] : undefined,
        volumes: isDev ? undefined : ['postgres_data:/var/lib/postgresql/data'],
        restart: 'unless-stopped' as const
      },
      mysql: {
        image: 'mysql:8-oracle',
        environment: {
          MYSQL_DATABASE: 'foxapp',
          MYSQL_USER: 'foxuser',
          MYSQL_PASSWORD: 'foxpass',
          MYSQL_ROOT_PASSWORD: 'rootpass'
        },
        ports: isDev ? ['3306:3306'] : undefined,
        volumes: isDev ? undefined : ['mysql_data:/var/lib/mysql'],
        restart: 'unless-stopped' as const
      },
      mongodb: {
        image: 'mongo:6-jammy',
        environment: {
          MONGO_INITDB_DATABASE: 'foxapp',
          MONGO_INITDB_ROOT_USERNAME: 'foxuser',
          MONGO_INITDB_ROOT_PASSWORD: 'foxpass'
        },
        ports: isDev ? ['27017:27017'] : undefined,
        volumes: isDev ? undefined : ['mongo_data:/data/db'],
        restart: 'unless-stopped' as const
      }
    };

    return configs[dbType as keyof typeof configs] || configs.postgresql;
  }

  /**
   * Get volumes configuration
   */
  private getVolumes(context: DockerGeneratorContext, isDev: boolean): Record<string, VolumeConfig> {
    if (isDev) return {};

    const volumes: Record<string, VolumeConfig> = {};

    if (this.hasDatabase(context)) {
      const dbType = this.getDatabaseType(context);
      volumes[`${dbType}_data`] = { driver: 'local' };
    }

    if (this.hasRedis(context)) {
      volumes.redis_data = { driver: 'local' };
    }

    return volumes;
  }

  /**
   * Get service dependencies
   */
  private getDependencies(context: DockerGeneratorContext): string[] {
    const deps: string[] = [];
    
    if (this.hasDatabase(context)) {
      deps.push(this.getDatabaseType(context));
    }
    
    if (this.hasRedis(context)) {
      deps.push('redis');
    }
    
    return deps;
  }

  /**
   * Get application name
   */
  private getAppName(context: DockerGeneratorContext): string {
    const packageJson = this.readPackageJson(context.projectRoot);
    return packageJson.name || 'fox-app';
  }

  /**
   * Check if project has database
   */
  private hasDatabase(context: DockerGeneratorContext): boolean {
    // Check for database dependencies in package.json
    const packageJson = this.readPackageJson(context.projectRoot);
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    return !!(deps?.pg || deps?.mysql2 || deps?.mongodb || deps?.sqlite3);
  }

  /**
   * Get database type
   */
  private getDatabaseType(context: DockerGeneratorContext): string {
    const packageJson = this.readPackageJson(context.projectRoot);
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps?.pg) return 'postgresql';
    if (deps?.mysql2) return 'mysql';
    if (deps?.mongodb) return 'mongodb';
    return 'postgresql'; // default
  }

  /**
   * Check if project has Redis
   */
  private hasRedis(context: DockerGeneratorContext): boolean {
    const packageJson = this.readPackageJson(context.projectRoot);
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    return !!(deps?.redis || deps?.ioredis);
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
