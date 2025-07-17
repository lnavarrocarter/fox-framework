#!/usr/bin/env node

// src/cli/index.ts
import { Command } from 'commander';
import { generateController, generateModel, generateView } from './generators';
import { DockerCommands } from './commands/docker';

const program = new Command();

program
    .version('1.0.0')
    .description('Fox Framework CLI');

program
    .command('generate:controller <n>')
    .description('Generate a new controller')
    .action((name: string) => {
        generateController(name);
    });

program
    .command('generate:model <n>')
    .description('Generate a new model')
    .action((name: string) => {
        generateModel(name);
    });

program
    .command('generate:view <n>')
    .description('Generate a new view')
    .action((name: string) => {
        generateView(name);
    });

// Add new project command
program
    .command('new <name>')
    .description('Create a new Fox Framework project')
    .option('-t, --template <template>', 'Project template (basic, api, full)', 'basic')
    .action(async (projectName: string, options: { template?: string }) => {
        const { generateNewProject } = await import('./generators');
        await generateNewProject(projectName, options.template || 'basic');
    });

// Add Docker commands
const dockerCmd = program
    .command('docker')
    .description('Docker integration commands');

// Register all Docker commands
DockerCommands.forEach(dockerCommand => {
    const cmd = dockerCmd
        .command(dockerCommand.name)
        .description(dockerCommand.description);
    
    // Add action
    cmd.action(async (options: any) => {
        try {
            const context = {
                command: dockerCommand,
                projectRoot: process.cwd(),
                verbose: options.verbose || false,
                quiet: options.quiet || false,
                noColor: options.noColor || false
            };
            await dockerCommand.action([], options, context);
        } catch (error) {
            console.error(`Error executing ${dockerCommand.name}:`, error);
            process.exit(1);
        }
    });
});

// Only run if this is the main module
if (require.main === module) {
    program.parse(process.argv);
}

export { program };
