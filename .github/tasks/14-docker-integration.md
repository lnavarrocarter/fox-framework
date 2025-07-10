# 📋 Task #14: Integración con Docker

## 🎯 Objetivo

Implementar integración completa con Docker incluyendo generación automática de Dockerfiles, docker-compose, multi-stage builds, optimización de imágenes, y herramientas de desarrollo con containers.

## 📋 Criterios de Aceptación

### Core Docker Features

- [ ] **Dockerfile Generation**: Generación automática de Dockerfiles optimizados
- [ ] **Multi-stage Builds**: Builds eficientes con múltiples etapas
- [ ] **Docker Compose**: Orchestración local con docker-compose
- [ ] **Development Mode**: Containers de desarrollo con hot reload
- [ ] **Production Builds**: Imágenes optimizadas para producción
- [ ] **Health Checks**: Health checks integrados en containers
- [ ] **Security**: Scanning de vulnerabilidades y best practices

### Development Experience

- [ ] **CLI Commands**: Comandos Docker integrados en Fox CLI
- [ ] **Live Reload**: Desarrollo con hot reload en containers
- [ ] **Database Integration**: Containers para bases de datos de desarrollo
- [ ] **Environment Management**: Gestión de variables de entorno
- [ ] **Debugging**: Debugging en containers
- [ ] **Testing**: Ejecución de tests en containers aislados

### Production Features

- [ ] **Image Optimization**: Imágenes mínimas y optimizadas
- [ ] **Registry Integration**: Push/pull desde registries
- [ ] **Secrets Management**: Gestión segura de secrets
- [ ] **Monitoring**: Integración con sistemas de monitoreo
- [ ] **Scaling**: Configuración para scaling horizontal

## 🏗️ Arquitectura Propuesta

### Estructura de Archivos

```text
tsfox/cli/commands/docker/
├── docker.commands.ts            # Comandos Docker principales
├── dockerfile.generator.ts       # Generador de Dockerfiles
├── compose.generator.ts          # Generador docker-compose
├── image.optimizer.ts            # Optimización de imágenes
└── container.manager.ts          # Gestión de containers

tsfox/templates/docker/
├── dockerfile/
│   ├── node.alpine.hbs           # Dockerfile Alpine
│   ├── node.ubuntu.hbs           # Dockerfile Ubuntu
│   └── multistage.hbs            # Multi-stage build
├── compose/
│   ├── development.yml.hbs       # Compose para desarrollo
│   ├── production.yml.hbs        # Compose para producción
│   └── testing.yml.hbs           # Compose para testing
└── nginx/
    ├── nginx.conf.hbs            # Nginx config
    └── ssl.conf.hbs              # SSL config
```

### Interfaces Principales

```typescript
// docker.interface.ts
export interface DockerConfigInterface {
  dockerfile: DockerfileConfig;
  compose: ComposeConfig;
  registry?: RegistryConfig;
  build: BuildConfig;
  development: DevConfig;
}

export interface DockerfileConfig {
  baseImage: string;
  nodeVersion: string;
  workdir: string;
  port: number;
  healthCheck?: HealthCheckConfig;
  user?: string;
  environment?: Record<string, string>;
  volumes?: VolumeMount[];
}

export interface ComposeConfig {
  version: string;
  services: Record<string, ServiceConfig>;
  networks?: Record<string, NetworkConfig>;
  volumes?: Record<string, VolumeConfig>;
}

export interface BuildConfig {
  context: string;
  target?: string;
  args?: Record<string, string>;
  cache?: boolean;
  platform?: string;
}
```

### Tipos y Configuración

```typescript
// docker.types.ts
export interface ServiceConfig {
  image?: string;
  build?: BuildConfig;
  ports?: string[];
  environment?: Record<string, string>;
  volumes?: string[];
  depends_on?: string[];
  healthcheck?: HealthCheckConfig;
  restart?: RestartPolicy;
  networks?: string[];
}

export interface HealthCheckConfig {
  test: string | string[];
  interval: string;
  timeout: string;
  retries: number;
  start_period?: string;
}

export interface VolumeMount {
  source: string;
  target: string;
  type?: 'bind' | 'volume' | 'tmpfs';
  readonly?: boolean;
}

export type RestartPolicy = 'no' | 'always' | 'unless-stopped' | 'on-failure';

export interface RegistryConfig {
  url: string;
  username?: string;
  password?: string;
  namespace?: string;
}

export interface ImageInfo {
  name: string;
  tag: string;
  size: number;
  layers: number;
  vulnerabilities?: VulnerabilityReport[];
}

export interface DevConfig {
  volumes: string[];
  environment: Record<string, string>;
  ports: string[];
  command?: string;
}
```

