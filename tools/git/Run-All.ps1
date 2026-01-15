#requires -Version 7.0
[CmdletBinding()]
param(
  [ValidateSet("patch","minor","major")]
  [string]$Bump = "patch",

  # Si lo corres desde otro branch, hace merge a main/master (si está habilitado).
  [switch]$AutoMergeToMain = $true,

  # Stash automático SOLO tracked (sin -u). Evita el infierno de Windows con folders untracked candados.
  [switch]$AutoStash = $true,

  # Checks (best effort: si no existe el script en package.json, se salta con WARN)
  [switch]$RunDoctor = $true,
  [switch]$RunFormatCheck = $true,
  [switch]$RunLint = $true,
  [switch]$RunTypecheck = $true,
  [switch]$RunTests = $true,
  [switch]$RunBuild = $true,

  # Si Vitest dice "No test files found", no bloquea.
  [switch]$SmartTests = $true,

  # GitHub Release (gh) best effort
  [switch]$AutoGitHubRelease = $true,

  [string]$ChangelogPath = "CHANGELOG.md",
  [string]$PreferredMain = "main",
  [string]$FallbackMain = "master"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Step([int]$pct,[string]$msg){ Write-Progress -Activity "Run-All Release Pipeline" -Status $msg -PercentComplete $pct }
function DoneProgress(){ Write-Progress -Activity "Run-All Release Pipeline" -Completed }
function Fail([string]$msg){ DoneProgress; throw $msg }
function CmdExists([string]$name){ return [bool](Get-Command $name -ErrorAction SilentlyContinue) }

function GetRepoRoot(){
  $root = git rev-parse --show-toplevel 2>$null
  if (-not $root) { Fail "No estás dentro de un repo git." }
  return $root.Trim()
}
function GetBranch(){
  $b = git branch --show-current
  if (-not $b) { Fail "No pude detectar el branch actual." }
  return $b.Trim()
}

# Ignora mugrero local SIN commitearlo (para que git status y stash ni lo toquen)
function EnsureLocalExclude([string[]]$lines){
  $root = GetRepoRoot
  $p = Join-Path $root ".git\info\exclude"
  if (-not (Test-Path -LiteralPath $p)) { New-Item -ItemType File -Force -Path $p | Out-Null }
  foreach ($l in $lines) {
    if (-not (Select-String -LiteralPath $p -SimpleMatch -Quiet -Pattern $l)) {
      Add-Content -LiteralPath $p -Value $l -Encoding utf8
    }
  }
}

# Solo permitimos estos untracked (todo lo demás es sospechoso y debe bloquear release)
function IsAllowedUntracked([string]$path){
  $p = $path.Replace("\","/").Trim()
  if ($p.StartsWith("tools/codex/B64/")) { return $true }
  if ($p -like "tools/git/run-all*.log") { return $true }
  return $false
}

function GetPorcelainLines(){
  $lines = @(git status --porcelain)
  return $lines
}

function GetDirtyLines(){
  $lines = GetPorcelainLines
  $dirty = New-Object System.Collections.Generic.List[string]
  foreach ($ln in $lines) {
    if ($ln.StartsWith("?? ")) {
      $p = $ln.Substring(3).Trim()
      if (-not (IsAllowedUntracked $p)) { $dirty.Add($ln) }
    } else {
      $dirty.Add($ln)
    }
  }
  return ,$dirty.ToArray()
}
function IsDirty(){ return ((GetDirtyLines).Count -gt 0) }

function DetectMainBranch([string]$prefer,[string]$fallback){
  git fetch --all --tags | Out-Null
  git show-ref --verify --quiet "refs/remotes/origin/$prefer"
  if ($LASTEXITCODE -eq 0) { return $prefer }
  git show-ref --verify --quiet "refs/remotes/origin/$fallback"
  if ($LASTEXITCODE -eq 0) { return $fallback }
  return $prefer
}

function EnsureUpToDate([string]$branch){
  Step 18 "Actualizando origin/$branch (ff-only)"
  git pull --ff-only | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail "git pull --ff-only falló. Actualiza tu branch manualmente." }
}

function MergeBranchIntoMain([string]$fromBranch,[string]$mainBranch){
  if ($fromBranch -eq $mainBranch) { return }
  if (-not $AutoMergeToMain) { Fail "Estás en '$fromBranch'. Corre en '$mainBranch' o habilita -AutoMergeToMain." }

  Step 22 "Checkout $mainBranch"
  git checkout $mainBranch | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail "No pude hacer checkout a $mainBranch" }

  EnsureUpToDate $mainBranch

  Step 28 "Merge '$fromBranch' -> '$mainBranch'"
  git merge --no-ff $fromBranch -m "chore: merge $fromBranch for release" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    git merge --abort | Out-Null
    git checkout $fromBranch | Out-Null
    Fail "Merge con conflictos. Resuélvelos y vuelve a correr Run-All."
  }
}

