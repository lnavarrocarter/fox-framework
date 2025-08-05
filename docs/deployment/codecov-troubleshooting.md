# Solución de Problemas con Codecov

## Error de Rate Limit

### Síntoma
```
Error uploading to https://codecov.io: Error: There was an error fetching the storage URL during POST: 429 - {"message":"Rate limit reached. Please upload with the Codecov repository upload token to resolve issue. Expected time to availability: 1414s."}
```

### Causa
Codecov está limitando las subidas sin token de autenticación. Este límite se aplica especialmente en repositorios públicos con múltiples builds.

### Solución

#### 1. Obtener Token de Codecov
1. Ve a [codecov.io](https://codecov.io)
2. Loguéate con tu cuenta de GitHub
3. Busca tu repositorio
4. Ve a Settings > Repository Upload Token
5. Copia el token

#### 2. Configurar Secret en GitHub
1. Ve a tu repositorio en GitHub
2. Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Name: `CODECOV_TOKEN`
5. Value: pega el token copiado
6. Click "Add secret"

#### 3. Actualizar Workflow
El workflow ya está configurado para usar el token:

```yaml
- name: 'Upload Coverage to Codecov'
  uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    file: ./coverage/lcov.info
    flags: unittests
    name: codecov-umbrella
    fail_ci_if_error: false
    verbose: true
```

### Configuración Adicional

#### Archivo .codecov.yml
El repositorio incluye un archivo de configuración de Codecov que:
- Establece umbrales de coverage (80% para proyecto, 70% para patches)
- Configura comentarios en PRs
- Define archivos a ignorar
- Configura flags para diferentes tipos de pruebas

#### Verificación
Después de configurar el token:
1. Haz un push a main
2. Verifica que el workflow ejecute sin errores
3. Revisa el reporte en codecov.io

### Monitoreo de Coverage

#### Umbrales Configurados
- **Proyecto**: 80% mínimo
- **Patches**: 70% mínimo
- **Threshold**: 2% de variación permitida

#### Archivos Excluidos
- Tests (`**/*.test.ts`, `**/__tests__/**`)
- Configuración (`jest.config.*`)
- Archivos de tipo (`**/*.d.ts`)
- Build outputs (`**/dist/**`, `**/build/**`)

### Troubleshooting

#### Error: "Unable to locate build via GitHub Actions API"
- Verifica que el workflow tenga permisos correctos
- Asegúrate de que el token sea válido

#### Error: "Missing repository upload token"
- Verifica que el secret CODECOV_TOKEN existe
- Confirma que el token no haya expirado

#### Coverage no aparece
- Verifica que el archivo lcov.info se genere correctamente
- Revisa los paths en la configuración
- Confirma que las pruebas generen coverage

### Comandos Útiles

```bash
# Generar reporte local
npm run test:coverage

# Verificar archivo de coverage
ls -la coverage/

# Ver contenido de lcov.info
head coverage/lcov.info
```

### Enlaces Útiles
- [Documentación de Codecov](https://docs.codecov.com/)
- [GitHub Action de Codecov](https://github.com/codecov/codecov-action)
- [Configuración de .codecov.yml](https://docs.codecov.com/docs/codecov-yaml)
