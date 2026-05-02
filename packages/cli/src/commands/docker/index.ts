import { CommandInterface } from '../../interfaces/cli.interface';
import { DockerInitCommand } from './init.command';
import { DockerBuildCommand } from './build.command';
import { DockerRunCommand } from './run.command';
import { DockerComposeCommand } from './compose.command';
import { DockerLogsCommand } from './logs.command';

export const DockerCommands: CommandInterface[] = [
  DockerInitCommand,
  DockerBuildCommand,
  DockerRunCommand,
  DockerComposeCommand,
  DockerLogsCommand
];