# AutoStash SOLO tracked (sin -u) para evitar el prompt de borrado en Windows
function StashIfNeeded([string]$startBranch){
  if (-not $AutoStash) { return $null }

  # Si hay untracked fuera de allowlist, bloquea. No queremos releases con basura.
  $porc = GetPorcelainLines
  $badUntracked = @()
  foreach ($ln in $porc) {
    if ($ln.StartsWith("?? ")) {
      $p = $ln.Substring(3).Trim()
      if (-not (IsAllowedUntracked $p)) { $badUntracked += $p }
    }
  }
  if ($badUntracked.Count -gt 0) {
    Fail ("Hay untracked NO permitidos (limpia o ignora):`n - " + ($badUntracked -join "`n - "))
  }

  if (-not (IsDirty)) { return $null }

  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $msg = "run-all: autostash(tracked) @ $ts (from $startBranch)"
  Step 10 "AutoStash: guardando tracked (sin -u)"
  git stash push -m $msg | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail "git stash falló" }
  return $msg
}
function PopStashIfPresent([string]$stashMsg){
  if (-not $stashMsg) { return }
  Step 96 "AutoStash: restaurando"
  git stash pop | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "WARN: stash pop con conflictos. Revisa: git status" -ForegroundColor Yellow
  }
}
function EnsureCleanOrFail(){
  $d = GetDirtyLines
  if ($d.Count -gt 0) { Fail ("Working tree sucio:`n" + ($d -join "`n")) }
}

function ChoosePM(){
  $root = GetRepoRoot
  if (Test-Path (Join-Path $root "pnpm-lock.yaml")) { return "pnpm" }
  if (Test-Path (Join-Path $root "yarn.lock")) { return "yarn" }
  if (Test-Path (Join-Path $root "package-lock.json")) { return "npm" }
  return "npm"
}
function EnsureDeps([string]$pm){
  Step 34 "Dependencias: verificando node_modules"
  $root = GetRepoRoot
  $nm = Join-Path $root "node_modules"
  if (Test-Path $nm) { return }

  Step 36 "Dependencias: instalando ($pm)"
  switch ($pm) {
    "pnpm" { if (-not (CmdExists pnpm)) { Fail "Falta pnpm" }; & pnpm i }
    "yarn" { if (-not (CmdExists yarn)) { Fail "Falta yarn" }; & yarn }
    default { if (-not (CmdExists npm)) { Fail "Falta npm" }; if (Test-Path (Join-Path $root "package-lock.json")) { & npm ci } else { & npm i } }
  }
  if ($LASTEXITCODE -ne 0) { Fail "Instalación de dependencias falló" }
}

function ReadPkgJson(){
  $root = GetRepoRoot
  $p = Join-Path $root "package.json"
  if (-not (Test-Path $p)) { Fail "No encontré package.json en root." }
  return (Get-Content -LiteralPath $p -Raw -Encoding utf8 | ConvertFrom-Json)
}
function WritePkgJson($obj){
  $root = GetRepoRoot
  $p = Join-Path $root "package.json"
  $json = $obj | ConvertTo-Json -Depth 50
  $json = $json.Replace("`r`n","`n").Replace("`r","`n")
  [System.IO.File]::WriteAllText($p, $json + "`n", (New-Object System.Text.UTF8Encoding($false)))
}
function BumpSemVer([string]$v,[string]$bump){
  if ($v -notmatch '^\d+\.\d+\.\d+$') { Fail "Versión inválida: $v" }
  $a = $v.Split(".") | ForEach-Object { [int]$_ }
  $maj=$a[0]; $min=$a[1]; $pat=$a[2]
  switch ($bump) {
    "major" { $maj++; $min=0; $pat=0 }
    "minor" { $min++; $pat=0 }
    default { $pat++ }
  }
  return "$maj.$min.$pat"
}
function ScriptExists($pkg,[string]$name){ try { return [bool]($pkg.scripts.$name) } catch { return $false } }

