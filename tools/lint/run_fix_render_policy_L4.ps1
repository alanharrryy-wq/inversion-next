param(
  [switch]$NoOpen,
  [switch]$SkipDocs
)

$ProgressPreference='Continue'
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest

function OK($m){ Write-Host ("✔ " + $m) -ForegroundColor Green }
function WARN($m){ Write-Host ("⚠ " + $m) -ForegroundColor Yellow }

$root = (git rev-parse --show-toplevel) | Select-Object -First 1
if(-not $root){ throw "Not a git repo." }
Set-Location $root

Write-Host "RUN RENDER POLICY – SUPER PRO 🥬⚡" -ForegroundColor Cyan
Write-Host ("-"*80)
OK ("Repo root: " + $root)

Write-Progress -Activity "Run" -Status "npm run lint:render" -PercentComplete 20
npm run lint:render

Write-Progress -Activity "Run" -Status "node tools/lint/render_policy_diagnose.mjs" -PercentComplete 55
node tools/lint/render_policy_diagnose.mjs | Tee-Object -FilePath tools/lint/render_policy_diagnose.output.json | Out-Host
OK "Diagnose output saved: tools/lint/render_policy_diagnose.output.json"

if(-not $SkipDocs){
  Write-Progress -Activity "Run" -Status "npm run docs:index" -PercentComplete 80
  npm run docs:index
} else {
  WARN "Skipped docs:index"
}

Write-Progress -Activity "Run" -Completed
Write-Host ("-"*80)
OK "DONE."
if(-not $NoOpen){
  try { code tools/lint/render_policy_diagnose.mjs tools/lint/render_policy.config.json } catch {}
}
