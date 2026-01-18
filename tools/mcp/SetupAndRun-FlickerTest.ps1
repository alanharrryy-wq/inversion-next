#requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --- Settings ---
$RepoRoot = (Get-Location).Path
$OutDir = Join-Path $RepoRoot "tools\mcp\_flicker_out"
$NodeFile = Join-Path $RepoRoot "tools\mcp\flicker_capture.mjs"
$PyFile = Join-Path $RepoRoot "tools\mcp\flicker_analyze.py"

$UrlContains = "localhost:5177/#/deck?s=2"
$BrowserUrl = "http://127.0.0.1:9222"
$Shots = 12
$DelayMs = 180

Write-Host ""
Write-Host "=== Hitech Flicker Test (MCP + screenshots + diffs) ==="
Write-Host ("Time: {0}" -f (Get-Date))
Write-Host ("Repo: {0}" -f $RepoRoot)
Write-Host ""

# --- Ensure folders ---
$folders = @(
  (Join-Path $RepoRoot "tools"),
  (Join-Path $RepoRoot "tools\mcp"),
  $OutDir
)

$i = 0
foreach ($f in $folders) {
  $i++
  Write-Progress -Activity "Preparing folders" -Status $f -PercentComplete (($i / $folders.Count) * 100)
  if (-not (Test-Path $f)) { New-Item -ItemType Directory -Path $f | Out-Null }
}
Write-Progress -Activity "Preparing folders" -Completed

# --- Write Node script ---
$nodeContent = @'
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = process.env.HI_FLICKER_OUT || path.resolve("tools/mcp/_flicker_out");
const URL_CONTAINS = process.env.HI_URL_CONTAINS || "localhost:5177/#/deck?s=2";
const BROWSER_URL = process.env.HI_BROWSER_URL || "http://127.0.0.1:9222";
const SHOTS = Number(process.env.HI_SHOTS || "12");
const DELAY_MS = Number(process.env.HI_DELAY_MS || "180");

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
ensureDir(OUT_DIR);

const server = spawn(
  "npx.cmd",
  ["-y", "chrome-devtools-mcp@latest", `--browser-url=${BROWSER_URL}`],
  { stdio: ["pipe", "pipe", "inherit"], shell: true }
);

let nextId = 1;
const pending = new Map();

function send(msg) {
  server.stdin.write(JSON.stringify(msg) + "\n");
}

