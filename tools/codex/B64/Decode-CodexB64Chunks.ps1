#requires -Version 7.0
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$InputPath,

    [Parameter(Mandatory)]
    [string]$OutputPath,

    [string]$RepoDir = "F:\OneDrive\Hitech\3.Proyectos\CHAT GPT AI Estudio\repos\inversion-next",

    [switch]$AllowPartial
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step([int]$Percent, [string]$Message) {
    Write-Progress -Activity "Decode Codex Base64 Chunks (Python engine)" -Status $Message -PercentComplete $Percent
}

function Fail([string]$Message) {
    Write-Progress -Activity "Decode Codex Base64 Chunks (Python engine)" -Completed
    throw $Message
}

Write-Step 5 "Validando input/output"
if (-not (Test-Path -LiteralPath $InputPath)) { Fail "InputPath no existe: $InputPath" }
if (-not (Test-Path -LiteralPath $RepoDir)) { Fail "RepoDir no existe: $RepoDir" }

$B64Dir = Split-Path -Parent $InputPath

$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { Fail "python no está en PATH. Instala pitón (Python) o arregla tu PATH." }

$applier = Join-Path $B64Dir "codex_b64_apply.py"
$lib = Join-Path $B64Dir "codex_b64_lib.py"
if (-not (Test-Path -LiteralPath $applier)) { Fail "No encuentro: $applier" }
if (-not (Test-Path -LiteralPath $lib)) { Fail "No encuentro: $lib" }

Write-Step 35 "Decodificando (wrapper de compat)"
$env:PYTHONUTF8 = "1"

$allow = @()
if ($AllowPartial) { $allow = @("--allow-partial") }

& $py.Source $applier --b64-dir $B64Dir --repo-dir $RepoDir --target-file $OutputPath --input-path $InputPath @allow
$exit = $LASTEXITCODE
if ($exit -ne 0) { Fail ("Decode/Apply falló con exit code: {0}" -f $exit) }

Write-Step 100 "Listo"
Write-Progress -Activity "Decode Codex Base64 Chunks (Python engine)" -Completed