## 💻 Ejemplos de Implementación

### Dockerfile Generator

```typescript
// dockerfile.generator.ts
export class DockerfileGenerator extends BaseGenerator {
  name = 'dockerfile';
  description = 'Generate optimized Dockerfiles';

  async generate(context: GeneratorContext): Promise<GeneratedFile[]> {
    const { options, projectRoot } = context;
    const config = this.getDockerConfig(context);

    // Generate Dockerfile
    const dockerfile = await this.generateDockerfile(config, options);
    const dockerfilePath = path.join(projectRoot, 'Dockerfile');

    // Generate .dockerignore
    const dockerignore = await this.generateDockerignore();
    const dockerignorePath = path.join(projectRoot, '.dockerignore');

    // Generate multi-stage Dockerfile if requested
    const files: GeneratedFile[] = [
      {
        path: dockerfilePath,
        content: dockerfile,
        action: 'create'
      },
      {
        path: dockerignorePath,
        content: dockerignore,
        action: 'create'
      }
    ];

    if (options.multistage) {
      const multistageDockerfile = await this.generateMultistageDockerfile(config, options);
      files.push({
        path: path.join(projectRoot, 'Dockerfile.multistage'),
        content: multistageDockerfile,
        action: 'create'
      });
    }

    return files;
  }

  private async generateDockerfile(
    config: DockerfileConfig, 
    options: any
  ): Promise<string> {
    const templateName = this.getDockerfileTemplate(options);
    
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

  private async generateMultistageDockerfile(
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

    return this.renderTemplate('multistage.hbs', variables);
  }

  private async generateDockerignore(): Promise<string> {
    return `
# Dependencies
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

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# Tests
coverage/
.nyc_output/

# Misc
README.md
LICENSE
docs/
`.trim();
  }

  private getDockerfileTemplate(options: any): string {
    if (options.alpine) {
      return 'node.alpine.hbs';
    }
    return 'node.ubuntu.hbs';
  }

  private getDockerConfig(context: GeneratorContext): DockerfileConfig {
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
}
```

### Docker Compose Generator

```typescript
// compose.generator.ts
export class ComposeGenerator extends BaseGenerator {
  name = 'compose';
  description = 'Generate docker-compose configurations';

  async generate(context: GeneratorContext): Promise<GeneratedFile[]> {
    const { options, projectRoot } = context;
    const files: GeneratedFile[] = [];

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

  private async generateDevelopmentCompose(context: GeneratorContext): Promise<string> {
    const config = this.getComposeConfig(context, 'development');
    
    const variables = {
      appName: this.getAppName(context),
      services: config.services,
      networks: config.networks || {},
      volumes: config.volumes || {},
      hasDatabase: this.hasDatabase(context),
      hasRedis: this.hasRedis(context),
      hasNginx: context.options.nginx || false
    };

    return this.renderTemplate('development.yml.hbs', variables);
  }

  private async generateProductionCompose(context: GeneratorContext): Promise<string> {
    const config = this.getComposeConfig(context, 'production');
    
    const variables = {
      appName: this.getAppName(context),
      services: config.services,
      networks: config.networks || {},
      volumes: config.volumes || {},
      hasDatabase: this.hasDatabase(context),
      hasRedis: this.hasRedis(context),
      hasNginx: true, // Always include nginx in production
      ssl: context.options.ssl || false
    };

    return this.renderTemplate('production.yml.hbs', variables);
  }

  private getComposeConfig(context: GeneratorContext, environment: string): ComposeConfig {
    const appName = this.getAppName(context);
    const isDev = environment === 'development';

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
        healthcheck: {
          test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
          interval: '30s',
          timeout: '10s',
          retries: 3
        },
        restart: isDev ? 'unless-stopped' : 'always'
      }
    };

    // Add database service
    if (this.hasDatabase(context)) {
      const dbType = this.getDatabaseType(context);
      services[dbType] = this.getDatabaseService(dbType, isDev);
    }

    // Add Redis service
    if (this.hasRedis(context)) {
      services.redis = {
        image: 'redis:alpine',
        ports: isDev ? ['6379:6379'] : undefined,
        volumes: isDev ? undefined : ['redis_data:/data'],
        restart: 'unless-stopped'
      };
    }

    // Add Nginx service for production
    if (!isDev || context.options.nginx) {
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
      volumes: this.getVolumes(context, isDev)
    };
  }

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
        restart: 'unless-stopped'
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
        restart: 'unless-stopped'
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
        restart: 'unless-stopped'
      }
    };

    return configs[dbType as keyof typeof configs] || configs.postgresql;
  }

  private getVolumes(context: GeneratorContext, isDev: boolean): Record<string, VolumeConfig> {
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
}

interface VolumeConfig {
  driver: string;
  driver_opts?: Record<string, string>;
}

interface NetworkConfig {
  driver: string;
  ipam?: {
    config: Array<{ subnet: string }>;
  };
}
```

