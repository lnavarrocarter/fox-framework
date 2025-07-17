// tsfox/cli/commands/cache/index.ts
import { CommandInterface } from '../../interfaces/cli.interface';
import { CacheInitCommand } from './init.command';
import { CacheFlushCommand } from './flush.command';
import { CacheStatsCommand } from './stats.command';
import { CacheBenchmarkCommand } from './benchmark.command';

export const CacheCommands: CommandInterface[] = [
  CacheInitCommand,
  CacheFlushCommand,
  CacheStatsCommand,
  CacheBenchmarkCommand
];
