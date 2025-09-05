#!/usr/bin/env node

/**
 * Demostración del Sistema de Prompts Personalizados
 * Fox Framework AI Integration
 */

console.log(`
🦊 Fox Framework - Sistema de Prompts Personalizados
=====================================================

¡Felicidades! El sistema de IA del Fox Framework ahora soporta prompts personalizados 
y configuración de estilos de código.

✨ NUEVAS CARACTERÍSTICAS:

1. 📝 Prompts Personalizados
   - Especifica instrucciones adicionales para la generación de código
   - Soporta prompts específicos por componente (controller, middleware, route, model)
   - Integración completa con CLI interactivo

2. 🎨 Configuración de Estilo de Código
   - Indentación (espacios vs tabs)
   - Estilo de comillas (simples vs dobles)  
   - Convenciones de nomenclatura
   - Patrones arquitectónicos

🚀 CÓMO USAR:

Para generar un controller con prompt personalizado:

   node tsfox/cli/index.js ai:generate controller UserProfile --interactive

Durante el proceso interactivo:
- Se preguntará si quieres usar un prompt personalizado
- Se abrirá un editor para escribir tus instrucciones específicas
- Podrás configurar estilos de código personalizados

📋 EJEMPLO DE PROMPT PERSONALIZADO:

"Generate a controller following enterprise patterns:
- Use dependency injection with constructor parameters
- Implement comprehensive error handling with custom exceptions  
- Add input validation using Zod schemas
- Include structured logging with correlation IDs
- Add OpenAPI/Swagger documentation comments"

🎯 CONFIGURACIÓN DE ESTILO:

{
  "indentation": "spaces",
  "indentSize": 4,
  "quotes": "single",
  "semicolons": true,
  "naming": {
    "classes": "PascalCase",
    "methods": "camelCase"
  },
  "patterns": {
    "errorHandling": "result-pattern",
    "validation": "zod"
  }
}

📚 Para más información, consulta:
   docs/ai-custom-prompts.md

¡Prueba las nuevas funcionalidades y genera código personalizado según tus necesidades!
`);
