// tsfox/cli/commands/project/index.ts
import { CommandInterface } from '../../interfaces/cli.interface';
import { NewProjectCommand } from './new.command';

export const ProjectCommands: CommandInterface[] = [
  NewProjectCommand
];
