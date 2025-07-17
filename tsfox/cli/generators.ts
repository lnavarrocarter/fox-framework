// src/cli/generators.ts
import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve(__dirname, 'templates');

// Helper function to format class names (PascalCase)
export const formatClassName = (name: string): string => {
    // Handle camelCase, PascalCase, kebab-case, snake_case, and combinations
    return name
        // First, handle camelCase and PascalCase by inserting separators before uppercase letters
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        // Then split by common separators
        .split(/[-_\s]+/)
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
};

// Helper function to format file names (kebab-case)
export const formatFileName = (name: string): string => {
    // Handle common cases like APIController -> api-controller (not a-p-i-controller)
    return name
        // Insert dash before uppercase letters that follow lowercase letters
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        // Handle sequences of uppercase letters followed by lowercase letters (like API -> Api)
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase()
        // Replace multiple separators with single dash
        .replace(/[-_\s]+/g, '-')
        // Remove leading/trailing dashes
        .replace(/^-|-$/g, '');
};

const createFileFromTemplate = (name: string, templateFile: string, targetDir: string, extension: string, fileBaseName?: string) => {
    try {
        const templatePath = path.join(templatesDir, templateFile);
        const className = formatClassName(name);
        const fileName = formatFileName(fileBaseName || name);
        const targetPath = path.join(targetDir, `${fileName}.${extension}`);

        // Check if template exists, if not create a basic template
        let templateContent = '';
        if (fs.existsSync(templatePath)) {
            templateContent = fs.readFileSync(templatePath, 'utf8');
        } else {
            // Create basic controller template if template file doesn't exist
            if (extension === 'controller.ts') {
                templateContent = createBasicControllerTemplate();
            } else {
                templateContent = `// Generated ${className}`;
            }
        }

        // Ensure templateContent is not null or undefined
        if (!templateContent) {
            templateContent = createBasicControllerTemplate();
        }

        const content = templateContent
            .replace(/__NAME__/g, className)
            .replace(/__FILENAME__/g, fileName);

        fs.writeFileSync(targetPath, content);
        console.log(`Generated ${targetPath}`);
    } catch (error) {
        console.error(`Error generating ${name}:`, error);
        throw error;
    }
};

const createBasicControllerTemplate = (): string => {
    return `import { Request, Response } from 'express';

export class __NAME__Controller {
    /**
     * GET /
     * Index - List all items
     */
    public index(req: Request, res: Response): void {
        res.json({
            message: '__NAME__ index',
            data: []
        });
    }

    /**
     * GET /:id
     * Show - Get specific item
     */
    public show(req: Request, res: Response): void {
        const { id } = req.params;
        res.json({
            message: '__NAME__ show',
            id: id,
            data: {}
        });
    }

    /**
     * POST /
     * Create - Create new item
     */
    public create(req: Request, res: Response): void {
        const data = req.body;
        res.status(201).json({
            message: '__NAME__ created',
            data: data
        });
    }

    /**
     * PUT /:id
     * Update - Update existing item
     */
    public update(req: Request, res: Response): void {
        const { id } = req.params;
        const data = req.body;
        res.json({
            message: '__NAME__ updated',
            id: id,
            data: data
        });
    }

    /**
     * DELETE /:id
     * Delete - Delete item
     */
    public delete(req: Request, res: Response): void {
        const { id } = req.params;
        res.json({
            message: '__NAME__ deleted',
            id: id
        });
    }
}

export default __NAME__Controller;
`;
};

