// tsfox/cli/commands/generate/index.ts
import { CommandInterface } from '../../interfaces/cli.interface';
import { ControllerCommand } from './controller.command';
import { ModelCommand } from './model.command';
import { MiddlewareCommand } from './middleware.command';
import { ServiceCommand } from './service.command';

export const GenerateCommands: CommandInterface[] = [
  ControllerCommand,
  ModelCommand,
  MiddlewareCommand,
  ServiceCommand
];
