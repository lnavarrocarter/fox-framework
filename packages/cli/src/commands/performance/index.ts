// tsfox/cli/commands/performance/index.ts
import { CommandInterface } from '../../interfaces/cli.interface';
import { PerformanceBenchmarkCommand } from './benchmark.command';
import { PerformanceAnalyzeCommand } from './analyze.command';
import { PerformanceReportCommand } from './report.command';
import { PerformanceOptimizeCommand } from './optimize.command';

export const PerformanceCommands: CommandInterface[] = [
  PerformanceBenchmarkCommand,
  PerformanceAnalyzeCommand,
  PerformanceReportCommand,
  PerformanceOptimizeCommand
];
