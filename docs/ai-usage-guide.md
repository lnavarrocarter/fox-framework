# 🧠 Fox Framework AI - Guía de Uso

## 🚀 Primeros Pasos

### 1. Configuración

Crea un archivo `fox-ai.config.json` en la raíz de tu proyecto:

```json
{
  "provider": "openai",
  "model": "gpt-4",
  "temperature": 0.2,
  "maxTokens": 2000,
  "apiKey": "${OPENAI_API_KEY}"
}
```

### 2. Variables de Entorno

```bash
export OPENAI_API_KEY="tu-api-key-aqui"
```

## 🎯 Comandos Disponibles

### Generación de Código

#### Controlador
```bash
# Modo interactivo (recomendado)
npx -p @foxframework/core tsfox ai:generate controller User --interactive

# Modo rápido con valores por defecto
npx -p @foxframework/core tsfox ai:generate controller User

# Especificar archivo de salida
npx -p @foxframework/core tsfox ai:generate controller User --output src/controllers/custom-user.controller.ts

OR

npx tsfox ai:generate controller User --interactive

# Modo rápido con valores por defecto
npx tsfox ai:generate controller User

# Especificar archivo de salida
npx tsfox ai:generate controller User --output src/controllers/custom-user.controller.ts

```

#### Middleware
```bash
# Generar middleware de autenticación

npx -p @foxframework/core tsfox ai:generate middleware Auth --interactive

# Middleware simple
npx -p @foxframework/core tsfox ai:generate middleware Logging

OR

npx tsfox ai:generate middleware Auth --interactive

# Middleware simple
npx tsfox ai:generate middleware Logging

```

#### Rutas
```bash
# Ruta específica

npx -p @foxframework/core tsfox ai:generate route User --interactive

# Ruta simple
npx -p @foxframework/core tsfox ai:generate route User
OR
npx tsfox ai:generate route User --interactive

# Ruta simple
npx tsfox ai:generate route User

```

#### Modelos
```bash
# Modelo completo con propiedades

npx -p @foxframework/core tsfox ai:generate model User --interactive

# Modelo básico
npx -p @foxframework/core tsfox ai:generate model User

OR

npx tsfox ai:generate model User --interactive

# Modelo básico
npx tsfox ai:generate model User

```

### Análisis de Código (Próximamente)
```bash
# Analizar proyecto completo

npx -p @foxframework/core tsfox ai:analyze project

# Optimizaciones sugeridas
npx -p @foxframework/core tsfox ai:optimize --suggestions

# Detección de bugs
npx -p @foxframework/core tsfox ai:bugs --auto-fix
 
OR

npx tsfox ai:analyze project

# Optimizaciones sugeridas
npx tsfox ai:optimize --suggestions

# Detección de bugs
npx tsfox ai:bugs --auto-fix
```

## 📝 Ejemplos Prácticos

### 1. Crear API REST Completa

```bash
# 1. Generar modelo

npx -p @foxframework/core tsfox ai:generate model User --interactive
# Propiedades: name:string,email:string,password:string,role:string

# 2. Generar controlador
npx -p @foxframework/core tsfox ai:generate controller User --interactive
# Seleccionar: index, show, store, update, destroy

# 3. Generar rutas
npx -p @foxframework/core tsfox ai:generate route User --interactive
# Method: GET, Path: /users, Controller: UserController, Action: index

# 4. Generar middleware de auth
npx -p @foxframework/core tsfox ai:generate middleware Auth --interactive

OR

npx tsfox ai:generate model User --interactive
# Propiedades: name:string,email:string,password:string,role:string

# 2. Generar controlador
npx tsfox ai:generate controller User --interactive
# Seleccionar: index, show, store, update, destroy

# 3. Generar rutas
npx tsfox ai:generate route User --interactive
# Method: GET, Path: /users, Controller: UserController, Action: index

# 4. Generar middleware de auth
npx tsfox ai:generate middleware Auth --interactive
# Purpose: JWT authentication middleware
```

### 2. Sistema de Blog

