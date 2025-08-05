#!/bin/bash

# Script para probar la build de GitHub Pages localmente
# Ejecuta desde la raíz del proyecto

echo "🦊 Fox Framework - Testing GitHub Pages Build"
echo "=============================================="

cd website

echo ""
echo "📦 Instalando dependencias..."
npm ci

echo ""
echo "🔨 Construyendo para GitHub Pages..."
GITHUB_PAGES=true npm run build

echo ""
echo "📄 Creando archivo .nojekyll..."
touch out/.nojekyll

echo ""
echo "🚀 Iniciando servidor local para testing..."
echo "   Sitio disponible en: http://localhost:8080"
echo "   Presiona Ctrl+C para detener"

# Usar Python para servir archivos estáticos
if command -v python3 &> /dev/null; then
    cd out && python3 -m http.server 8080
elif command -v python &> /dev/null; then
    cd out && python -m SimpleHTTPServer 8080
else
    echo "❌ Python no encontrado. Instala Python para probar localmente."
    echo "   O usa: npx serve out -p 8080"
fi