function RunNpmScript([string]$pm,[string]$name,[switch]$SmartNoTests){
  $pkg = ReadPkgJson
  if (-not (ScriptExists $pkg $name)) { Write-Host "WARN: no existe script '$name' (skip)" -ForegroundColor Yellow; return }

  Step 0 "Corriendo '$name' ($pm)"
  $out=@(); $code=0
  try {
    switch ($pm) {
      "pnpm" { $out = & pnpm -s run $name 2>&1; $code=$LASTEXITCODE }
      "yarn" { $out = & yarn -s $name 2>&1; $code=$LASTEXITCODE }
      default { $out = & npm run $name 2>&1; $code=$LASTEXITCODE }
    }
  } catch { $out=@($_.Exception.Message); $code=1 }

  if ($code -ne 0) {
    $txt = ($out -join "`n")
    $noTests = $txt -match "No test files found" -or $txt -match "No tests found"
    if ($SmartNoTests -and $name -eq "test" -and $noTests) { Write-Host "WARN: No test files found (SmartTests). Continúo." -ForegroundColor Yellow; return }
    Write-Host $txt
    Fail "$name falló ($pm)"
  }
}

function EnsureChangelog([string]$path){
  if (-not (Test-Path -LiteralPath $path)) {
    [System.IO.File]::WriteAllText($path, "# Changelog`n`n", (New-Object System.Text.UTF8Encoding($false)))
  }
}
function GetLastTag(){
  $t = git describe --tags --abbrev=0 2>$null
  if ($LASTEXITCODE -ne 0) { return $null }
  return $t.Trim()
}
function GetCommitLines([string]$sinceTag){
  if ([string]::IsNullOrWhiteSpace($sinceTag)) { return git log --pretty=format:"- %s (%h)" }
  return git log "$sinceTag..HEAD" --pretty=format:"- %s (%h)"
}
function UpdateChangelog([string]$newVersion,[string]$sinceTag,[string]$path){
  EnsureChangelog $path
  $date = Get-Date -Format "yyyy-MM-dd"
  $header = "## v$newVersion ($date)"
  $lines = GetCommitLines $sinceTag
  if (-not $lines) { $lines=@("- (sin commits)") }

  $block = @($header,"") + $lines + @("","")
  $blockText = ($block -join "`n") + "`n"

  $old = (Get-Content -LiteralPath $path -Raw -Encoding utf8).Replace("`r`n","`n").Replace("`r","`n")
  if ($old -match [regex]::Escape($header)) { Fail "Changelog ya tiene entrada para $header" }

  if ($old.StartsWith("# Changelog")) {
    $idx = $old.IndexOf("`n`n")
    if ($idx -ge 0) {
      $prefix = $old.Substring(0, $idx + 2)
      $rest = $old.Substring($idx + 2)
      [System.IO.File]::WriteAllText($path, $prefix + $blockText + $rest, (New-Object System.Text.UTF8Encoding($false)))
      return
    }
  }
  [System.IO.File]::WriteAllText($path, $blockText + $old, (New-Object System.Text.UTF8Encoding($false)))
}
function EnsureTagNotExists([string]$tag){ if (git tag -l $tag) { Fail "Tag ya existe: $tag" } }
function PushFollowTags([string]$branch){
  Step 92 "Push: branch + follow-tags"
  git push origin $branch --follow-tags | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail "git push falló" }
}
function TryGitHubRelease([string]$tag,[string]$changelogPath,[string]$version){
  if (-not $AutoGitHubRelease) { return }
  if (-not (CmdExists gh)) { return }
  Step 98 "GitHub Release (gh)"
  $txt = (Get-Content -LiteralPath $changelogPath -Raw -Encoding utf8).Replace("`r`n","`n").Replace("`r","`n")
  $header = "## v$version"
  $start = $txt.IndexOf($header)
  if ($start -lt 0) { return }
  $after = $txt.Substring($start)
  $next = $after.IndexOf("`n## ", 5)
  $section = if ($next -gt 0) { $after.Substring(0, $next).Trim() } else { $after.Trim() }
  try { & gh release create $tag -t $tag -n $section | Out-Null } catch { Write-Host "WARN: gh release create falló (no bloquea)." -ForegroundColor Yellow }
}

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "Run-All @ $ts" -ForegroundColor Cyan

