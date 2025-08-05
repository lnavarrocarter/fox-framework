#!/bin/bash

# Script de verificación de configuración de Codecov
# Para Fox Framework

echo "🦊 Fox Framework - Verificación de Codecov"
echo "==========================================="

# Verificar si existe el archivo de coverage
if [ -f "./coverage/lcov.info" ]; then
    echo "✅ Archivo de coverage encontrado"
    echo "📊 Tamaño: $(du -h ./coverage/lcov.info | cut -f1)"
    echo "📄 Líneas: $(wc -l < ./coverage/lcov.info)"
else
    echo "❌ Archivo de coverage no encontrado"
    echo "💡 Ejecuta: npm run test:coverage"
    exit 1
fi

# Verificar configuración de Codecov
if [ -f "./.codecov.yml" ]; then
    echo "✅ Configuración de Codecov encontrada"
else
    echo "⚠️  Archivo .codecov.yml no encontrado"
fi

# Verificar workflows
echo ""
echo "📋 Verificando workflows..."

if grep -q "codecov" .github/workflows/*.yml; then
    echo "✅ Codecov configurado en workflows"
    echo "📁 Archivos que usan Codecov:"
    grep -l "codecov" .github/workflows/*.yml | sed 's/^/   - /'
else
    echo "❌ Codecov no encontrado en workflows"
fi

# Verificar variables de entorno
echo ""
echo "🔑 Verificando variables de entorno..."

if [ -n "$CODECOV_TOKEN" ]; then
    echo "✅ CODECOV_TOKEN está configurado localmente"
else
    echo "⚠️  CODECOV_TOKEN no está configurado localmente"
    echo "💡 Para CI/CD, configúralo como secret en GitHub"
fi

# Mostrar estadísticas de coverage si existe
if [ -f "./coverage/lcov.info" ]; then
    echo ""
    echo "📊 Estadísticas de Coverage:"
    echo "=========================="
    
    # Contar archivos cubiertos
    files_count=$(grep -c "^SF:" ./coverage/lcov.info)
    echo "📁 Archivos analizados: $files_count"
    
    # Extraer información de líneas
    lines_found=$(grep "^LF:" ./coverage/lcov.info | awk -F: '{sum += $2} END {print sum}')
    lines_hit=$(grep "^LH:" ./coverage/lcov.info | awk -F: '{sum += $2} END {print sum}')
    
    if [ -n "$lines_found" ] && [ -n "$lines_hit" ] && [ "$lines_found" -gt 0 ]; then
        coverage=$((lines_hit * 100 / lines_found))
        echo "📈 Coverage total: ${coverage}%"
        echo "📊 Líneas cubiertas: ${lines_hit}/${lines_found}"
        
        if [ "$coverage" -ge 80 ]; then
            echo "✅ Coverage cumple el umbral mínimo (80%)"
        else
            echo "⚠️  Coverage por debajo del umbral mínimo (80%)"
        fi
    fi
fi

echo ""
echo "🔧 Comandos útiles:"
echo "=================="
echo "npm run test:coverage    # Generar reporte de coverage"
echo "npm test                 # Ejecutar tests"
echo "open coverage/index.html # Ver reporte HTML local"

echo ""
echo "📚 Documentación:"
echo "================="
echo "docs/deployment/codecov-troubleshooting.md"
