// tsfox/cli/project-generator.ts
// Generates a complete Fox Framework project from a ProjectConfig
import fs from 'fs';
import path from 'path';
import { ProjectConfig, buildDependencies, installCmd, devCmd } from './commands/project/wizard';

// ── helpers ───────────────────────────────────────────────────────────────────

function write(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.trimStart(), 'utf8');
}

function mkdir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

// ── file content builders per project type ───────────────────────────────────

function serverIndex(cfg: ProjectConfig): string {
  const { name, projectType } = cfg;

  if (projectType === 'serverless') {
    return `// src/handler.ts — Fox Framework serverless entry point
import { LambdaAdapter } from '@foxframework/serverless';
import express, { Request, Response } from 'express';
import { FoxFactory } from '@foxframework/core';

const app = express();
const fox = new FoxFactory(app);

app.use(express.json());

fox.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to ${name}!', status: 'ok' });
});

// Export Lambda handler
export const handler = LambdaAdapter.create(app);

// Local dev fallback
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(\`🦊 ${name} running on port \${PORT}\`));
}
`;
  }

  if (projectType === 'basic') {
    return `// src/server/index.ts
import express from 'express';
import { FoxFactory } from '@foxframework/core';

const app = express();
const fox = new FoxFactory(app);

app.use(express.json());

fox.get('/', (_req, res) => {
  res.json({ message: 'Welcome to ${name}!' });
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(\`🦊 ${name} running on http://localhost:\${PORT}\`);
});

export default app;
`;
  }

  if (projectType === 'fullstack') {
    return `// src/server/index.ts
import express from 'express';
import { engine } from 'express-handlebars';
import path from 'path';
import { FoxFactory } from '@foxframework/core';
import { router } from '../routes';

const app = express();

// View engine
app.engine('hbs', engine({ extname: '.hbs', defaultLayout: 'main' }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '../views'));

// Static assets
app.use(express.static(path.join(__dirname, '../../public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', router);

const fox = new FoxFactory(app);
fox.get('/api', (_req, res) => res.json({ status: 'ok' }));

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(\`🦊 ${name} running on http://localhost:\${PORT}\`);
});

export default app;
`;
  }

  // api | microservice
  return `// src/server/index.ts
import express from 'express';
import { FoxFactory } from '@foxframework/core';
import { router } from '../routes';
import { errorMiddleware } from '../middleware/error.middleware';
import { config } from '../config';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', router);

// Error handler (must be last)
app.use(errorMiddleware);

const fox = new FoxFactory(app);
fox.get('/', (_req, res) => res.json({ name: '${name}', version: '1.0.0' }));

app.listen(config.port, () => {
  console.log(\`🦊 ${name} running on http://localhost:\${config.port}\`);
});

export default app;
`;
}

function routesIndex(cfg: ProjectConfig): string {
  const hasViews = cfg.projectType === 'fullstack';
  return `// src/routes/index.ts
import { Router } from 'express';
import { healthRouter } from './health.routes';
${hasViews ? "import { pagesRouter } from './pages.routes';\n" : ''}
export const router = Router();

router.use('/health', healthRouter);
${hasViews ? "router.use('/', pagesRouter);\n" : ''}
`;
}

function healthRoutes(): string {
  return `// src/routes/health.routes.ts
import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

export const healthRouter = Router();
const controller = new HealthController();

healthRouter.get('/', controller.check.bind(controller));
healthRouter.get('/ready', controller.ready.bind(controller));
`;
}

function healthController(): string {
  return `// src/controllers/health.controller.ts
import { Request, Response } from 'express';

export class HealthController {
  check(_req: Request, res: Response): void {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  ready(_req: Request, res: Response): void {
    res.json({ status: 'ready' });
  }
}
`;
}

function errorMiddleware(): string {
  return `// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = statusCode < 500 ? err.message : 'Internal server error';

  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}
`;
}

function configFile(cfg: ProjectConfig): string {
  return `// src/config/index.ts
export const config = {
  env:  process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  ${cfg.database !== 'none' ? `
  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    name:     process.env.DB_NAME     || '${cfg.name.replace(/-/g, '_')}',
  },` : ''}
  ${cfg.auth === 'jwt' ? `
  jwt: {
    secret:    process.env.JWT_SECRET    || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES   || '7d',
  },` : ''}
};
`;
}

function pagesRoutes(): string {
  return `// src/routes/pages.routes.ts
import { Router } from 'express';
import { PagesController } from '../controllers/pages.controller';

export const pagesRouter = Router();
const controller = new PagesController();

pagesRouter.get('/', controller.index.bind(controller));
`;
}