### Docker CLI Commands

```typescript
// docker.commands.ts
export const DockerCommands = {
  init: {
    command: 'docker:init',
    description: 'Initialize Docker configuration for the project',
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
      }
    ],

    async action(args: any, options: any, context: any) {
      console.log('Initializing Docker configuration...');

      // Generate Dockerfile
      const dockerfileGenerator = new DockerfileGenerator(context.templateManager);
      await dockerfileGenerator.generate({
        name: 'docker',
        options,
        projectRoot: process.cwd(),
        config: context.config,
        templates: context.templateManager
      });

      // Generate docker-compose
      const composeGenerator = new ComposeGenerator(context.templateManager);
      await composeGenerator.generate({
        name: 'compose',
        options: { ...options, development: true, production: options.production },
        projectRoot: process.cwd(),
        config: context.config,
        templates: context.templateManager
      });

      // Generate nginx config if requested
      if (options.nginx) {
        await this.generateNginxConfig(options);
      }

      console.log('✅ Docker configuration generated successfully!');
      console.log('\nNext steps:');
      console.log('  docker-compose -f docker-compose.dev.yml up');
      console.log('  tsfox docker:build');
    }
  },

  build: {
    command: 'docker:build [tag]',
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
      }
    ],

    async action(args: any, options: any, context: any) {
      const packageJson = JSON.parse(
        await fs.promises.readFile('package.json', 'utf8')
      );
      
      const tag = args.tag || `${packageJson.name}:${packageJson.version}`;
      
      console.log(`Building Docker image: ${tag}`);

      const buildArgs = [
        'docker', 'build',
        '-t', tag,
        options.platform ? `--platform=${options.platform}` : '',
        options.noCache ? '--no-cache' : '',
        '.'
      ].filter(Boolean);

      const { execAsync } = require('../../utils/exec.utils');
      await execAsync(buildArgs.join(' '));

      if (options.push) {
        console.log(`Pushing image: ${tag}`);
        await execAsync(`docker push ${tag}`);
      }

      console.log('✅ Docker image built successfully!');
    }
  },

  run: {
    command: 'docker:run',
    description: 'Run the application in Docker',
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
      }
    ],

    async action(args: any, options: any, context: any) {
      const packageJson = JSON.parse(
        await fs.promises.readFile('package.json', 'utf8')
      );
      
      const imageName = packageJson.name;
      
      const runArgs = [
        'docker', 'run',
        options.detach ? '-d' : '--rm',
        '-p', options.port,
        options.envFile ? `--env-file=${options.envFile}` : '',
        imageName
      ].filter(Boolean);

      const { execAsync } = require('../../utils/exec.utils');
      await execAsync(runArgs.join(' '));

      if (!options.detach) {
        console.log('Container stopped.');
      } else {
        console.log('Container started in detached mode.');
      }
    }
  },

  compose: {
    command: 'docker:compose <action>',
    description: 'Run docker-compose commands',
    arguments: [
      {
        name: 'action',
        description: 'Compose action (up, down, logs, etc.)',
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
      }
    ],

    async action(args: any, options: any, context: any) {
      const composeArgs = [
        'docker-compose',
        '-f', options.file,
        args.action,
        options.detach && args.action === 'up' ? '-d' : ''
      ].filter(Boolean);

      const { execAsync } = require('../../utils/exec.utils');
      await execAsync(composeArgs.join(' '));
    }
  },

  logs: {
    command: 'docker:logs [service]',
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
      }
    ],

    async action(args: any, options: any, context: any) {
      const logArgs = [
        'docker-compose', 'logs',
        options.follow ? '-f' : '',
        `--tail=${options.tail}`,
        args.service || ''
      ].filter(Boolean);

      const { execAsync } = require('../../utils/exec.utils');
      await execAsync(logArgs.join(' '));
    }
  }
};
```

