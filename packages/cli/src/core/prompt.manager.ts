// tsfox/cli/core/prompt.manager.ts
import inquirer from 'inquirer';
import { TemplateVariable } from '../interfaces/cli.interface';

export class PromptManager {
  /**
   * Prompt for template variables
   */
  async promptForVariables(variables: TemplateVariable[]): Promise<Record<string, any>> {
    const questions = variables.map(variable => this.createQuestion(variable));
    return await inquirer.prompt(questions);
  }

  /**
   * Confirm overwrite for existing files
   */
  async confirmOverwrite(filePath: string): Promise<boolean> {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `File ${filePath} already exists. Overwrite?`,
        default: false
      }
    ]);
    
    return overwrite;
  }

  /**
   * Select from choices
   */
  async selectFrom(
    message: string,
    choices: string[] | Array<{ name: string; value: any }>,
    defaultValue?: any
  ): Promise<any> {
    const { selection } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selection',
        message,
        choices,
        default: defaultValue
      }
    ]);

    return selection;
  }

  /**
   * Multi-select from choices
   */
  async multiSelectFrom(
    message: string,
    choices: string[] | Array<{ name: string; value: any }>,
    defaultValues?: any[]
  ): Promise<any[]> {
    const { selections } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selections',
        message,
        choices,
        default: defaultValues
      }
    ]);

    return selections;
  }

  /**
   * Get user input
   */
  async input(
    message: string,
    defaultValue?: string,
    validate?: (input: string) => boolean | string
  ): Promise<string> {
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message,
        default: defaultValue,
        validate
      }
    ]);

    return input;
  }

  /**
   * Get confirmation
   */
  async confirm(message: string, defaultValue = false): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: defaultValue
      }
    ]);

    return confirmed;
  }

  /**
   * Get password input
   */
  async password(message: string): Promise<string> {
    const { password } = await inquirer.prompt([
      {
        type: 'password',
        name: 'password',
        message
      }
    ]);

    return password;
  }

  /**
   * Create inquirer question from template variable
   */
  private createQuestion(variable: TemplateVariable): any {
    const question: any = {
      name: variable.name,
      message: variable.description,
      default: variable.default
    };

    switch (variable.type) {
      case 'string':
        question.type = 'input';
        if (variable.validate) {
          question.validate = variable.validate;
        }
        break;

      case 'number':
        question.type = 'number';
        if (variable.validate) {
          question.validate = variable.validate;
        }
        break;

      case 'boolean':
        question.type = 'confirm';
        break;

      case 'select':
        question.type = 'list';
        question.choices = variable.choices || [];
        break;

      case 'multiselect':
        question.type = 'checkbox';
        question.choices = variable.choices || [];
        break;

      default:
        question.type = 'input';
    }

    return question;
  }

  /**
   * Show progress indicator
   */
  async withProgress<T>(
    message: string,
    task: () => Promise<T>
  ): Promise<T> {
    const spinner = require('ora')(message).start();
    
    try {
      const result = await task();
      spinner.succeed();
      return result;
    } catch (error) {
      spinner.fail();
      throw error;
    }
  }

  /**
   * Show loading with multiple steps
   */
  async withSteps<T>(
    steps: Array<{ message: string; task: () => Promise<any> }>
  ): Promise<T[]> {
    const results: T[] = [];

    for (const step of steps) {
      const result = await this.withProgress(step.message, step.task);
      results.push(result);
    }

    return results;
  }
}
