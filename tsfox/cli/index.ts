// src/cli/index.ts
import { Command } from 'commander';
import { generateController, generateModel, generateView } from './generators';

const program = new Command();

program
    .version('1.0.0')
    .description('Fox Framework CLI');

program
    .command('generate:controller <name>')
    .description('Generate a new controller')
    .action((name) => {
        generateController(name);
    });

program
    .command('generate:model <name>')
    .description('Generate a new model')
    .action((name) => {
        generateModel(name);
    });

program
    .command('generate:view <name>')
    .description('Generate a new view')
    .action((name) => {
        generateView(name);
    });

program.parse(process.argv);