if (-not (CmdExists git)) { Fail "Falta git" }
if (-not (CmdExists node)) { Fail "Falta node" }
if (-not (CmdExists npm) -and -not (CmdExists pnpm) -and -not (CmdExists yarn)) { Fail "No veo npm/pnpm/yarn" }

$repoRoot = GetRepoRoot
Set-Location $repoRoot

EnsureLocalExclude @("tools/codex/B64/","tools/git/run-all*.log")

$startBranch = GetBranch
$mainBranch = DetectMainBranch $PreferredMain $FallbackMain

Step 5 "Branch: $startBranch | Main: $mainBranch"

$stashMsg = $null
try {
  Step 12 "Fetch + tags"
  git fetch --all --tags | Out-Null

  $stashMsg = StashIfNeeded $startBranch

  MergeBranchIntoMain $startBranch $mainBranch

  Step 30 "Sanity: clean"
  EnsureCleanOrFail

  $pm = ChoosePM
  Step 32 "PM: $pm"
  EnsureDeps $pm

  if ($RunDoctor) {
    $doctor = Join-Path $repoRoot "tools\git\Doctor.ps1"
    if (Test-Path -LiteralPath $doctor) {
      Step 38 "Doctor.ps1"
      & pwsh -NoProfile -ExecutionPolicy Bypass -File $doctor
      if ($LASTEXITCODE -ne 0) { Fail "Doctor falló" }
      EnsureCleanOrFail
    } else {
      Write-Host "WARN: Doctor.ps1 no existe (skip)" -ForegroundColor Yellow
    }
  }

  if ($RunFormatCheck) { RunNpmScript $pm "format:check" }
  if ($RunLint)        { RunNpmScript $pm "lint" }
  if ($RunTypecheck)   { RunNpmScript $pm "typecheck" }
  if ($RunTests)       { RunNpmScript $pm "test" -SmartNoTests:$SmartTests }
  if ($RunBuild)       { RunNpmScript $pm "build" }

  Step 55 "Sanity: clean after checks"
  EnsureCleanOrFail

  Step 62 "Auto-version ($Bump)"
  $pkg = ReadPkgJson
  $oldV = [string]$pkg.version
  if (-not $oldV) { Fail "package.json sin version" }
  $newV = BumpSemVer $oldV $Bump
  $pkg.version = $newV
  WritePkgJson $pkg
  git add package.json | Out-Null

  Step 72 "Auto-changelog"
  $lastTag = GetLastTag
  $changelogAbs = Join-Path $repoRoot $ChangelogPath
  UpdateChangelog $newV $lastTag $changelogAbs
  git add $ChangelogPath | Out-Null

  Step 80 "Commit release"
  git commit -m "chore(release): v$newV" | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail "git commit release falló" }

  Step 86 "Auto-tag"
  $tag = "v$newV"
  EnsureTagNotExists $tag
  git tag -a $tag -m "Release $tag" | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail "git tag falló" }

  PushFollowTags $mainBranch
  TryGitHubRelease $tag $changelogAbs $newV

  Step 100 "DONE"
  DoneProgress
  Write-Host "DONE ✅" -ForegroundColor Green
  Write-Host "Main: $mainBranch"
  Write-Host "Version: $oldV -> $newV"
  Write-Host "Tag: $tag"
  Write-Host "Changelog: $ChangelogPath"
}
finally {
  if ($startBranch -ne (GetBranch)) {
    Step 95 "Regresando a $startBranch"
    git checkout $startBranch | Out-Null
  }
  PopStashIfPresent $stashMsg
  DoneProgress
}
