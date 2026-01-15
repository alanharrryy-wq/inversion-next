#requires -Version 7.0
[CmdletBinding()]
param(
  [switch]$Push
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Fail([string]$m) { throw $m }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail "Falta git en PATH" }

$root = git rev-parse --show-toplevel 2>$null
if (-not $root) { Fail "No estás dentro de un repo git" }
$root = $root.Trim()
Set-Location $root

$branch = git branch --show-current
if (-not $branch) { Fail "No pude detectar branch actual" }
Write-Host "Branch: $branch" -ForegroundColor Cyan

$targetDir = Join-Path $root "tools\codex\B64"

if (-not (Test-Path -LiteralPath $targetDir)) {
  Write-Host "No existe: tools\codex\B64 (nada que borrar)" -ForegroundColor Yellow
  exit 0
}

Write-Host "Borrando tracking + archivos: tools\codex\B64" -ForegroundColor Yellow

git rm -r --force "tools/codex/B64" | Out-Null

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "chore: remove b64 tooling @ $ts" | Out-Null

if ($Push) {
  git push
}

Write-Host "DONE ✅ B64 eliminado del repo." -ForegroundColor Green