## 🧪 Plan de Testing

### Tests Unitarios

```typescript
// __tests__/docker/dockerfile.generator.test.ts
describe('DockerfileGenerator', () => {
  let generator: DockerfileGenerator;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'docker-test-'));
    generator = new DockerfileGenerator(new TemplateManager());
  });

  afterEach(async () => {
    await fs.promises.rmdir(tempDir, { recursive: true });
  });

  test('should generate basic Dockerfile', async () => {
    const context: GeneratorContext = {
      name: 'docker',
      options: { alpine: true },
      projectRoot: tempDir,
      config: {} as ProjectConfig,
      templates: new TemplateManager()
    };

    const files = await generator.generate(context);

    expect(files).toHaveLength(2); // Dockerfile + .dockerignore
    
    const dockerfile = files.find(f => f.path.endsWith('Dockerfile'));
    expect(dockerfile).toBeDefined();
    expect(dockerfile!.content).toContain('FROM node:');
    expect(dockerfile!.content).toContain('WORKDIR /app');
    expect(dockerfile!.content).toContain('EXPOSE 3000');
  });

  test('should generate multi-stage Dockerfile', async () => {
    const context: GeneratorContext = {
      name: 'docker',
      options: { multistage: true },
      projectRoot: tempDir,
      config: {} as ProjectConfig,
      templates: new TemplateManager()
    };

    const files = await generator.generate(context);

    const multistageFile = files.find(f => f.path.endsWith('Dockerfile.multistage'));
    expect(multistageFile).toBeDefined();
    expect(multistageFile!.content).toContain('FROM node:');
    expect(multistageFile!.content).toContain('AS builder');
    expect(multistageFile!.content).toContain('AS production');
  });
});
```

### Integration Tests

```typescript
// __tests__/docker/integration.test.ts
describe('Docker Integration', () => {
  test('should build and run Docker container', async () => {
    const projectDir = path.join(__dirname, 'fixtures/sample-project');
    
    // Generate Docker configuration
    await execAsync('tsfox docker:init --alpine --multistage', {
      cwd: projectDir
    });

    // Verify files were created
    expect(fs.existsSync(path.join(projectDir, 'Dockerfile'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'docker-compose.dev.yml'))).toBe(true);

    // Build image
    await execAsync('tsfox docker:build test-image', {
      cwd: projectDir
    });

    // Verify image was built
    const { stdout } = await execAsync('docker images test-image');
    expect(stdout).toContain('test-image');

    // Cleanup
    await execAsync('docker rmi test-image');
  }, 60000); // Increase timeout for Docker operations
});
```

## ✅ Definition of Done

- [ ] Dockerfile generator con multi-stage builds
- [ ] Docker-compose generator para dev/prod/test
- [ ] CLI commands para Docker operations
- [ ] Development mode con hot reload
- [ ] Production builds optimizados
- [ ] Health checks integrados
- [ ] Nginx configuration generator
- [ ] Image optimization implementado
- [ ] Tests unitarios e integración >90% cobertura
- [ ] Documentation completa de Docker

## 🔗 Dependencias

### Precedentes

- [12-cli-improvements.md](./12-cli-improvements.md) - Para comandos CLI
- [13-microservices-support.md](./13-microservices-support.md) - Para containers de microservicios

### Dependientes

- [16-cloud-deployment.md](./16-cloud-deployment.md) - Para deployment en cloud

## 📅 Estimación

**Tiempo estimado**: 6-7 días  
**Complejidad**: Media-Alta  
**Prioridad**: Importante

## 📊 Métricas de Éxito

- Dockerfile generation time <5s
- Image build time <2min para proyectos típicos
- Production image size <100MB
- Zero security vulnerabilities en images
- Development setup time <30s
