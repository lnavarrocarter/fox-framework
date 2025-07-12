#!/usr/bin/env node
// tsfox/cli/cli.ts - New Fox Framework CLI

import { Command } from 'commander';
import { CommandManager } from './core/command.manager';
import { ConfigManager } from './core/config.manager';
import { PromptManager } from './core/prompt.manager';

// Import command groups
import { GenerateCommands } from './commands/generate';
import { DockerCommands } from './commands/docker';

export class FoxCLI {
  private program: Command;
  private commandManager: CommandManager;
  private configManager: ConfigManager;
  private promptManager: PromptManager;

  constructor() {
    this.program = new Command();
    this.commandManager = new CommandManager();
    this.configManager = new ConfigManager();
    this.promptManager = new PromptManager();
    
    this.setupProgram();
    this.registerCommands();
  }

  private setupProgram(): void {
    this.program
      .name('tsfox')
      .description('Fox Framework CLI - Build modern TypeScript applications')
      .version(this.getVersion())
      .option('-v, --verbose', 'Verbose output')
      .option('-q, --quiet', 'Quiet mode')
      .option('--no-color', 'Disable colored output')
      .hook('preAction', this.preActionHook.bind(this));
  }

  private  registerCommands(): void {
    // Generate commands
    const generateCommand = this.program
      .command('generate')
      .alias('g')
      .description('Generate code components');

    this.commandManager.registerCommands(generateCommand, GenerateCommands);

    // Docker commands
    const dockerCommand = this.program
      .command('docker')
      .alias('d')
      .description('Docker operations');

    this.commandManager.registerCommands(dockerCommand, DockerCommands);

    // TODO: Add other command groups
    // - Project commands (new, init, upgrade)
    // - Development commands (serve, build, watch, test)
    // - Database commands (migrate, seed, schema)
    // - Deploy commands (cloud, ci)
  }

  private async preActionHook(thisCommand: Command): Promise<void> {
    try {
      // Load project config if available
      const config = await this.configManager.loadProjectConfig();
      
      // Set global context
      (global as any).foxCLI = {
        config,
        verbose: thisCommand.opts().verbose,
        quiet: thisCommand.opts().quiet,
        noColor: thisCommand.opts().noColor
      };
    } catch (error) {
      // Silently ignore config loading errors
      if (thisCommand.opts().verbose) {
        console.warn('Warning: Could not load project config');
      }
    }
  }

  async run(argv: string[] = process.argv): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      this.handleError(error);
      process.exit(1);
    }
  }

  private handleError(error: any): void {
    const globalContext = (global as any).foxCLI;
    
    if (globalContext?.verbose) {
      console.error('\n❌ Error Details:');
      console.error(error);
    } else {
      console.error(`\n❌ Error: ${error.message}`);
      console.error('Run with --verbose for more details');
    }
  }

  private getVersion(): string {
    try {
      // Load version from package.json
      const packagePath = require.resolve('../../package.json');
      const packageJson = require(packagePath);
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }
}

// Bootstrap CLI if this file is run directly
if (require.main === module) {
  const cli = new FoxCLI();
  cli.run().catch(() => process.exit(1));
}

export default FoxCLI;
