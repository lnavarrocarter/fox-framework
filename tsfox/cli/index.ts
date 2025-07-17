#!/usr/bin/env node

// src/cli/index.ts
import { Command } from 'commander';
import { generateController, generateModel, generateView } from './generators';
import { DockerCommands } from './commands/docker';
import { HealthCommands } from './commands/health';
import { MetricsCommands } from './commands/metrics';
import { CacheCommands } from './commands/cache';
import { PerformanceCommands } from './commands/performance';

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

// Add Health commands
const healthCmd = program
    .command('health')
    .description('Health check system commands');

HealthCommands.forEach(healthCommand => {
    const cmd = healthCmd
        .command(healthCommand.name)
        .description(healthCommand.description);
    
    // Add options
    if (healthCommand.options) {
        healthCommand.options.forEach(option => {
            let optionStr = option.alias ? `-${option.alias}, --${option.name}` : `--${option.name}`;
            
            // Add value placeholder for non-boolean options
            if (option.type !== 'boolean') {
                optionStr += ' <value>';
            }
            
            if (option.choices) {
                cmd.option(optionStr, `${option.description} (choices: ${option.choices.join('|')})`, option.default);
            } else {
                cmd.option(optionStr, option.description, option.default);
            }
        });
    }
    
    cmd.action(async (options: any) => {
        try {
            const context = {
                command: healthCommand,
                projectRoot: process.cwd(),
                verbose: options.verbose || false,
                quiet: options.quiet || false,
                noColor: options.noColor || false
            };
            await healthCommand.action([], options, context);
        } catch (error) {
            console.error(`Error executing health ${healthCommand.name}:`, error);
            process.exit(1);
        }
    });
});

// Add Metrics commands
const metricsCmd = program
    .command('metrics')
    .description('Metrics collection and monitoring commands');

MetricsCommands.forEach(metricsCommand => {
    const cmd = metricsCmd
        .command(metricsCommand.name)
        .description(metricsCommand.description);
    
    // Add options
    if (metricsCommand.options) {
        metricsCommand.options.forEach(option => {
            let optionStr = option.alias ? `-${option.alias}, --${option.name}` : `--${option.name}`;
            
            // Add value placeholder for non-boolean options
            if (option.type !== 'boolean') {
                optionStr += ' <value>';
            }
            
            if (option.choices) {
                cmd.option(optionStr, `${option.description} (choices: ${option.choices.join('|')})`, option.default);
            } else {
                cmd.option(optionStr, option.description, option.default);
            }
        });
    }
    
    cmd.action(async (options: any) => {
        try {
            const context = {
                command: metricsCommand,
                projectRoot: process.cwd(),
                verbose: options.verbose || false,
                quiet: options.quiet || false,
                noColor: options.noColor || false
            };
            await metricsCommand.action([], options, context);
        } catch (error) {
            console.error(`Error executing metrics ${metricsCommand.name}:`, error);
            process.exit(1);
        }
    });
});

// Add Cache commands
const cacheCmd = program
    .command('cache')
    .description('Cache system management commands');

CacheCommands.forEach(cacheCommand => {
    const cmd = cacheCmd
        .command(cacheCommand.name)
        .description(cacheCommand.description);
    
    // Add options
    if (cacheCommand.options) {
        cacheCommand.options.forEach(option => {
            let optionStr = option.alias ? `-${option.alias}, --${option.name}` : `--${option.name}`;
            
            // Add value placeholder for non-boolean options
            if (option.type !== 'boolean') {
                optionStr += ' <value>';
            }
            
            if (option.choices) {
                cmd.option(optionStr, `${option.description} (choices: ${option.choices.join('|')})`, option.default);
            } else {
                cmd.option(optionStr, option.description, option.default);
            }
        });
    }
    
    cmd.action(async (options: any) => {
        try {
            const context = {
                command: cacheCommand,
                projectRoot: process.cwd(),
                verbose: options.verbose || false,
                quiet: options.quiet || false,
                noColor: options.noColor || false
            };
            await cacheCommand.action([], options, context);
        } catch (error) {
            console.error(`Error executing cache ${cacheCommand.name}:`, error);
            process.exit(1);
        }
    });
});

// Add Performance commands
const performanceCmd = program
    .command('performance')
    .description('Performance analysis and optimization commands');

PerformanceCommands.forEach(performanceCommand => {
    const cmd = performanceCmd
        .command(performanceCommand.name)
        .description(performanceCommand.description);
    
    // Add options
    if (performanceCommand.options) {
        performanceCommand.options.forEach(option => {
            let optionStr = option.alias ? `-${option.alias}, --${option.name}` : `--${option.name}`;
            
            // Add value placeholder for non-boolean options
            if (option.type !== 'boolean') {
                optionStr += ' <value>';
            }
            
            if (option.choices) {
                cmd.option(optionStr, `${option.description} (choices: ${option.choices.join('|')})`, option.default);
            } else {
                cmd.option(optionStr, option.description, option.default);
            }
        });
    }
    
    cmd.action(async (options: any) => {
        try {
            const context = {
                command: performanceCommand,
                projectRoot: process.cwd(),
                verbose: options.verbose || false,
                quiet: options.quiet || false,
                noColor: options.noColor || false
            };
            await performanceCommand.action([], options, context);
        } catch (error) {
            console.error(`Error executing performance ${performanceCommand.name}:`, error);
            process.exit(1);
        }
    });
});

// Only run if this is the main module
if (require.main === module) {
    program.parse(process.argv);
}

export { program };
