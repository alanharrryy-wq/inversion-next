#requires -Version 7.0
[CmdletBinding()]
param(
  [string]$B64Dir = "F:\OneDrive\Hitech\3.Proyectos\CHAT GPT AI Estudio\HITECH_AISTUDIO_SYSTEM\PS1s\B64",
  [string]$RepoPs1 = "F:\OneDrive\Hitech\3.Proyectos\CHAT GPT AI Estudio\repos\inversion-next\git-push.ps1",
  [int]$TailPreviewLines = 20
)

$ErrorActionPreference = "Stop"

function Write-Step([int]$Percent, [string]$Message) {
  Write-Progress -Activity "Decode Latest git-push Base64" -Status $Message -PercentComplete $Percent
  Write-Host ("[{0,3}%] {1}" -f $Percent, $Message)
}

function Fail([string]$Message) {
  Write-Progress -Activity "Decode Latest git-push Base64" -Completed
  throw $Message
}

Write-Step 5 "Checking folder: $B64Dir"
if (-not (Test-Path $B64Dir)) { Fail "B64 folder not found: $B64Dir" }

$latest = Get-ChildItem -Path $B64Dir -Filter "git-push_b64_run_*.txt" -File -ErrorAction Stop |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $latest) { Fail "No git-push_b64_run_*.txt found in: $B64Dir" }

Write-Step 15 ("Latest file: {0}" -f $latest.FullName)

# Load decoder script in same folder (Decode-CodexB64Chunks.ps1)
$decoder = Join-Path $B64Dir "Decode-CodexB64Chunks.ps1"
if (-not (Test-Path $decoder)) {
  Fail "Decoder not found: $decoder`nCreate it (Decode-CodexB64Chunks.ps1) in the same folder first."
}

Write-Step 25 "Running decoder"
& pwsh -NoProfile -ExecutionPolicy Bypass -File $decoder `
  -InputPath $latest.FullName `
  -OutputPath $RepoPs1 `
  -TailPreviewLines $TailPreviewLines

Write-Step 100 "Done"
Write-Progress -Activity "Decode Latest git-push Base64" -Completed

Write-Host ""
Write-Host "✅ Finished decoding latest base64 to:" -ForegroundColor Green
Write-Host ("- {0}" -f $RepoPs1)
Write-Host ("- From: {0}" -f $latest.FullName)
