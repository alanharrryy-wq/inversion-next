#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$B64Dir = "F:\OneDrive\Hitech\3.Proyectos\CHAT GPT AI Estudio\HITECH_AISTUDIO_SYSTEM\PS1s\B64",
    [string]$RepoDir = "F:\OneDrive\Hitech\3.Proyectos\CHAT GPT AI Estudio\repos\inversion-next"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step([int]$Percent, [string]$Message) {
    Write-Progress -Activity "Apply Latest git-push from Codex (Python engine)" -Status $Message -PercentComplete $Percent
}

function Fail([string]$Message) {
    Write-Progress -Activity "Apply Latest git-push from Codex (Python engine)" -Completed
    throw $Message
}

Write-Step 5 "Validando rutas"
if (-not (Test-Path -LiteralPath $B64Dir)) { Fail "B64Dir no existe: $B64Dir" }
if (-not (Test-Path -LiteralPath $RepoDir)) { Fail "RepoDir no existe: $RepoDir" }

$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { Fail "python no está en PATH. Instala pitón (Python) o arregla tu PATH." }

$applier = Join-Path $B64Dir "codex_b64_apply.py"
$lib = Join-Path $B64Dir "codex_b64_lib.py"
if (-not (Test-Path -LiteralPath $applier)) { Fail "No encuentro: $applier" }
if (-not (Test-Path -LiteralPath $lib)) { Fail "No encuentro: $lib" }

$target = Join-Path $RepoDir "git-push.ps1"

Write-Step 35 "Aplicando latest (decode + write atómico)"
$env:PYTHONUTF8 = "1"

& $py.Source $applier --b64-dir $B64Dir --repo-dir $RepoDir --target-file $target
$exit = $LASTEXITCODE
if ($exit -ne 0) { Fail ("Apply falló con exit code: {0}" -f $exit) }

Write-Step 100 "Listo"
Write-Progress -Activity "Apply Latest git-push from Codex (Python engine)" -Completed
