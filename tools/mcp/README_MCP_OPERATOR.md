# MCP Operator (Windows)

## Prerequisites
- Node.js + npm
- Chrome/Chromium installed (or Playwright Chromium)
- PowerShell 7.5+

## Quick Start
Run the launcher from repo root:

```powershell
pwsh tools/mcp/Start-HitechOperator.ps1
```

This will:
- Launch Chrome/Chromium with remote debugging on port 9222
- Health-check `http://127.0.0.1:9222/json`
- Start the MCP operator (`npm run mcp:operator`)

## Open the Target URL
If your app is not already open in Chrome:

```powershell
npm run mcp:open-target
```

Or open the URL manually in the launched Chrome window.

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

## Troubleshooting
- **9222 not reachable**
  - Launch Chrome with `--remote-debugging-port=9222`.
  - Run `pwsh tools/mcp/Start-HitechOperator.ps1`.
- **Selected page mismatch**
  - Open the target URL in Chrome.
  - Run `npm run mcp:open-target`, then `npm run mcp:doctor`.
- **URL mismatch**
  - Set `HI_URL_EXACT` or `HI_URL_CONTAINS`, then retry.
