#requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory=$true)]
  [string]$Slide,               # e.g. slide-02

  [Parameter(Mandatory=$true)]
  [ValidateSet("triage","capture-reference","reference-diff","element-map","auto-measure")]
  [string]$Tool,

  [int]$VitePort = 5177,

  # Si no lo pasas, intenta leerlo del config.json de la slide
  [string]$TargetUrl = "",

  # Si no lo pasas, usa lo del config.json o fallback a "localhost:5177"
  [string]$UrlContains = "",

  # Chromium/Chrome (si lo dejas vacío, busca Playwright + Chrome + Edge)
  [string]$BrowserExe = "",

  # DevTools endpoint
  [string]$BrowserUrl = "http://127.0.0.1:9222",

  # Si true, lanza Chromium con 9222 automáticamente
  [switch]$LaunchBrowser,

  # Si true, si falta reference.png y el tool lo necesita, corre capture-reference primero
  [switch]$EnsureReference = $true,

  # Si true, mata 9222 antes de arrancar navegador
  [switch]$Kill9222 = $true,

  # Abre la URL target en el navegador cuando lanza
  [switch]$OpenTarget
)

function Step($i, $n, $msg) {
  Write-Host ("==[{0}/{1}] {2}" -f $i, $n, $msg) -ForegroundColor Cyan
}

function Kill-Port([int]$port) {
  $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  if (-not $conns) { return }
  $procIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $procIds) {
    try { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } catch {}
  }
}

function Wait-HttpOk([string]$url, [int]$seconds = 30) {
  $end = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $end) {
    try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true } catch { Start-Sleep -Milliseconds 500 }
  }
  return $false
}

function DevToolsOk([string]$browserUrl) {
  $v = ($browserUrl.TrimEnd("/") + "/json/version")
  try { Invoke-RestMethod $v -TimeoutSec 3 | Out-Null; return $true } catch { return $false }
}

function Find-BrowserExe {
  param([string]$preferred)

  if ($preferred -and (Test-Path $preferred)) { return $preferred }

  $hits = @()

  # Playwright
  $pw = Join-Path $env:LOCALAPPDATA "ms-playwright"
  if (Test-Path $pw) {
    $hits += Get-ChildItem -Path $pw -Recurse -Filter "chrome.exe" -File -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty FullName
  }

  # Chrome
  $hits += @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  ) | Where-Object { Test-Path $_ }

  # Edge
  $hits += @(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe"
  ) | Where-Object { Test-Path $_ }

  $hits = @($hits | Select-Object -Unique)
  if ($hits.Count -eq 0) { throw "No encontré navegador Chromium (Playwright/Chrome/Edge). Pasa -BrowserExe." }

  # Preferir Playwright chromium
  $pwPick = $hits | Where-Object { $_ -like "*ms-playwright*\chromium-*\chrome-win*\chrome.exe" -or $_ -like "*ms-playwright*\chromium-*\chrome-win64*\chrome.exe" } | Select-Object -First 1
  if ($pwPick) { return $pwPick }

  return ($hits | Select-Object -First 1)
}

function Read-SlideConfig {
  param([string]$repo, [string]$slide)

  $cfgPath = Join-Path $repo ("src\slides\{0}\tools\mcp\config.json" -f $slide)
  if (!(Test-Path $cfgPath)) {
    return [pscustomobject]@{ hasConfig=$false; cfgPath=$cfgPath; urlContains=""; refRel="ref/reference.png" }
  }

  $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
  $urlContains = ""
  if ($cfg.urlContains) { $urlContains = [string]$cfg.urlContains }

  $refRel = "ref/reference.png"
  if ($cfg.reference -and $cfg.reference.png) { $refRel = [string]$cfg.reference.png }

  return [pscustomobject]@{ hasConfig=$true; cfgPath=$cfgPath; urlContains=$urlContains; refRel=$refRel }
}

# === repo root (hardcode por tu setup) ===
$repo = "F:\repos\inversion-next"
if (!(Test-Path $repo)) { throw "Repo no existe: $repo" }

$cfgInfo = Read-SlideConfig -repo $repo -slide $Slide

if (-not $UrlContains -or $UrlContains.Trim() -eq "") {
  if ($cfgInfo.urlContains -and $cfgInfo.urlContains.Trim() -ne "") {
    $UrlContains = $cfgInfo.urlContains
  } else {
    $UrlContains = "localhost:$VitePort"
  }
}