function pagesController(name: string): string {
  return `// src/controllers/pages.controller.ts
import { Request, Response } from 'express';

export class PagesController {
  index(_req: Request, res: Response): void {
    res.render('index', {
      title: '${name}',
      message: 'Welcome to ${name}!',
    });
  }
}
`;
}

function mainLayout(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{title}} | ${name}</title>
  <link rel="stylesheet" href="/css/styles.css" />
</head>
<body>
  {{{body}}}
  <script src="/js/app.js"></script>
</body>
</html>
`;
}

function indexView(): string {
  return `<main class="container">
  <h1>{{message}}</h1>
  <p>Built with 🦊 Fox Framework</p>
</main>
`;
}

function publicStyles(): string {
  return `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #333; }
.container { max-width: 960px; margin: 0 auto; padding: 2rem; }
h1 { font-size: 2rem; color: #e65100; margin-bottom: 1rem; }
`;
}

function envExample(cfg: ProjectConfig): string {
  const lines = [
    'NODE_ENV=development',
    `PORT=3000`,
  ];
  if (cfg.database !== 'none') {
    lines.push('', '# Database');
    lines.push('DB_HOST=localhost');
    lines.push('DB_PORT=5432');
    lines.push('DB_USER=admin');
    lines.push('DB_PASSWORD=secret');
    lines.push(`DB_NAME=${cfg.name.replace(/-/g, '_')}`);
  }
  if (cfg.auth === 'jwt') {
    lines.push('', '# JWT');
    lines.push('JWT_SECRET=change-me-in-production');
    lines.push('JWT_EXPIRES=7d');
  }
  if (cfg.auth === 'oauth') {
    lines.push('', '# OAuth');
    lines.push('OAUTH_CLIENT_ID=');
    lines.push('OAUTH_CLIENT_SECRET=');
    lines.push('OAUTH_CALLBACK_URL=http://localhost:3000/auth/callback');
  }
  return lines.join('\n') + '\n';
}

function dockerFile(cfg: ProjectConfig): string {
  return `# ── Build stage ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────────
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE ${cfg.projectType === 'serverless' ? 3000 : 3000}
USER node
CMD ["node", "dist/src/${cfg.projectType === 'serverless' ? 'handler' : 'server/index'}.js"]
`;
}

function dockerComposeFile(cfg: ProjectConfig): string {
  const hasDb = cfg.database !== 'none';
  const dbName = cfg.name.replace(/-/g, '_');

  const dbService: Record<string, string> = {
    postgres: `  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_DB: ${dbName}\n      POSTGRES_USER: admin\n      POSTGRES_PASSWORD: secret\n    ports:\n      - "5432:5432"\n    volumes:\n      - db_data:/var/lib/postgresql/data`,
    mysql:    `  db:\n    image: mysql:8\n    environment:\n      MYSQL_DATABASE: ${dbName}\n      MYSQL_USER: admin\n      MYSQL_PASSWORD: secret\n      MYSQL_ROOT_PASSWORD: rootsecret\n    ports:\n      - "3306:3306"\n    volumes:\n      - db_data:/var/lib/mysql`,
    sqlite:   '',
    mongo:    `  db:\n    image: mongo:7\n    ports:\n      - "27017:27017"\n    volumes:\n      - db_data:/data/db`,
    redis:    `  db:\n    image: redis:7-alpine\n    ports:\n      - "6379:6379"`,
    none:     '',
  };

  const dbDep = hasDb && cfg.database !== 'sqlite' ? '\n    depends_on:\n      - db' : '';
  const dbVol = hasDb && !['sqlite', 'redis'].includes(cfg.database) ? '\n\nvolumes:\n  db_data:' : '';

  return `version: '3.9'

services:
  app:
    build: .
    ports:
      - "\${PORT:-3000}:3000"
    env_file: .env${dbDep}
${hasDb && dbService[cfg.database] ? '\n' + dbService[cfg.database] : ''}${dbVol}
`;
}

function jestConfig(cfg: ProjectConfig): string {
  const entry = cfg.projectType === 'serverless' ? 'src/handler' : 'src/server/index';
  return `import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**'],
  globals: {
    'ts-jest': { tsconfig: 'tsconfig.json' },
  },
};

export default config;
`;
}

function healthTest(cfg: ProjectConfig): string {
  const base = cfg.projectType === 'serverless'
    ? "import { handler } from '../handler';"
    : "import app from '../server/index';";

  return `// src/__tests__/health.test.ts
