// src/cli/generators.ts
import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve(__dirname, 'templates');

const createFileFromTemplate = (name: string, templateFile: string, targetDir: string, extension: string) => {
    const templatePath = path.join(templatesDir, templateFile);
    const targetPath = path.join(targetDir, `${name}.${extension}`);

    fs.readFile(templatePath, 'utf8', (err, data) => {
        if (err) throw err;

        const content = data.replace(/__NAME__/g, name);
        fs.writeFile(targetPath, content, (err) => {
            if (err) throw err;
            console.log(`Generated ${targetPath}`);
        });
    });
};

export const generateController = (name: string) => {
    const targetDir = path.resolve(__dirname, '../controllers');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    createFileFromTemplate(name, 'controller.ts.template', targetDir, 'ts');
};

export const generateModel = (name: string) => {
    const targetDir = path.resolve(__dirname, '../models');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    createFileFromTemplate(name, 'model.ts.template', targetDir, 'ts');
};

export const generateView = (name: string) => {
    const targetDir = path.resolve(__dirname, '../views');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    createFileFromTemplate(name, 'view.html.template', targetDir, 'html');
};