```bash
# Generar todos los componentes de un blog

npx -p @foxframework/core tsfox ai:generate model Post --interactive
# Propiedades: title:string,content:string,authorId:string,publishedAt:Date

npx -p @foxframework/core tsfox ai:generate controller Post --interactive
npx -p @foxframework/core tsfox ai:generate middleware RateLimit --interactive
npx -p @foxframework/core tsfox ai:generate route Post --interactive

OR

npx tsfox ai:generate model Post --interactive
# Propiedades: title:string,content:string,authorId:string,publishedAt:Date

npx tsfox ai:generate controller Post --interactive
npx tsfox ai:generate middleware RateLimit --interactive
npx tsfox ai:generate route Post --interactive

```

## 🎨 Modo Interactivo

El modo interactivo te permite especificar detalles precisos:

### Controlador Interactivo
```
? Associated model (optional): User
? Select actions to generate: index, show, store, update, destroy
? Require authentication? Yes
? Additional middleware (comma separated): cors, validation
```

### Middleware Interactivo  
```
? Purpose of this middleware: Rate limiting for API endpoints
? Execute before route handler? Yes
? Execute after route handler? No
```

### Modelo Interactivo
```
? Properties (name:type, comma separated): name:string,email:string,age:number,isActive:boolean
```

## 📊 Salida Generada

Cada comando genera:

- **Código principal** con TypeScript tipado
- **Tests unitarios** con Jest
- **Documentación** en Markdown
- **Dependencias** automáticamente detectadas

### Estructura de Archivos Generados

```
src/
├── controllers/
│   ├── user.controller.ts          # Código generado
│   └── __tests__/
│       └── user.controller.test.ts # Tests generados
├── middleware/
│   ├── auth.middleware.ts
│   └── __tests__/
│       └── auth.middleware.test.ts
├── models/
│   ├── user.model.ts
│   └── __tests__/
│       └── user.model.test.ts
└── routes/
    ├── user.routes.ts
    └── __tests__/
        └── user.routes.test.ts
```

## 🔧 Configuración Avanzada

### Providers Soportados

```json
{
  "provider": "openai",     // OpenAI GPT models
  "provider": "claude",     // Anthropic Claude (próximamente)
  "provider": "local"       // Local LLM (próximamente)
}
```

### Modelos Disponibles

```json
{
  "model": "gpt-4",           // Más preciso, más lento
  "model": "gpt-3.5-turbo",   // Más rápido, menos preciso
  "model": "gpt-4-turbo"      // Balance entre precisión y velocidad
}
```

### Parámetros de Generación

```json
{
  "temperature": 0.1,    // Más determinístico
  "temperature": 0.5,    // Balance
  "temperature": 0.9,    // Más creativo
  
  "maxTokens": 1000,     // Código más simple
  "maxTokens": 2000,     // Balance (recomendado)
  "maxTokens": 4000      // Código más complejo
}
```

## 💡 Consejos y Mejores Prácticas

### 1. Usa Modo Interactivo
- Más control sobre la generación
- Resultados más precisos
- Personalización específica

### 2. Especifica Claramente
- Proporciona nombres descriptivos
- Define propiedades de modelo específicas
- Especifica el propósito del middleware

### 3. Revisa el Código Generado
- El AI genera código de alta calidad pero siempre revisa
- Ajusta según tus necesidades específicas
- Ejecuta los tests generados

### 4. Usa la Documentación Generada
- Cada archivo viene con documentación Markdown
- Ayuda a entender la funcionalidad generada
- Base para documentación del proyecto

## 🐛 Solución de Problemas

### API Key No Configurada
```bash
Error: OpenAI API key is required
```
**Solución:** Configura la variable de entorno `OPENAI_API_KEY`

### Configuración Inválida
```bash
Warning: Invalid AI config file, using defaults
```
**Solución:** Verifica que `fox-ai.config.json` tenga sintaxis JSON válida

### Sin Respuesta de IA
```bash
Using mock responses for demonstration
```
**Solución:** Verifica conectividad a internet y validez de API key

## 🔮 Próximas Características

- ✅ Generación básica de código
- 🚧 Análisis y optimización automática
- 🔄 Refactoring inteligente  
- 🧠 Aprendizaje de patrones de usuario
- 🛡️ Detección y corrección de bugs
- 🎯 Sugerencias arquitecturales
- 🔍 Análisis de performance
- 🚀 Auto-scaling predictivo

## 📞 Soporte

Si tienes problemas o sugerencias:

1. Verifica la documentación
2. Revisa los ejemplos en el repositorio
3. Crea un issue en GitHub
4. Consulta la comunidad en Discord

---

*¡Bienvenido al futuro del desarrollo con IA! 🦊🧠*
