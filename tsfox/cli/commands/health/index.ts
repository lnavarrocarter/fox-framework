// tsfox/cli/commands/health/index.ts
import { CommandInterface } from '../../interfaces/cli.interface';
import { HealthInitCommand } from './init.command';
import { HealthCheckCommand } from './check.command';
import { HealthStatusCommand } from './status.command';

export const HealthCommands: CommandInterface[] = [
  HealthInitCommand,
  HealthCheckCommand,
  HealthStatusCommand
];
