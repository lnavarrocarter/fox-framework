// tsfox/cli/commands/project/wizard.ts
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';

export type ProjectType = 'basic' | 'api' | 'fullstack' | 'microservice' | 'serverless';
export type DatabaseChoice = 'none' | 'postgres' | 'mysql' | 'sqlite' | 'mongo' | 'redis';
export type AuthChoice = 'none' | 'jwt' | 'oauth';
export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export interface ProjectConfig {
  name: string;
  description: string;
  projectType: ProjectType;
  database: DatabaseChoice;
  auth: AuthChoice;
  includeDocker: boolean;
  includeTesting: boolean;
  packageManager: PackageManager;
}

const PROJECT_TYPE_DESCRIPTIONS: Record<ProjectType, string> = {
  basic:        'Basic web app — Express + FoxFactory, single route, zero boilerplate',
  api:          'REST API — Router, Controllers, Services, Health endpoint, Error middleware',
  fullstack:    'Full-stack — REST API + Handlebars views + static assets',
  microservice: 'Microservice — Lightweight API with health/readiness, Docker-ready',
  serverless:   'Serverless — AWS Lambda / Vercel / GCP via @foxframework/serverless',
};

const DB_PACKAGE: Record<DatabaseChoice, string | null> = {
  none:     null,
  postgres: '@foxframework/db-postgres',
  mysql:    '@foxframework/db-mysql',
  sqlite:   '@foxframework/db-sqlite',
  mongo:    '@foxframework/db-mongo',
  redis:    '@foxframework/db-redis',
};

const AUTH_PACKAGE: Record<AuthChoice, string | null> = {
  none:  null,
  jwt:   '@foxframework/auth-jwt',
  oauth: '@foxframework/auth-oauth',
};

export async function runProjectWizard(nameArg?: string): Promise<ProjectConfig> {
  console.log('\n🦊  Fox Framework — New Project\n');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: nameArg || 'my-fox-app',
      when: !nameArg,
      validate: (input: string) => {
        if (!input.trim()) return 'Project name cannot be empty';
        const targetDir = path.resolve(process.cwd(), input.trim());
        if (fs.existsSync(targetDir)) return `Directory "${input.trim()}" already exists`;
        return true;
      },
    },
    {
      type: 'list',
      name: 'projectType',
      message: 'What type of project do you want to create?',
      choices: (Object.keys(PROJECT_TYPE_DESCRIPTIONS) as ProjectType[]).map(t => ({
        name: `${t.padEnd(14)} — ${PROJECT_TYPE_DESCRIPTIONS[t]}`,
        value: t,
        short: t,
      })),
      default: 'api',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description (optional):',
      default: '',
    },
    {
      type: 'list',
      name: 'database',
      message: 'Database integration:',
      choices: [
        { name: 'None', value: 'none' },
        { name: 'PostgreSQL  (@foxframework/db-postgres)', value: 'postgres' },
        { name: 'MySQL       (@foxframework/db-mysql)',    value: 'mysql' },
        { name: 'SQLite      (@foxframework/db-sqlite)',   value: 'sqlite' },
        { name: 'MongoDB     (@foxframework/db-mongo)',    value: 'mongo' },
        { name: 'Redis       (@foxframework/db-redis)',    value: 'redis' },
      ],
      default: 'none',
      when: (a: any) => a.projectType !== 'serverless',
    },
    {
      type: 'list',
      name: 'auth',
      message: 'Authentication:',
      choices: [
        { name: 'None', value: 'none' },
        { name: 'JWT   (@foxframework/auth-jwt)',   value: 'jwt' },
        { name: 'OAuth (@foxframework/auth-oauth)', value: 'oauth' },
      ],
      default: 'none',
    },
    {
      type: 'confirm',
      name: 'includeTesting',
      message: 'Add Jest testing setup?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'includeDocker',
      message: 'Add Docker (Dockerfile + docker-compose)?',
      default: (a: any) => a.projectType === 'microservice',
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Package manager:',
      choices: ['npm', 'yarn', 'pnpm'],
      default: 'npm',
    },
  ]);

  const name: string = nameArg || answers.name;

  // Validate name if provided as arg (not prompted)
  if (nameArg) {
    const targetDir = path.resolve(process.cwd(), nameArg);
    if (fs.existsSync(targetDir)) {
      console.error(`\n❌  Directory "${nameArg}" already exists\n`);
      process.exit(1);
    }
  }

  const config: ProjectConfig = {
    name,
    description: answers.description || `${name} — A Fox Framework application`,
    projectType: answers.projectType,
    database: answers.database ?? 'none',
    auth: answers.auth ?? 'none',
    includeTesting: answers.includeTesting,
    includeDocker: answers.includeDocker,
    packageManager: answers.packageManager,
  };

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  console.log(`  Project:     ${config.name}`);
  console.log(`  Type:        ${config.projectType}`);
  if (config.description) console.log(`  Description: ${config.description}`);
  if (config.database !== 'none') console.log(`  Database:    ${config.database}`);
  if (config.auth     !== 'none') console.log(`  Auth:        ${config.auth}`);
  console.log(`  Testing:     ${config.includeTesting ? 'yes' : 'no'}`);
  console.log(`  Docker:      ${config.includeDocker  ? 'yes' : 'no'}`);
  console.log(`  Pkg manager: ${config.packageManager}`);
  console.log('─────────────────────────────────────────\n');

  const { confirmed } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmed',
    message: 'Create project with these settings?',
    default: true,
  }]);

  if (!confirmed) {
    console.log('\n🦊  Cancelled.\n');
    process.exit(0);
  }

  return config;
}

/** Build the package.json dependencies object for a given config */
export function buildDependencies(config: ProjectConfig): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const dependencies: Record<string, string> = {
    '@foxframework/core': '^1.4.0',
    'express': '^4.18.2',
  };

  const devDependencies: Record<string, string> = {
    '@types/express': '^4.17.21',
    '@types/node': '^20.10.4',
    'typescript': '^5.3.2',
    'nodemon': '^3.0.1',
    'ts-node': '^10.9.1',
  };

  // DB package
  const dbPkg = DB_PACKAGE[config.database];
  if (dbPkg) dependencies[dbPkg] = '^1.4.0';

  // Auth package
  const authPkg = AUTH_PACKAGE[config.auth];
  if (authPkg) dependencies[authPkg] = '^1.4.0';

  // Serverless adapter
  if (config.projectType === 'serverless') {
    dependencies['@foxframework/serverless'] = '^1.4.0';
  }

  // Handlebars for fullstack
  if (config.projectType === 'fullstack') {
    dependencies['express-handlebars'] = '^7.1.2';
    devDependencies['@types/express-handlebars'] = '^6.0.0';
  }

  // Testing
  if (config.includeTesting) {
    devDependencies['jest'] = '^29.7.0';
    devDependencies['@types/jest'] = '^29.5.8';
    devDependencies['ts-jest'] = '^29.1.1';
    devDependencies['supertest'] = '^6.3.3';
    devDependencies['@types/supertest'] = '^6.0.2';
  }

  return { dependencies, devDependencies };
}

/** Return install command for the chosen package manager */
export function installCmd(pm: PackageManager): string {
  if (pm === 'yarn') return 'yarn';
  if (pm === 'pnpm') return 'pnpm install';
  return 'npm install';
}

/** Return dev-run command for the chosen package manager */
export function devCmd(pm: PackageManager): string {
  if (pm === 'yarn') return 'yarn dev';
  if (pm === 'pnpm') return 'pnpm dev';
  return 'npm run dev';
}