function rpc(method, params = {}) {
  const id = nextId++;
  send({ jsonrpc: "2.0", id, method, params });
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

server.stdout.on("data", (buf) => {
  const lines = buf.toString("utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    if (!(line.startsWith("{") && line.includes("\"jsonrpc\""))) continue;
    const obj = safeJsonParse(line);
    if (!obj) continue;

    if (obj.id && pending.has(obj.id)) {
      const { resolve, reject } = pending.get(obj.id);
      pending.delete(obj.id);
      if (obj.error) reject(obj.error);
      else resolve(obj.result);
    }
  }
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractPages(text) {
  const lines = (text || "").split("\n");
  const pages = [];
  const re = /^(\d+):\s+(https?:\/\/\S+)(\s+\[selected\])?$/i;
  for (const ln of lines) {
    const m = ln.trim().match(re);
    if (!m) continue;
    pages.push({ pageId: Number(m[1]), url: m[2], selected: Boolean(m[3]) });
  }
  return pages;
}

function extractBase64FromToolResult(res) {
  // Typical patterns:
  // - content: [{type:"image", data:"...base64..."}]
  // - content: [{type:"text", text:"...data:image/png;base64,AAA..."}]
  const content = res?.content || [];

  for (const c of content) {
    if (c?.type === "image" && typeof c?.data === "string" && c.data.length > 200) {
      return c.data;
    }
  }

  for (const c of content) {
    if (c?.type === "text" && typeof c?.text === "string") {
      const t = c.text;
      const marker = "data:image/png;base64,";
      const idx = t.indexOf(marker);
      if (idx >= 0) {
        return t.slice(idx + marker.length).trim();
      }
      // sometimes plain base64 fenced
      const b64 = t.match(/[A-Za-z0-9+/=]{500,}/);
      if (b64) return b64[0];
    }
  }
  return null;
}

async function main() {
  const startedAt = new Date().toISOString();
  const metaPath = path.join(OUT_DIR, "meta.json");

  await rpc("initialize", {
    protocolVersion: "2024-11-05",
    clientInfo: { name: "hi-flicker-capture", version: "1.0.0" },
    capabilities: {}
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  const toolsList = await rpc("tools/list", {});
  const tools = toolsList?.tools ?? [];
  const tool = (name) => {
    const t = tools.find(x => x.name === name);
    if (!t) throw new Error(`Tool not found: ${name}`);
    return t.name;
  };

  const pagesRes = await rpc("tools/call", { name: tool("list_pages"), arguments: {} });
  const pagesText = pagesRes?.content?.find(c => c.type === "text")?.text ?? "";
  const pages = extractPages(pagesText);
  const match =
    pages.find(p => (p.url || "").includes(URL_CONTAINS)) ||
    pages.find(p => p.selected) ||
    pages[0];

  if (!match) throw new Error("No pages found via list_pages.");

  await rpc("tools/call", { name: tool("select_page"), arguments: { pageId: match.pageId } });

  const meta = {
    startedAt,
    outDir: OUT_DIR,
    urlContains: URL_CONTAINS,
    browserUrl: BROWSER_URL,
    pageSelected: match,
    shots: SHOTS,
    delayMs: DELAY_MS,
    files: []
  };

  for (let i = 0; i < SHOTS; i++) {
    const shotRes = await rpc("tools/call", {
      name: tool("take_screenshot"),
      arguments: { fullPage: true }
    });

    const b64 = extractBase64FromToolResult(shotRes);
    const fname = `shot_${String(i).padStart(2, "0")}.png`;
    const fpath = path.join(OUT_DIR, fname);

    if (!b64) {
      // dump raw response for debugging
      const rawPath = path.join(OUT_DIR, `shot_${String(i).padStart(2, "0")}_raw.json`);
      fs.writeFileSync(rawPath, JSON.stringify(shotRes, null, 2), "utf8");
      meta.files.push({ i, fname: null, error: "No base64 found. Wrote raw json.", raw: path.basename(rawPath) });
    } else {
      fs.writeFileSync(fpath, Buffer.from(b64, "base64"));
      meta.files.push({ i, fname });
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
  console.log("CAPTURE_DONE:", metaPath);

  server.kill();
}

main().catch((e) => {
  console.error("CAPTURE_ERROR:", e?.stack || e);
  server.kill();
});
'@

Write-Progress -Activity "Writing scripts" -Status "flicker_capture.mjs" -PercentComplete 33
Set-Content -Path $NodeFile -Value $nodeContent -Encoding UTF8

# --- Write Python analyzer ---
$pyContent = @'
import os, json, glob, math, sys
from datetime import datetime

def _ensure_pillow():
  try:
    from PIL import Image  # noqa
    return True
  except Exception:
    return False

def _install_pillow():
  import subprocess
  subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])

def load_images(folder):
  from PIL import Image
  files = sorted(glob.glob(os.path.join(folder, "shot_*.png")))
  imgs = []
  for f in files:
    img = Image.open(f).convert("RGB")
    imgs.append((f, img))
  return imgs

def diff_score(imgA, imgB, thresh=8):
  # returns: mean_abs_diff_per_channel, pct_pixels_over_thresh
  import numpy as np
  a = np.array(imgA, dtype=np.int16)
  b = np.array(imgB, dtype=np.int16)
  d = np.abs(a - b)  # HxWx3
  mean = float(d.mean())
  # pixel is "changed" if any channel exceeds thresh
  changed = (d.max(axis=2) > thresh)
  pct = float(changed.mean()) * 100.0
  return mean, pct

def main():
  out_dir = os.environ.get("HI_FLICKER_OUT", os.path.join("tools", "mcp", "_flicker_out"))
  report_path = os.path.join(out_dir, "flicker_report.json")

  if not os.path.isdir(out_dir):
    print("No output dir:", out_dir)
    sys.exit(1)

  if not _ensure_pillow():
    print("Installing Pillow...")
    _install_pillow()

  from PIL import Image  # noqa
  import numpy as np  # noqa

  imgs = load_images(out_dir)
  if len(imgs) < 2:
    print("Need at least 2 screenshots in", out_dir)
    sys.exit(2)

  pairs = []
  for i in range(len(imgs) - 1):
    f1, im1 = imgs[i]
    f2, im2 = imgs[i + 1]
    mean, pct = diff_score(im1, im2)
    pairs.append({
      "pair": [os.path.basename(f1), os.path.basename(f2)],
      "mean_abs_diff": mean,
      "pct_pixels_changed_over_thresh": pct
    })

  max_mean = max(p["mean_abs_diff"] for p in pairs)
  max_pct = max(p["pct_pixels_changed_over_thresh"] for p in pairs)
  avg_mean = sum(p["mean_abs_diff"] for p in pairs) / len(pairs)
  avg_pct = sum(p["pct_pixels_changed_over_thresh"] for p in pairs) / len(pairs)

  # Heuristics: tune as needed
  # - If a lot of pixels change frame-to-frame or mean diff high => flicker
  verdict = "stable"
  if max_pct > 0.25 or max_mean > 1.5:
    verdict = "flicker_likely"
  if max_pct > 1.0 or max_mean > 4.0:
    verdict = "flicker_confirmed"

  report = {
    "time": datetime.utcnow().isoformat() + "Z",
    "out_dir": os.path.abspath(out_dir),
    "frames": len(imgs),
    "pairs": len(pairs),
    "summary": {
      "avg_mean_abs_diff": avg_mean,
      "max_mean_abs_diff": max_mean,
      "avg_pct_pixels_changed_over_thresh": avg_pct,
      "max_pct_pixels_changed_over_thresh": max_pct,
      "verdict": verdict
    },
    "details": pairs
  }

  with open(report_path, "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2)

  print("REPORT:", report_path)
  print("VERDICT:", verdict)
  print("MAX_PCT_CHANGED:", round(max_pct, 4), "%")
  print("MAX_MEAN_DIFF:", round(max_mean, 4))

if __name__ == "__main__":
  main()
'@

Write-Progress -Activity "Writing scripts" -Status "flicker_analyze.py" -PercentComplete 66
Set-Content -Path $PyFile -Value $pyContent -Encoding UTF8
Write-Progress -Activity "Writing scripts" -Completed
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
# --- Run capture + analyze ---
Write-Host ""
Write-Host "Running capture..." -ForegroundColor Cyan
Write-Progress -Activity "Flicker test" -Status "Capturing screenshots..." -PercentComplete 10
$env:HI_FLICKER_OUT = $OutDir
$env:HI_URL_CONTAINS = $UrlContains
$env:HI_BROWSER_URL = $BrowserUrl
$env:HI_SHOTS = "$Shots"
$env:HI_DELAY_MS = "$DelayMs"

node $NodeFile | Out-Host

Write-Progress -Activity "Flicker test" -Status "Analyzing diffs (pitón)..." -PercentComplete 70
Write-Host ""
Write-Host "Running analysis (pitón)..." -ForegroundColor Cyan
python $PyFile | Out-Host

Write-Progress -Activity "Flicker test" -Completed

Write-Host ""
Write-Host "Done. Output folder:" -NoNewline
Write-Host " $OutDir" -ForegroundColor Green
Write-Host ""
Write-Host "Tip: Open report -> tools\mcp\_flicker_out\flicker_report.json" -ForegroundColor DarkGray
