# MCP Tool Catalog

Este directorio define el **catalogo global de herramientas MCP**.

Principios:
- Las herramientas aqui son **agnosticas de slides**
- No escriben rutas hardcodeadas
- Usan env vars para inputs/outputs
- No modifican UI ni data directamente

Uso tipico:
- Runner decide slide + workspace
- Tool ejecuta logica pura
