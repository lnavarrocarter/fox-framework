#!/usr/bin/env node

/**
 * 🧠 Fox AI Demo
 * Demostración de las capacidades de IA integrada en Fox Framework
 */

import { CodeGeneratorAgent } from './tsfox/ai/agents/code-generator.agent';
import { FoxAI, getDefaultAIConfig } from './tsfox/ai/index';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('🧠 Fox Framework AI - Demostración');
    console.log('==================================\n');

    try {
        // 1. Initialize AI system
        console.log('1️⃣ Inicializando sistema AI...');
        const config = getDefaultAIConfig();
        const foxAI = await FoxAI.create(config);
        const agent = foxAI.getCodeGenerator();
        
        console.log('✅ Sistema AI inicializado\n');

        // 2. Generate a complete User management system
        console.log('2️⃣ Generando sistema de gestión de usuarios...\n');

        // Generate User Model
        console.log('📦 Generando modelo User...');
        const userModel = await agent.generateModel({
            name: 'User',
            properties: [
                { name: 'id', type: 'string', required: false },
                { name: 'name', type: 'string', required: true },
                { name: 'email', type: 'string', required: true },
                { name: 'password', type: 'string', required: true },
                { name: 'role', type: 'string', required: true },
                { name: 'isActive', type: 'boolean', required: false },
                { name: 'createdAt', type: 'Date', required: false },
                { name: 'updatedAt', type: 'Date', required: false }
            ]
        });

        // Generate User Controller  
        console.log('🎮 Generando controlador User...');
        const userController = await agent.generateController({
            name: 'User',
            model: 'User',
            actions: [
                { name: 'index', method: 'GET', path: '/', description: 'Get all users' },
                { name: 'show', method: 'GET', path: '/:id', description: 'Get user by ID' },
                { name: 'store', method: 'POST', path: '/', description: 'Create new user' },
                { name: 'update', method: 'PUT', path: '/:id', description: 'Update user' },
                { name: 'destroy', method: 'DELETE', path: '/:id', description: 'Delete user' }
            ],
            authentication: true,
            middleware: ['cors', 'validation', 'rateLimit']
        });

        // Generate Auth Middleware
        console.log('🛡️ Generando middleware de autenticación...');
        const authMiddleware = await agent.generateMiddleware({
            name: 'Auth',
            purpose: 'JWT authentication and authorization middleware',
            beforeRoute: true,
            dependencies: ['jsonwebtoken', 'bcrypt']
        });

        // Generate User Routes
        console.log('🛣️ Generando rutas User...');
        const userRoutes = await agent.generateRoute({
            method: 'GET',
            path: '/api/users',
            controller: 'UserController',
            action: 'index',
            authentication: true,
            rateLimit: {
                windowMs: 60000,
                maxRequests: 100
            }
        });

        console.log('✅ Sistema generado exitosamente!\n');

        // 3. Save generated files
        console.log('3️⃣ Guardando archivos generados...\n');

        const outputDir = path.join(__dirname, 'demo-output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Save files
        saveFile(path.join(outputDir, 'user.model.ts'), userModel.code);
        saveFile(path.join(outputDir, 'user.controller.ts'), userController.code);
        saveFile(path.join(outputDir, 'auth.middleware.ts'), authMiddleware.code);
        saveFile(path.join(outputDir, 'user.routes.ts'), userRoutes.code);

        // Save tests
        saveFile(path.join(outputDir, 'user.model.test.ts'), userModel.tests);
        saveFile(path.join(outputDir, 'user.controller.test.ts'), userController.tests);
        saveFile(path.join(outputDir, 'auth.middleware.test.ts'), authMiddleware.tests);
        saveFile(path.join(outputDir, 'user.routes.test.ts'), userRoutes.tests);

        // Save documentation
        saveFile(path.join(outputDir, 'user.model.md'), userModel.documentation);
        saveFile(path.join(outputDir, 'user.controller.md'), userController.documentation);
        saveFile(path.join(outputDir, 'auth.middleware.md'), authMiddleware.documentation);
        saveFile(path.join(outputDir, 'user.routes.md'), userRoutes.documentation);

        console.log(`✅ Archivos guardados en: ${outputDir}\n`);

        // 4. Generate summary
        console.log('4️⃣ Resumen de generación:\n');

        const components = [
            { name: 'User Model', result: userModel },
            { name: 'User Controller', result: userController },
            { name: 'Auth Middleware', result: authMiddleware },
            { name: 'User Routes', result: userRoutes }
        ];

        components.forEach(({ name, result }) => {
            console.log(`📊 ${name}:`);
            console.log(`   ├─ Confianza: ${result.confidence}%`);
            console.log(`   ├─ Líneas de código: ${result.code.split('\n').length}`);
            console.log(`   ├─ Dependencias: ${result.dependencies.length}`);
            console.log(`   └─ Tests generados: ${result.tests ? 'Sí' : 'No'}\n`);
        });

        // 5. Analyze generated code
        console.log('5️⃣ Analizando código generado...\n');

        const codeAnalysis = await agent.analyzeCode({
            projectPath: outputDir,
            framework: 'fox',
            language: 'typescript',
            dependencies: {
                express: '4.18.0',
                typescript: '5.0.0',
                jsonwebtoken: '9.0.0',
                bcrypt: '5.1.0'
            },
            metrics: {
                linesOfCode: components.reduce((acc, comp) => acc + comp.result.code.split('\n').length, 0),
                complexity: 50,
                testCoverage: 95,
                dependencies: 4,
                performance: {
                    responseTime: 50,
                    memoryUsage: 25,
                    cpuUsage: 15,
                    errorRate: 0.01
                }
            }
        });

        console.log('📈 Análisis de código:');
        console.log(`   ├─ Complejidad: ${codeAnalysis.complexity}/100`);
        console.log(`   ├─ Mantenibilidad: ${codeAnalysis.maintainability}/100`);
        console.log(`   ├─ Performance: ${codeAnalysis.performance}/100`);
        console.log(`   ├─ Seguridad: ${codeAnalysis.security}/100`);
        console.log(`   ├─ Issues encontrados: ${codeAnalysis.issues.length}`);
        console.log(`   └─ Sugerencias: ${codeAnalysis.suggestions.length}\n`);

        if (codeAnalysis.suggestions.length > 0) {
            console.log('💡 Sugerencias de mejora:');
            codeAnalysis.suggestions.forEach((suggestion, index) => {
                console.log(`   ${index + 1}. ${suggestion}`);
            });
            console.log('');
        }

        // 6. Generate usage example
        console.log('6️⃣ Ejemplo de uso:\n');

        const usageExample = `
// 1. Importar componentes generados
import { User } from './user.model';
import { UserController } from './user.controller';
import { AuthMiddleware } from './auth.middleware';
import { userRoutes } from './user.routes';
import { FoxFactory } from 'tsfox';

// 2. Configurar servidor
const server = FoxFactory.createInstance({
    port: 3000,
    env: 'development'
});

// 3. Configurar middleware
const authMiddleware = new AuthMiddleware({ enabled: true });
server.use(authMiddleware.handle);

// 4. Configurar rutas
server.get('/api/users', userRoutes.handler);

// 5. Usar modelo
const user = new User({
    name: 'Juan Pérez',
    email: 'juan@example.com',
    role: 'user'
});

console.log('Usuario creado:', user.toJSON());

// 6. Iniciar servidor
FoxFactory.listen();
`;

        saveFile(path.join(outputDir, 'usage-example.ts'), usageExample);
        console.log(usageExample);

        console.log('\n🎉 ¡Demostración completada exitosamente!');
        console.log('==========================================');
        console.log(`📁 Revisa los archivos generados en: ${outputDir}`);
        console.log('🚀 El sistema AI de Fox Framework está listo para usar!');
        console.log('\nPróximos pasos:');
        console.log('1. Instalar dependencias: npm install express jsonwebtoken bcrypt');
        console.log('2. Configurar base de datos (opcional)');
        console.log('3. Ejecutar tests: npm test');
        console.log('4. Iniciar servidor: npm start');
        console.log('\n✨ ¡Happy coding with AI! 🦊🧠');

    } catch (error) {
        console.error('❌ Error en la demostración:', (error as Error).message);
        console.log('\n💡 Esto puede ocurrir si:');
        console.log('- No tienes configurado OPENAI_API_KEY');
        console.log('- No hay conexión a internet');
        console.log('- El servicio de OpenAI está temporalmente no disponible');
        console.log('\n🔧 La demostración funciona con respuestas mock para fines educativos.');
    }
}

function saveFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`📝 Guardado: ${path.basename(filePath)}`);
}

// Run demo if called directly
if (require.main === module) {
    main().catch(console.error);
}

export { main as runDemo };