export const generateController = (name: string): void => {
    if (!name || name.trim() === '') {
        throw new Error('Controller name cannot be empty');
    }

    // Handle nested paths like 'admin/user'
    const parts = name.split('/');
    const controllerName = parts.pop() || name;
    const subDir = parts.length > 0 ? parts.join('/').toLowerCase() : '';
    
    // For nested paths, combine all parts for class name (Admin/User -> AdminUser)
    const fullControllerName = parts.length > 0 
        ? parts.join('') + controllerName 
        : controllerName;
    
    const targetDir = subDir 
        ? path.resolve(process.cwd(), 'src/controllers', subDir)
        : path.resolve(process.cwd(), 'src/controllers');
    
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Use the original controllerName for the file, not the full combined name
    createFileFromTemplate(fullControllerName, 'controller.ts.template', targetDir, 'controller.ts', controllerName);
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

// Generate new Fox Framework project
export const generateNewProject = async (projectName: string, template: string = 'basic') => {
    const targetDir = path.resolve(process.cwd(), projectName);
    
    // Check if directory already exists
    if (fs.existsSync(targetDir)) {
        console.error(`❌ Directory '${projectName}' already exists!`);
        process.exit(1);
    }

    console.log(`🦊 Creating new Fox Framework project: ${projectName}`);
    console.log(`📁 Template: ${template}`);
    
    try {
        // Create project directory
        fs.mkdirSync(targetDir, { recursive: true });
        
        // Create basic project structure
        const directories = [
            'src/controllers',
            'src/services', 
            'src/routes',
            'src/server',
            'src/views',
            'tsfox'
        ];
        
        directories.forEach(dir => {
            fs.mkdirSync(path.join(targetDir, dir), { recursive: true });
        });
        
        // Create package.json
        const packageJson = {
            "name": projectName,
            "version": "1.0.0",
            "description": `${projectName} - A Fox Framework application`,
            "main": "dist/src/server/index.js",
            "scripts": {
                "start": "node dist/src/server/index.js",
                "dev": "nodemon --watch 'src/**/*.ts' --exec 'ts-node' src/server/index.ts",
                "build": "tsc",
                "test": "jest"
            },
            "dependencies": {
                "@foxframework/core": "^1.0.0",
                "express": "^4.18.2",
                "typescript": "^5.3.2"
            },
            "devDependencies": {
                "@types/express": "^4.17.21",
                "@types/node": "^20.10.4",
                "nodemon": "^3.0.1",
                "ts-node": "^10.9.1"
            }
        };
        
        fs.writeFileSync(
            path.join(targetDir, 'package.json'), 
            JSON.stringify(packageJson, null, 2)
        );
        
        // Create tsconfig.json
        const tsConfig = {
            "compilerOptions": {
                "target": "ES2020",
                "module": "commonjs",
                "lib": ["ES2020"],
                "outDir": "./dist",
                "rootDir": "./",
                "strict": true,
                "esModuleInterop": true,
                "skipLibCheck": true,
                "forceConsistentCasingInFileNames": true,
                "declaration": true,
                "declarationMap": true,
                "sourceMap": true
            },
            "include": ["src/**/*", "tsfox/**/*"],
            "exclude": ["node_modules", "dist", "**/*.test.ts"]
        };
        
        fs.writeFileSync(
            path.join(targetDir, 'tsconfig.json'),
            JSON.stringify(tsConfig, null, 2)
        );
        
        // Create basic server file
        const serverContent = `import { FoxFactory } from '@foxframework/core';
import express from 'express';

const app = express();
const fox = new FoxFactory(app);

// Basic route
fox.get('/', (req, res) => {
    res.json({ message: 'Welcome to ${projectName}!' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(\`🦊 ${projectName} server running on port \${PORT}\`);
});
`;
        
        fs.writeFileSync(
            path.join(targetDir, 'src/server/index.ts'),
            serverContent
        );
        
        // Create README
        const readmeContent = `# ${projectName}

A Fox Framework application.

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
\`\`\`

## Commands

\`\`\`bash
# Generate controller
npx tsfox generate:controller UserController

# Generate model  
npx tsfox generate:model User

# Generate view
npx tsfox generate:view user-profile
\`\`\`
`;
        
        fs.writeFileSync(
            path.join(targetDir, 'README.md'),
            readmeContent
        );
        
        console.log(`✅ Project '${projectName}' created successfully!`);
        console.log(`\n📋 Next steps:`);
        console.log(`   cd ${projectName}`);
        console.log(`   npm install`);
        console.log(`   npm run dev`);
        console.log(`\n🦊 Happy coding with Fox Framework!`);
        
    } catch (error) {
        console.error(`❌ Error creating project:`, error);
        process.exit(1);
    }
};