if (-not $TargetUrl -or $TargetUrl.Trim() -eq "") {
  # Si no hay TargetUrl, abrimos algo razonable para deck, pero loose:
  $TargetUrl = "http://localhost:$VitePort/#/deck?s=2"
}

$refPng = Join-Path $repo ("src\slides\{0}\tools\mcp\{1}" -f $Slide, $cfgInfo.refRel)

$N = 10
$i = 0

$i++; Step $i $N "Validando inputs"
Write-Host ("Slide: {0} | Tool: {1}" -f $Slide, $Tool) -ForegroundColor Green
Write-Host ("UrlContains: {0}" -f $UrlContains) -ForegroundColor DarkGray
if ($cfgInfo.hasConfig) { Write-Host ("Config: {0}" -f $cfgInfo.cfgPath) -ForegroundColor DarkGray }

$i++; Step $i $N "Asegurando Vite en :$VitePort"
if (-not (Wait-HttpOk "http://localhost:$VitePort" 2)) {
  Write-Host "Vite no responde. Lanzando npm run dev..." -ForegroundColor Yellow
  Start-Process -WorkingDirectory $repo -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev -- --port $VitePort" | Out-Null
  if (-not (Wait-HttpOk "http://localhost:$VitePort" 45)) {
    throw "Vite no levantó en http://localhost:$VitePort después de 45s."
  }
}
Write-Host "Vite OK ✅" -ForegroundColor Green

$i++; Step $i $N "Resolviendo BrowserExe"
$exe = Find-BrowserExe -preferred $BrowserExe
Write-Host ("BrowserExe: {0}" -f $exe) -ForegroundColor DarkGray

if ($LaunchBrowser) {
  $i++; Step $i $N "Lanzando navegador con DevTools (9222)"
  if ($Kill9222) { Kill-Port 9222 }

  $profileRoot = Join-Path $env:TEMP "hi-mcp-chrome-profile"
  New-Item -ItemType Directory -Force -Path $profileRoot | Out-Null

  $args = @(
    "--remote-debugging-port=9222",
    "--remote-debugging-address=127.0.0.1",
    "--user-data-dir=$profileRoot",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-features=Translate,AutofillServerCommunication"
  )

  if ($OpenTarget) { $args += $TargetUrl }

  Start-Process -FilePath $exe -ArgumentList $args | Out-Null
  Start-Sleep -Seconds 2
}

$i++; Step $i $N "Validando DevTools en $BrowserUrl"
if (-not (DevToolsOk $BrowserUrl)) {
  throw "DevTools no respondió en $BrowserUrl. Usa -LaunchBrowser -OpenTarget o revisa puerto 9222."
}
Write-Host "DevTools OK ✅" -ForegroundColor Green

$i++; Step $i $N "Set env vars MCP"
$env:HI_BROWSER_URL = $BrowserUrl
$env:HI_URL_CONTAINS = $UrlContains

$i++; Step $i $N "Ensure reference (si aplica)"
$needsRef = ($Tool -in @("triage","reference-diff"))
if ($EnsureReference -and $needsRef -and !(Test-Path $refPng)) {
  Write-Host ("Falta reference.png: {0}" -f $refPng) -ForegroundColor Yellow
  Write-Host "Corriendo capture-reference primero..." -ForegroundColor Yellow
  Push-Location $repo
  try {
    node tools/mcp/runner/run.mjs --slide $Slide --tool capture-reference --yes --profile debug
  } finally { Pop-Location }

  if (!(Test-Path $refPng)) { throw "capture-reference terminó pero no apareció: $refPng" }
}
if (Test-Path $refPng) { Write-Host "Reference OK ✅" -ForegroundColor Green }

$i++; Step $i $N "Ejecutando tool: $Tool"
Push-Location $repo
try {
  node tools/mcp/runner/run.mjs --slide $Slide --tool $Tool --profile debug
} finally { Pop-Location }

$i++; Step $i $N "Mostrando último outDir"
$base = Join-Path $repo ("src\slides\{0}\tools\mcp\out" -f $Slide)
$last = Get-ChildItem $base -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
if ($last) {
  Write-Host ("OUT: " + $last.FullName) -ForegroundColor Green
  $sum = Join-Path $last.FullName "TRIAGE_SUMMARY.md"
  if (Test-Path $sum) {
    Write-Host "TRIAGE_SUMMARY.md (primeras 60 líneas):" -ForegroundColor Cyan
    Get-Content $sum -TotalCount 60
  }
}

Write-Host ("Fecha/Hora: {0}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss")) -ForegroundColor DarkGray
