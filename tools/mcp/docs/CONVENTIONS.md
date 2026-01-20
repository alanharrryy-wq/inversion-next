# MCP Conventions

Convenciones generales para herramientas MCP:

- No hardcodear rutas
- No asumir slide especifica
- Usar JSON para outputs
- Crear carpetas solo dentro de workspace asignado
- Fallar de forma explicita y con logs claros
- Escribir `status.json` por run (runner lo genera)
- Reintentar MCP con timeouts y auto-recovery
