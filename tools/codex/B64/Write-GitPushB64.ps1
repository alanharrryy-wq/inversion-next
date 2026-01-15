#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$RepoDir = "F:\OneDrive\Hitech\3.Proyectos\CHAT GPT AI Estudio\repos\inversion-next",
    [string]$B64Dir = "F:\OneDrive\Hitech\3.Proyectos\CHAT GPT AI Estudio\HITECH_AISTUDIO_SYSTEM\PS1s\B64",
    [int]$ChunkKBMin = 64,
    [int]$ChunkKBMax = 64
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step([int]$Percent, [string]$Message) {
    Write-Progress -Activity "Write git-push.ps1 as Base64 Chunks (Python engine)" -Status $Message -PercentComplete $Percent
}

function Fail([string]$Message) {
    Write-Progress -Activity "Write git-push.ps1 as Base64 Chunks (Python engine)" -Completed
    throw $Message
}

Write-Step 5 "Validando rutas"
if (-not (Test-Path -LiteralPath $RepoDir)) { Fail "RepoDir no existe: $RepoDir" }
if (-not (Test-Path -LiteralPath $B64Dir)) { New-Item -ItemType Directory -Force -Path $B64Dir | Out-Null }

$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { Fail "python no está en PATH. Instala pitón (Python) o arregla tu PATH." }

$writer = Join-Path $B64Dir "codex_b64_writer.py"
$lib = Join-Path $B64Dir "codex_b64_lib.py"
if (-not (Test-Path -LiteralPath $writer)) { Fail "No encuentro: $writer" }
if (-not (Test-Path -LiteralPath $lib)) { Fail "No encuentro: $lib" }

[int]$chunkKB = $ChunkKBMin
if ($ChunkKBMax -gt $ChunkKBMin) {
    $chunkKB = Get-Random -Minimum $ChunkKBMin -Maximum ($ChunkKBMax + 1)
}
[int]$chunkSize = $chunkKB * 1024

Write-Step 35 "Corriendo pitón (Python) writer"
$env:PYTHONUTF8 = "1"

& $py.Source $writer --repo-dir $RepoDir --b64-dir $B64Dir --chunk-size $chunkSize
$exit = $LASTEXITCODE
if ($exit -ne 0) { Fail ("Writer falló con exit code: {0}" -f $exit) }

Write-Step 100 "Listo"
Write-Progress -Activity "Write git-push.ps1 as Base64 Chunks (Python engine)" -Completed
