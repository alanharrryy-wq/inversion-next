param(
    [switch]$StartDevServer
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param(
        [string]$Activity,
        [string]$Status,
        [int]$Percent
    )
    Write-Progress -Activity $Activity -Status $Status -PercentComplete $Percent
}

function Normalize-TargetUrl {
    param([string]$Raw)
    if ([string]::IsNullOrWhiteSpace($Raw)) { return "" }
    if ($Raw -match '^https?://') { return $Raw }
    return "http://$Raw"
}

function Find-PlaywrightChrome {
    $root = Join-Path $env:LOCALAPPDATA "ms-playwright"
    if (-not (Test-Path $root)) { return $null }
    $candidates = Get-ChildItem -Path $root -Filter "chrome.exe" -Recurse -ErrorAction SilentlyContinue
    if (-not $candidates) { return $null }
    return ($candidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}

function Find-SystemChrome {
    $paths = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    foreach ($path in $paths) {
        if (Test-Path $path) { return $path }
    }
    return $null
}

function Wait-Url {
    param(
        [string]$Url,
        [int]$Attempts = 12,
        [int]$DelayMs = 500
    )
    $lastError = $null
    for ($i = 1; $i -le $Attempts; $i++) {
        try {
            $null = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -UseBasicParsing
            return @{ ok = $true }
        } catch {
            $lastError = $_.Exception
            Start-Sleep -Milliseconds $DelayMs
        }
    }
    return @{ ok = $false; error = $lastError }
}

function Get-RepoRoot {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    return (Resolve-Path (Join-Path $scriptDir "..\..")).Path
}

try {
    $repoRoot = Get-RepoRoot
    Set-Location $repoRoot

    $browserUrl = if ($env:HI_BROWSER_URL) { $env:HI_BROWSER_URL } else { "http://127.0.0.1:9222" }
    $urlExact = if ($env:HI_URL_EXACT) { $env:HI_URL_EXACT } else { "" }
    $urlContains = if ($env:HI_URL_CONTAINS) { $env:HI_URL_CONTAINS } else { "localhost:5177/#/deck?s=2" }
    $targetHint = if ($urlExact) { $urlExact } else { $urlContains }
    $targetUrl = Normalize-TargetUrl $targetHint

    $flickerOut = if ($env:HI_FLICKER_OUT) { $env:HI_FLICKER_OUT } else { "tools\mcp\_flicker_out" }

    Write-Step -Activity "Hitech Operator" -Status "Finding Chrome/Chromium" -Percent 10
    $chromePath = Find-PlaywrightChrome
    if (-not $chromePath) {
        $chromePath = Find-SystemChrome
    }
    if (-not $chromePath) {
        Write-Host "No Chrome/Chromium binary found."
        Write-Host "Next steps:"
        Write-Host "- Install Chrome or Playwright Chromium."
        Write-Host "- Playwright path: $env:LOCALAPPDATA\ms-playwright"
        return
    }

    Write-Step -Activity "Hitech Operator" -Status "Launching Chrome" -Percent 25
    $userDataDir = "C:\tmp\hi-chrome"
    New-Item -ItemType Directory -Force -Path $userDataDir | Out-Null
    $chromeArgs = @(
        "--remote-debugging-port=9222",
        "--user-data-dir=$userDataDir"
    )
    Start-Process -FilePath $chromePath -ArgumentList $chromeArgs | Out-Null
    Write-Host "Chrome started: $chromePath"

    Write-Step -Activity "Hitech Operator" -Status "Waiting for DevTools port" -Percent 40
    $devtoolsUrl = "$($browserUrl.TrimEnd('/'))/json"
    $devtoolsCheck = Wait-Url -Url $devtoolsUrl -Attempts 12 -DelayMs 600
    if (-not $devtoolsCheck.ok) {
        Write-Host "DevTools not reachable at $devtoolsUrl"
        Write-Host "Next steps:"
        Write-Host "- Ensure Chrome is running with --remote-debugging-port=9222."
        Write-Host "- Try: npm run mcp:doctor"
        return
    }
    Write-Host "DevTools reachable: $devtoolsUrl"

    $pkgPath = Join-Path $repoRoot "package.json"
    $hasDevScript = $false
    if (Test-Path $pkgPath) {
        $pkg = Get-Content $pkgPath | ConvertFrom-Json
        $hasDevScript = $pkg.scripts.PSObject.Properties.Name -contains "dev"
    }

    $startDev = $StartDevServer.IsPresent -or $env:HI_START_DEV -eq "1"
    if ($startDev -and $hasDevScript) {
        Write-Step -Activity "Hitech Operator" -Status "Starting dev server" -Percent 55
        Start-Process -FilePath "npm" -ArgumentList @("run", "dev") -WorkingDirectory $repoRoot | Out-Null
        if ($targetUrl) {
            Write-Step -Activity "Hitech Operator" -Status "Waiting for dev server" -Percent 65
            $devCheck = Wait-Url -Url $targetUrl -Attempts 20 -DelayMs 750
            if (-not $devCheck.ok) {
                Write-Host "Dev server not reachable yet at $targetUrl"
                Write-Host "You can still open the URL manually when ready."
            } else {
                Write-Host "Dev server reachable: $targetUrl"
            }
        }
    } elseif ($startDev -and -not $hasDevScript) {
        Write-Host "No npm run dev script found in package.json."
    }

    Write-Step -Activity "Hitech Operator" -Status "Starting MCP server" -Percent 80
    Start-Process -FilePath "npm" -ArgumentList @("run", "mcp:operator") -WorkingDirectory $repoRoot | Out-Null

    Write-Step -Activity "Hitech Operator" -Status "Done" -Percent 100
    Write-Progress -Activity "Hitech Operator" -Completed

    Write-Host ""
    Write-Host "Ready."
    Write-Host "Target URL: $targetUrl"
    Write-Host "Test client: npm run mcp:test-client"
    Write-Host "Flicker output: $flickerOut"
} catch {
    Write-Host "Start-HitechOperator failed: $($_.Exception.Message)"
    Write-Host "Next steps:"
    Write-Host "- Ensure Node/npm are installed."
    Write-Host "- Run: npm run mcp:doctor"
    Write-Host "- Check Chrome flags and URL settings."
}
