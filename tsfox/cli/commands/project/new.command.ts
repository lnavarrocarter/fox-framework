// tsfox/cli/commands/project/new.command.ts
import { CommandInterface } from '../../interfaces/cli.interface';
import { runProjectWizard } from './wizard';
import { generateProject } from '../../project-generator';

export const NewProjectCommand: CommandInterface = {
  name: 'new',
  description: 'Create a new Fox Framework project (interactive)',
  options: [],
  action: async (_args) => {
    const nameArg = _args?.[0];
    const config = await runProjectWizard(nameArg);
    await generateProject(config);
  },
};
