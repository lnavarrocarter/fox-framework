// tsfox/cli/commands/project/new.command.ts
import { CommandInterface } from '../../interfaces/cli.interface';
import path from 'path';
import fs from 'fs';

// Reutilizamos la lógica existente de generators.ts para mantener consistencia
// Evitamos importar todo el archivo para reducir dependencias cíclicas
async function generateNewProject(projectName: string, template: string = 'basic') {
  const { generateNewProject: legacyGenerator } = await import('../../generators');
  return legacyGenerator(projectName, template);
}

export const NewProjectCommand: CommandInterface = {
  name: 'new',
  description: 'Crear un nuevo proyecto Fox Framework',
  options: [
    {
      name: 'template',
      alias: 't',
      description: 'Plantilla (basic, api, full)',
      type: 'string',
      default: 'basic'
    }
  ],
  action: async (_args, options) => {
    const projectName = _args?.[0];
    if (!projectName) {
      throw new Error('Debe especificar un nombre: tsfox new <nombre>');
    }

    const targetDir = path.resolve(process.cwd(), projectName);
    if (fs.existsSync(targetDir)) {
      throw new Error(`El directorio '${projectName}' ya existe`);
    }

    console.log(`\n🦊 Fox Framework - Crear Proyecto`);
    console.log(`📁 Nombre: ${projectName}`);
    console.log(`🧩 Plantilla: ${options.template}`);

    await generateNewProject(projectName, options.template || 'basic');
  }
};
