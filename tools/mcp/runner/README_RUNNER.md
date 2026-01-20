# MCP Runner

El runner orquesta la ejecucion de herramientas del catalogo MCP.

Responsabilidades:
- Resolver slide objetivo y rutas
- Inyectar env vars (HI_SLIDE_DIR, HI_OUT_DIR, etc)
- Ejecutar tools del catalogo con reintentos y timeouts
- Escribir `status.json` al final de cada run

## Uso

```bash
node tools/mcp/runner/run.mjs --slide slide-02 --tool reference-diff
node tools/mcp/runner/run.mjs --slide slide-02 --tool auto-measure
node tools/mcp/runner/run.mjs --slide slide-02 --tool style-inject
node tools/mcp/runner/run.mjs --slide slide-02 --tool element-map
node tools/mcp/runner/run.mjs --slide slide-02 --tool state-cycler
```

Opciones:
- `--list` lista herramientas del catalogo
- `--retries N` reintentos por tool (default 2)
- `--timeoutMs N` timeout base (ms) para MCP y tool run
- `--profile debug` logs mas verbosos
- `--dryRun` prepara outDir y `status.json` sin ejecutar tool

## Outputs

Los outputs se escriben en:
- `src/slides/<slide>/tools/mcp/out/run_YYYYMMDD_HHMMSS`

Cada run incluye `status.json` con:
```
{ toolId, slideId, outDir, ok, startedAt, finishedAt, durationMs, artifacts, warnings, errors }
```
