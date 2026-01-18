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