import request from 'supertest';
${base}

describe('Health endpoint', () => {
  it('GET /api/health returns 200', async () => {
    const res = await request(${cfg.projectType === 'serverless' ? 'handler' : 'app'})
      .get('/api/health')
      .expect(200);

    expect(res.body).toHaveProperty('status', 'ok');
  });
});
`;
}

function readme(cfg: ProjectConfig): string {
  const pm = cfg.packageManager;
  const install = installCmd(pm);
  const dev = devCmd(pm);
  const run = pm === 'npm' ? 'npm run' : pm;

  return `# ${cfg.name}

${cfg.description}

## Stack

- **Type:** ${cfg.projectType}
- **Framework:** Fox Framework v1.4.0
${cfg.database !== 'none' ? `- **Database:** ${cfg.database} (@foxframework/db-${cfg.database})\n` : ''}\
${cfg.auth !== 'none' ? `- **Auth:** ${cfg.auth} (@foxframework/auth-${cfg.auth})\n` : ''}\
${cfg.includeTesting ? '- **Testing:** Jest + ts-jest + supertest\n' : ''}\
${cfg.includeDocker ? '- **Docker:** Dockerfile + docker-compose.yml\n' : ''}
## Getting Started

\`\`\`bash
# 1. Install dependencies
${install}

# 2. Copy env vars
cp .env.example .env

# 3. Start dev server
${dev}
\`\`\`

## Scripts

| Command | Description |
|---|---|
| \`${run} dev\` | Start development server with hot-reload |
| \`${run} build\` | Compile TypeScript → dist/ |
| \`${run} start\` | Start compiled production server |
${cfg.includeTesting ? `| \`${run} test\` | Run test suite |\n| \`${run} test:coverage\` | Run tests with coverage |\n` : ''}\

## CLI (in project directory)

\`\`\`bash
# Generate a controller
npx tsfox generate:controller UserController

# Generate a service
npx tsfox generate:service UserService
\`\`\`
${cfg.includeDocker ? `
## Docker

