param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) {
  Write-Error "Not inside a git repository."
  exit 1
}

if ($Force) {
  git clean -fd -- tools
} else {
  git clean -nd -- tools
}
