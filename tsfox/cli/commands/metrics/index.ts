// tsfox/cli/commands/metrics/index.ts
import { CommandInterface } from '../../interfaces/cli.interface';
import { MetricsStartCommand } from './start.command';
import { MetricsExportCommand } from './export.command';
import { MetricsViewCommand } from './view.command';

export const MetricsCommands: CommandInterface[] = [
  MetricsStartCommand,
  MetricsExportCommand,
  MetricsViewCommand
];
