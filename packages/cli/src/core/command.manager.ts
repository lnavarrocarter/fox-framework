// tsfox/cli/core/command.manager.ts
import { Command } from 'commander';
import { CommandInterface, CLIContext } from '../interfaces/cli.interface';

export class CommandManager {
  private commands: Map<string, CommandInterface> = new Map();

  /**
   * Register a command with the command manager
   */
  registerCommand(command: CommandInterface): void {
    this.commands.set(command.name, command);
  }

  /**
   * Register multiple commands on a parent command
   */
  registerCommands(parentCommand: Command, commands: CommandInterface[]): void {
    commands.forEach(commandDef => {
      const command = parentCommand
        .command(commandDef.name)
        .description(commandDef.description);

      // Add aliases
      if (commandDef.aliases) {
        commandDef.aliases.forEach(alias => command.alias(alias));
      }

      // Add options
      if (commandDef.options) {
        commandDef.options.forEach(option => {
          const optionString = this.buildOptionString(option);
          command.option(optionString, option.description, option.default);
        });
      }

      // Add arguments
      if (commandDef.arguments) {
        commandDef.arguments.forEach(arg => {
          const argString = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
          command.argument(argString, arg.description);
        });
      }

      // Set action
      command.action(async (...args) => {
        try {
          // Extract arguments and options
          const commandArgs = this.extractArguments(args, commandDef);
          const options = args[args.length - 2]; // Options are second to last
          const parentCmd = args[args.length - 1]; // Command instance is last
          const parentOptions = parentCmd.parent?.opts() || {}; // Parent options

          // Create CLI context
          const context: CLIContext = {
            command: commandDef,
            projectRoot: process.cwd(),
            verbose: parentOptions.verbose || false,
            quiet: parentOptions.quiet || false,
            noColor: parentOptions.noColor || false
          };

          // Validate if validator exists
          if (commandDef.validate) {
            const validation = commandDef.validate(commandArgs, options);
            if (!validation.valid) {
              console.error(`Validation failed: ${validation.message}`);
              process.exit(1);
            }
          }

          // Execute command
          await commandDef.action(commandArgs, options, context);
        } catch (error) {
          this.handleError(error, args[args.length - 1].parent?.opts() || {});
        }
      });

      this.registerCommand(commandDef);
    });
  }

  /**
   * Build option string for commander
   */
  private buildOptionString(option: any): string {
    let optionStr = '';
    
    if (option.alias) {
      optionStr += `-${option.alias}, `;
    }
    
    optionStr += `--${option.name}`;
    
    if (option.type && option.type !== 'boolean') {
      optionStr += ` <${option.name}>`;
    }

    return optionStr;
  }

  /**
   * Extract arguments from commander args
   */
  private extractArguments(args: any[], commandDef: CommandInterface): Record<string, any> {
    const result: Record<string, any> = {};
    
    if (commandDef.arguments) {
      commandDef.arguments.forEach((argDef, index) => {
        if (index < args.length - 2) {
          result[argDef.name] = args[index];
        }
      });
    }

    return result;
  }

  /**
   * Handle command errors
   */
  private handleError(error: any, options: any): void {
    if (options?.verbose) {
      console.error(error);
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }

  /**
   * Get registered command
   */
  getCommand(name: string): CommandInterface | undefined {
    return this.commands.get(name);
  }

  /**
   * Get all registered commands
   */
  getAllCommands(): CommandInterface[] {
    return Array.from(this.commands.values());
  }
}
