#requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  $root = git rev-parse --show-toplevel 2>$null
  if (-not $root) { throw "No estás dentro de un repo git." }
  return $root.Trim()
}

function Write-Step([int]$Percent, [string]$Message) {
  Write-Progress -Activity "Run-All Git Pipeline" -Status $Message -PercentComplete $Percent
}

function Fail([string]$Message) {
  Write-Progress -Activity "Run-All Git Pipeline" -Completed
  throw $Message
}

function Require-Cmd([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Falta '$Name' en PATH."
  }
}

function Get-CurrentBranch {
  $b = git branch --show-current
  if (-not $b) { throw "No pude detectar el branch actual." }
  return $b.Trim()
}

function Get-LastTag {
  $t = git describe --tags --abbrev=0 2>$null
  if ($LASTEXITCODE -ne 0) { return $null }
  return $t.Trim()
}

function Get-CommitLogSince([string]$SinceTag) {
  if ([string]::IsNullOrWhiteSpace($SinceTag)) {
    return git log --pretty=format:"- %s (%h)"
  }
  return git log "$SinceTag..HEAD" --pretty=format:"- %s (%h)"
}

function Ensure-CleanWorkingTree {
  $s = git status --porcelain
  if ($s) { throw "Working tree sucio. Commit o stash antes de correr Run-All." }
}

function Detect-PackageJsonPath {
  $root = Get-RepoRoot
  $p = Join-Path $root "package.json"
  if (Test-Path -LiteralPath $p) { return $p }
  return $null
}

function Read-JsonFile([string]$Path) {
  return (Get-Content -LiteralPath $Path -Raw -Encoding utf8 | ConvertFrom-Json)
}

function Write-JsonFile([string]$Path, $Obj) {
  $json = $Obj | ConvertTo-Json -Depth 50
  $json = $json.Replace("`r`n","`n").Replace("`r","`n")
  [System.IO.File]::WriteAllText($Path, $json + "`n", (New-Object System.Text.UTF8Encoding($false)))
}

function Bump-SemVer([string]$Version, [ValidateSet("major","minor","patch")] [string]$Bump) {
  if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Versión inválida: $Version" }
  $parts = $Version.Split(".") | ForEach-Object { [int]$_ }
  $maj = $parts[0]; $min = $parts[1]; $pat = $parts[2]
  switch ($Bump) {
    "major" { $maj++; $min = 0; $pat = 0 }
    "minor" { $min++; $pat = 0 }
    "patch" { $pat++ }
  }
  return "$maj.$min.$pat"
}

function Choose-PackageManager {
  $root = Get-RepoRoot
  if (Test-Path -LiteralPath (Join-Path $root "pnpm-lock.yaml")) { return "pnpm" }
  if (Test-Path -LiteralPath (Join-Path $root "yarn.lock")) { return "yarn" }
  if (Test-Path -LiteralPath (Join-Path $root "package-lock.json")) { return "npm" }
  return "npm"
}

function Run-NodeScript([string]$Which, [string]$ScriptName) {
  $pm = Choose-PackageManager
  switch ($pm) {
    "pnpm" { & pnpm -s run $ScriptName }
    "yarn" { & yarn -s $ScriptName }
    default { & npm run $ScriptName }
  }
  if ($LASTEXITCODE -ne 0) { throw "$ScriptName falló (pm=$pm)" }
}

function Ensure-Tag-Not-Exists([string]$Tag) {
  $exists = git tag -l $Tag
  if ($exists) { throw "El tag ya existe: $Tag" }
}

function Update-Changelog([string]$Version, [string]$SinceTag, [string]$ChangelogPath) {
  $date = Get-Date -Format "yyyy-MM-dd"
  $header = "## v$Version ($date)"
  $log = Get-CommitLogSince $SinceTag

  $block = @()
  $block += $header
  $block += ""
  if ($log) { $block += $log }
  else { $block += "- (sin commits)" }
  $block += ""
  $blockText = ($block -join "`n") + "`n"

  if (-not (Test-Path -LiteralPath $ChangelogPath)) {
    $top = "# Changelog`n`n"
    [System.IO.File]::WriteAllText($ChangelogPath, $top + $blockText, (New-Object System.Text.UTF8Encoding($false)))
    return
  }

  $old = Get-Content -LiteralPath $ChangelogPath -Raw -Encoding utf8
  $old = $old.Replace("`r`n","`n").Replace("`r","`n")

  if ($old -match [regex]::Escape($header)) {
    throw "El changelog ya tiene entrada para $header"
  }

  if ($old.StartsWith("# Changelog")) {
    $idx = $old.IndexOf("`n`n")
    if ($idx -ge 0) {
      $prefix = $old.Substring(0, $idx + 2)
      $rest = $old.Substring($idx + 2)
      $new = $prefix + $blockText + $rest
      [System.IO.File]::WriteAllText($ChangelogPath, $new, (New-Object System.Text.UTF8Encoding($false)))
      return
    }
  }

  $new2 = $blockText + $old
  [System.IO.File]::WriteAllText($ChangelogPath, $new2, (New-Object System.Text.UTF8Encoding($false)))
}
