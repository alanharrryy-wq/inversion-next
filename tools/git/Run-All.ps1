#requires -Version 7.0
[CmdletBinding()]
param(
  [ValidateSet("patch","minor","major")]
  [string]$Bump = "patch",

  [switch]$SkipTests,
  [switch]$SkipDoctor,
  [switch]$AllowDirtyMain,

  [string]$DefaultBranch = "main",
  [string]$ChangelogPath = "CHANGELOG.md"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. "$PSScriptRoot\Git-Utils.ps1"

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "Run-All @ $ts" -ForegroundColor Cyan

Write-Step 5 "Verificando comandos"
Require-Cmd git

$repoRoot = Get-RepoRoot
Set-Location $repoRoot

$branch = Get-CurrentBranch
Write-Host "Branch actual: $branch" -ForegroundColor Gray

if ($branch -eq $DefaultBranch -and -not $AllowDirtyMain) {
  $dirty = git status --porcelain
  if ($dirty) { Fail "Estás en '$DefaultBranch' con cambios. Usa branch o pasa -AllowDirtyMain." }
}

Write-Step 12 "Sanity: working tree limpio"
Ensure-CleanWorkingTree

# --- Doctor ---
if (-not $SkipDoctor) {
  $doctor = Join-Path $repoRoot "tools\git\Doctor.ps1"
  if (Test-Path -LiteralPath $doctor) {
    Write-Step 18 "Doctor.ps1"
    & pwsh -NoProfile -ExecutionPolicy Bypass -File $doctor
    if ($LASTEXITCODE -ne 0) { Fail "Doctor falló" }
  } else {
    Write-Step 18 "Doctor: no existe tools\git\Doctor.ps1 (skip)"
  }
} else {
  Write-Step 18 "Doctor skip"
}

# --- Tests ---
if (-not $SkipTests) {
  Write-Step 30 "Sanity: Node + deps"
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Falta node en PATH" }

  Write-Step 40 "Tests (si existe script test)"
  $pkgPath = Detect-PackageJsonPath
  if ($pkgPath) {
    $pkg = Read-JsonFile $pkgPath
    $hasTest = $false
    if ($pkg.scripts -and $pkg.scripts.test) { $hasTest = $true }

    if ($hasTest) {
      try {
        Require-Cmd (Choose-PackageManager)
      } catch {
        Fail $_.Exception.Message
      }
      Run-NodeScript "pm" "test"
    } else {
      Write-Host "WARN: package.json sin script test. Skip tests." -ForegroundColor Yellow
    }
  } else {
    Write-Host "WARN: No hay package.json en root. Skip tests." -ForegroundColor Yellow
  }
} else {
  Write-Step 40 "Tests skip"
}

# --- Auto-version (package.json) ---
Write-Step 60 "Auto-version"
$pkgPath2 = Detect-PackageJsonPath
if (-not $pkgPath2) { Fail "No encontré package.json en root. Auto-version requiere eso." }

$pkg2 = Read-JsonFile $pkgPath2
if (-not $pkg2.version) { Fail "package.json no tiene 'version'." }

$oldV = [string]$pkg2.version
$newV = Bump-SemVer $oldV $Bump

$pkg2.version = $newV
Write-JsonFile $pkgPath2 $pkg2

git add package.json | Out-Null

# --- Auto-changelog ---
Write-Step 72 "Auto-changelog"
$lastTag = Get-LastTag
$changelogAbs = Join-Path $repoRoot $ChangelogPath
Update-Changelog -Version $newV -SinceTag $lastTag -ChangelogPath $changelogAbs
git add $ChangelogPath | Out-Null

# --- Commit version + changelog ---
Write-Step 80 "Commit (version + changelog)"
$commitMsg = "chore(release): v$newV"
git commit -m $commitMsg | Out-Null

# --- Auto-tag ---
Write-Step 88 "Auto-tag"
$tag = "v$newV"
Ensure-Tag-Not-Exists $tag
git tag -a $tag -m "Release $tag" | Out-Null

# --- Push (branch + tags) ---
Write-Step 95 "Push branch + tags"
git push
if ($LASTEXITCODE -ne 0) { Fail "git push falló" }

git push --tags
if ($LASTEXITCODE -ne 0) { Fail "git push --tags falló" }

Write-Step 100 "DONE"
Write-Progress -Activity "Run-All Git Pipeline" -Completed

Write-Host "DONE ✅" -ForegroundColor Green
Write-Host "Version: $oldV -> $newV"
Write-Host "Tag: $tag"
Write-Host "Changelog: $ChangelogPath"