\`\`\`bash
docker-compose up --build
\`\`\`
` : ''}
`;
}

function packageJson(cfg: ProjectConfig): object {
  const { dependencies, devDependencies } = buildDependencies(cfg);
  const pm = cfg.packageManager;
  const runPrefix = pm === 'npm' ? 'npm run' : pm;
  const entry = cfg.projectType === 'serverless' ? 'dist/src/handler.js' : 'dist/src/server/index.js';
  const devEntry = cfg.projectType === 'serverless' ? 'src/handler.ts' : 'src/server/index.ts';

  return {
    name: cfg.name,
    version: '1.0.0',
    description: cfg.description,
    main: entry,
    scripts: {
      start: `node ${entry}`,
      dev: `nodemon --watch 'src/**/*.ts' --exec 'ts-node' ${devEntry}`,
      build: 'tsc',
      ...(cfg.includeTesting ? {
        test: 'jest --forceExit',
        'test:coverage': 'jest --coverage --forceExit',
      } : {}),
    },
    dependencies,
    devDependencies,
  };
}

function tsConfig(): object {
  return {
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      lib: ['ES2020'],
      outDir: './dist',
      rootDir: './',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', '**/*.test.ts'],
  };
}

// ── main generator ────────────────────────────────────────────────────────────

export async function generateProject(cfg: ProjectConfig): Promise<void> {
  const root = path.resolve(process.cwd(), cfg.name);

  if (fs.existsSync(root)) {
    console.error(`\n❌  Directory "${cfg.name}" already exists\n`);
    process.exit(1);
  }

  const ora = (await import('ora')).default;
  const spinner = ora(`Creating ${cfg.name}…`).start();

  try {
    mkdir(root);

    // ── package.json + tsconfig ──────────────────────────────────
    write(path.join(root, 'package.json'), JSON.stringify(packageJson(cfg), null, 2) + '\n');
    write(path.join(root, 'tsconfig.json'), JSON.stringify(tsConfig(), null, 2) + '\n');
    write(path.join(root, '.env.example'), envExample(cfg));
    write(path.join(root, '.gitignore'), 'node_modules/\ndist/\n.env\ncoverage/\n');

    // ── README ────────────────────────────────────────────────────
    write(path.join(root, 'README.md'), readme(cfg));

    // ── Jest config ───────────────────────────────────────────────
    if (cfg.includeTesting) {
      write(path.join(root, 'jest.config.ts'), jestConfig(cfg));
    }

    // ── Docker ───────────────────────────────────────────────────
    if (cfg.includeDocker) {
      write(path.join(root, 'Dockerfile'), dockerFile(cfg));
      write(path.join(root, 'docker-compose.yml'), dockerComposeFile(cfg));
      write(path.join(root, '.dockerignore'), 'node_modules/\ndist/\n.env\n');
    }

    // ── serverless ───────────────────────────────────────────────
    if (cfg.projectType === 'serverless') {
      write(path.join(root, 'src', 'handler.ts'), serverIndex(cfg));
      write(path.join(root, 'src', 'routes', 'index.ts'), `// src/routes/index.ts\nimport { Router } from 'express';\nexport const router = Router();\nrouter.get('/health', (_req, res) => res.json({ status: 'ok' }));\n`);
      if (cfg.includeTesting) {
        write(path.join(root, 'src', '__tests__', 'health.test.ts'), healthTest(cfg));
      }
      spinner.succeed(`Project "${cfg.name}" created!`);
      printNextSteps(cfg, root);
      return;
    }

    // ── basic ─────────────────────────────────────────────────────
    if (cfg.projectType === 'basic') {
      write(path.join(root, 'src', 'server', 'index.ts'), serverIndex(cfg));
      mkdir(path.join(root, 'src', 'controllers'));
      mkdir(path.join(root, 'src', 'routes'));
      if (cfg.includeTesting) {
        write(path.join(root, 'src', '__tests__', 'app.test.ts'),
          `import request from 'supertest';\nimport app from '../server/index';\n\ndescribe('App', () => {\n  it('GET / returns 200', async () => {\n    const res = await request(app).get('/').expect(200);\n    expect(res.body).toHaveProperty('message');\n  });\n});\n`);
      }
      spinner.succeed(`Project "${cfg.name}" created!`);
      printNextSteps(cfg, root);
      return;
    }

    // ── api | microservice | fullstack ────────────────────────────
    write(path.join(root, 'src', 'server', 'index.ts'), serverIndex(cfg));
    write(path.join(root, 'src', 'routes', 'index.ts'), routesIndex(cfg));
    write(path.join(root, 'src', 'routes', 'health.routes.ts'), healthRoutes());
    write(path.join(root, 'src', 'controllers', 'health.controller.ts'), healthController());
    write(path.join(root, 'src', 'middleware', 'error.middleware.ts'), errorMiddleware());
    write(path.join(root, 'src', 'config', 'index.ts'), configFile(cfg));

    // ── fullstack extras ──────────────────────────────────────────
    if (cfg.projectType === 'fullstack') {
      write(path.join(root, 'src', 'routes', 'pages.routes.ts'), pagesRoutes());
      write(path.join(root, 'src', 'controllers', 'pages.controller.ts'), pagesController(cfg.name));
      write(path.join(root, 'src', 'views', 'layouts', 'main.hbs'), mainLayout(cfg.name));
      write(path.join(root, 'src', 'views', 'index.hbs'), indexView());
      write(path.join(root, 'public', 'css', 'styles.css'), publicStyles());
      write(path.join(root, 'public', 'js', 'app.js'), '// public/js/app.js\n');
    }

    // ── services dir (api/fullstack) ──────────────────────────────
    if (cfg.projectType !== 'microservice') {
      mkdir(path.join(root, 'src', 'services'));
    }

    // ── tests ─────────────────────────────────────────────────────
    if (cfg.includeTesting) {
      write(path.join(root, 'src', '__tests__', 'health.test.ts'), healthTest(cfg));
    }

    spinner.succeed(`Project "${cfg.name}" created!`);
    printNextSteps(cfg, root);

  } catch (err) {
    spinner.fail('Failed to create project');
    console.error(err);
    process.exit(1);
  }
}

function printNextSteps(cfg: ProjectConfig, root: string): void {
  const rel = path.relative(process.cwd(), root);
  const pm = cfg.packageManager;

  console.log('\n📋  Next steps:\n');
  console.log(`   cd ${rel}`);
  console.log(`   ${installCmd(pm)}`);
  if (fs.existsSync(path.join(root, '.env.example'))) {
    console.log(`   cp .env.example .env`);
  }
  console.log(`   ${devCmd(pm)}`);
  if (cfg.includeDocker) {
    console.log(`\n   # Or with Docker:`);
    console.log(`   docker-compose up --build`);
  }
  console.log('\n🦊  Happy coding!\n');
}
