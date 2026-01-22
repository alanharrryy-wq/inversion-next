# MCP Tools

## Hitech Operator MCP Server

Run the stdio MCP server:

```bash
npm run mcp:operator
```

Chrome must be running with remote debugging enabled (example):

```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\tmp\hi-chrome"
```

Defaults (override via env vars):
- `HI_BROWSER_URL` (default: `http://127.0.0.1:9222`)
- `HI_URL_CONTAINS` (default: `localhost:5177/#/deck?s=2`)
- `HI_URL_EXACT` (optional)
- `HI_FLICKER_OUT` (default: `tools/mcp/_flicker_out`)
- `HI_SHOTS` (default: `12`)
- `HI_DELAY_MS` (default: `180`)

# MCP (Model Control & Policy tools)
Fecha: 2026-01-22

## TL;DR (léelo si no quieres pensar)
MCP **NO se abre solo**.
MCP **SIEMPRE** se conecta a un navegador Chromium **ya abierto** con DevTools en el puerto **9222**.

El flujo correcto SIEMPRE es:
1) Vite arriba
2) Chromium con 9222
3) Ejecutar tool MCP (triage, element-map, etc.)

Si te brincas un paso, MCP falla silenciosamente.

---

## 🧠 Modelo mental
- MCP = escáner
- Chromium (9222) = ojos
- Slide = paciente

Sin ojos abiertos → el escáner no ve nada.

---

## 📂 Estructura relevante

Por slide:

---

## 🛠️ Requisitos obligatorios
- Node.js (repo)
- Vite corriendo (puerto default: 5177)
- Chromium/Chrome con:
  - `--remote-debugging-port=9222`
- Variables de entorno:
  - `HI_BROWSER_URL=http://127.0.0.1:9222`
  - `HI_URL_CONTAINS=localhost:5177` (loose recomendado)

---

## ▶️ Flujo OFICIAL (ritual)
### 1) Arrancar Vite
```powershell
cd F:\repos\inversion-next
npm run dev -- --port 5177
pwsh -File F:\OneDrive\Hitech\3.Proyectos\CHAT GPT AI Estudio\HITECH_AISTUDIO_SYSTEM\PS1s\Start-MCP-Chrome9222.ps1
DevTools OK en 9222. MCP listo.

pwsh -File tools/mcp/Run-MCP.ps1 -Slide slide-02 -Tool triage -LaunchBrowser -OpenTarget
🧪 Tools disponibles

triage (pipeline completo)

reference-diff

element-map

auto-measure

capture-reference

Ejemplo:

pwsh -File tools/mcp/Run-MCP.ps1 -Slide slide-02 -Tool element-map -LaunchBrowser -OpenTarget
🖼️ Reference images

Cada slide usa:
src/slides/<slide>/tools/mcp/ref/reference.png

Si falta y el tool lo requiere, el launcher corre capture-reference automáticamente.

🚨 Errores comunes (y solución real)
Síntoma	Causa real	Solución
element-map FAIL	No hay Chromium en 9222	Ejecutar Start-MCP-Chrome9222.ps1
reference-diff FAIL	Falta reference.png	capture-reference
Vite reload infinito	.mcp/** siendo watch	Ignorar .mcp/** en vite.config
MCP no encuentra página	urlContains muy estricto	Usar localhost:5177

🧱 start-mcp-operator.mjs (importante)

start-mcp-operator.mjs es el bootstrap oficial:

Levanta Vite

Levanta Chromium

Levanta MCP operator server

Valida todo con test client

👉 Usar para:

CI

Onboarding

Diagnóstico total

👉 NO usar para:

Iteración diaria de slides

Trabajo fino de UI

🧠 Regla de oro

MCP no es mágico.
Si falla:

Revisa 9222

Revisa urlContains

Revisa artifacts en out/

FIN.