# MCP Operator (Windows)

## Prerequisites
- Node.js + npm
- Chrome/Chromium installed (or Playwright Chromium)
- PowerShell 7.5+

## Quick Start
One-command automated startup (deps + Vite + Chromium + MCP + health check):

```powershell
npm run mcp:start
```

PowerShell full mode (wraps the automated startup):

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/mcp/Start-HitechOperator.ps1 -Full
```

Full mode with verification tests:

```powershell
$env:HI_RUN_TESTS = "1"; pwsh -NoProfile -ExecutionPolicy Bypass -File tools/mcp/Start-HitechOperator.ps1 -Full
Remove-Item Env:HI_RUN_TESTS -ErrorAction SilentlyContinue
```

Or:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/mcp/Start-HitechOperator.ps1 -Full -RunTests
```

## Open the Target URL
If your app is not already open in Chrome:

```powershell
npm run mcp:open-target
```

## Test the MCP Client
Run the MCP test client:

```powershell
npm run mcp:test-client
```

## Doctor / Health Check
Run a full diagnostic:

```powershell
npm run mcp:doctor
```

## Environment Variables
- `HI_BROWSER_URL` (default: `http://127.0.0.1:9222`)
- `HI_URL_CONTAINS` (default: `localhost:5177/#/deck?s=2`)
- `HI_URL_EXACT` (optional)
- `HI_FLICKER_OUT` (default: `tools/mcp/_flicker_out`)
- `HI_SHOTS` (default: `12`)
- `HI_DELAY_MS` (default: `180`)
- `HI_RUN_TESTS` (set to `1` to run verification checks in `mcp:start`)
- `HI_SHUTDOWN_ON_EXIT` (set to `1` to stop processes started by `mcp:start` after success)

## Troubleshooting
- **Vite timeout**
  - Ensure `npm run dev` works and prints a localhost URL.
  - Check firewall or port conflicts.
- **Port conflicts**
  - The PowerShell launcher frees ports `5177` and `9222` automatically before starting.
- **9222 not reachable**
  - Launch Chrome with `--remote-debugging-port=9222`.
  - Run `pwsh -NoProfile -ExecutionPolicy Bypass -File tools/mcp/Start-HitechOperator.ps1 -Full`.
- **Selected page mismatch**
  - Open the target URL in Chrome.
  - Run `npm run mcp:open-target`, then `npm run mcp:doctor`.
- **URL mismatch**
  - Set `HI_URL_EXACT` or `HI_URL_CONTAINS`, then retry.
