param(
    [switch]$StartDevServer,
    [switch]$Full,
    [switch]$RunTests
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

function Get-ListenerPids {
    param([int]$Port)

    $pids = @()
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    } catch {
        $lines = netstat -ano | findstr ":$Port"
        foreach ($line in $lines) {
            if ($line -match 'LISTENING\s+(\d+)\s*$') {
                $pids += [int]$matches[1]
            }
        }
    }

    return $pids | Where-Object { $_ -gt 0 } | Sort-Object -Unique
}

function Get-ProcessCommandLine {
    param([int]$ProcessId)
    try {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId"
        return $proc.CommandLine
    } catch {
        return $null
    }
}

function Test-PortFree {
    param([int]$Port)
    $pids = Get-ListenerPids -Port $Port
    return (-not $pids -or $pids.Count -eq 0)
}

function Stop-ListenerProcess {
    param(
        [int]$Port,
        [int]$ProcessId
    )

    # Extra guard: do not touch invalid/critical PIDs
    if ($ProcessId -le 4) { return }

    $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $proc) { return }

    $name = $proc.ProcessName
    if ($name -in @("System", "Idle")) {
        throw "Refusing to stop critical process '$name' (PID $ProcessId) listening on port $Port."
    }

    $cmd = Get-ProcessCommandLine -ProcessId $ProcessId

    Write-Host "Stopping port $Port listener: PID $ProcessId ($name)"
    if ($cmd) {
        Write-Host "CommandLine: $cmd"
    }

    # 1) Graceful stop attempt
    $stopped = $false
    try {
        Stop-Process -Id $ProcessId -ErrorAction Stop
    } catch { }

    $deadline = (Get-Date).AddSeconds(3)
    while ((Get-Date) -lt $deadline) {
        if (-not (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) {
            $stopped = $true
            break
        }
        Start-Sleep -Milliseconds 200
    }

    # 2) Force stop
    if (-not $stopped) {
        try {
            Stop-Process -Id $ProcessId -Force -ErrorAction Stop
        } catch { }

        $deadline2 = (Get-Date).AddSeconds(2)
        while ((Get-Date) -lt $deadline2) {
            if (-not (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) {
                $stopped = $true
                break
            }
            Start-Sleep -Milliseconds 200
        }
    }

    # 3) Nuclear option for Windows (Chrome/Node trees): taskkill /T /F
    if (-not $stopped) {
        Write-Host "Stop-Process did not terminate PID $ProcessId. Using taskkill /T /F..."
        try {
            & taskkill /PID $ProcessId /T /F | Out-String | ForEach-Object { $_.TrimEnd() } | ForEach-Object { if ($_){ Write-Host $_ } }
        } catch { }

        $deadline3 = (Get-Date).AddSeconds(3)
        while ((Get-Date) -lt $deadline3) {
            if (-not (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) {
                $stopped = $true
                break
            }
            Start-Sleep -Milliseconds 200
        }
    }

    if (-not $stopped) {
        throw "Failed to stop PID $ProcessId listening on port $Port."
    }
}

function Ensure-PortFree {
    param([int]$Port)

    # Try multiple cycles; after killing, wait/poll for the port to actually release
    $attempts = 4
    for ($i = 1; $i -le $attempts; $i++) {
        $pids = Get-ListenerPids -Port $Port
        if (-not $pids -or $pids.Count -eq 0) {
            Write-Host "Port $Port is free."
            return
        }

        foreach ($listenerPid in $pids) {
            Stop-ListenerProcess -Port $Port -ProcessId $listenerPid
        }

        # Poll up to ~3s for port to become free (helps with zombie listeners)
        $pollDeadline = (Get-Date).AddSeconds(3)
        while ((Get-Date) -lt $pollDeadline) {
            if (Test-PortFree -Port $Port) {
                Write-Host "Port $Port is free."
                return
            }
            Start-Sleep -Milliseconds 300
        }

        Start-Sleep -Milliseconds 600
    }

    $remaining = Get-ListenerPids -Port $Port
    if ($remaining -and $remaining.Count -gt 0) {
        $pidList = $remaining -join ", "
        throw "Port $Port is still in use by PID(s): $pidList"
    }
}

function ConvertTo-TargetUrl {
    param([string]$Raw)
    if ([string]::IsNullOrWhiteSpace($Raw)) { return "" }
    if ($Raw -match '^https?://') { return $Raw }
    return "http://$Raw"
}

function Get-LocalAppDataPath {
    $p = [Environment]::GetFolderPath('LocalApplicationData')
    if (-not [string]::IsNullOrWhiteSpace($p)) { return $p }

    if ($env:LOCALAPPDATA) { return $env:LOCALAPPDATA }

    if ($env:USERPROFILE) {
        $candidate = Join-Path $env:USERPROFILE "AppData\Local"
        if (Test-Path $candidate) { return $candidate }
        return $candidate
    }

    return $null
}

function Find-PlaywrightChrome {
    $local = Get-LocalAppDataPath
    if ([string]::IsNullOrWhiteSpace($local)) { return $null }

    $root = Join-Path $local "ms-playwright"
    if (-not (Test-Path $root)) { return $null }

    $candidates = Get-ChildItem -Path $root -Filter "chrome.exe" -Recurse -ErrorAction SilentlyContinue
    if (-not $candidates) { return $null }

    $best = $candidates | Where-Object {
        $_.FullName -match "chromium" -and $_.FullName -match "chrome-win"
    } | Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if ($best) { return $best.FullName }

    return ($candidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}

function Find-SystemChrome {
    $paths = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    foreach ($path in $paths) {
        if ($path -and (Test-Path $path)) { return $path }
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
        }
        catch {
            $lastError = $_.Exception
            Start-Sleep -Milliseconds $DelayMs
        }
    }
    return @{ ok = $false; error = $lastError }
}

function Get-RepoRoot {
    try {
        $root = & git rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -eq 0 -and $root) {
            return $root.Trim()
        }
    } catch { }

    $scriptPath = $MyInvocation.MyCommand.Path
    if ([string]::IsNullOrWhiteSpace($scriptPath)) {
        return (Get-Location).Path
    }
    $scriptDir = Split-Path -Parent $scriptPath
    return (Resolve-Path (Join-Path $scriptDir "..\..")).Path
}

function Run-FullAutomation {
    param(
        [string]$RepoRoot,
        [bool]$EnableTests
    )

    $envBackup = $env:HI_RUN_TESTS
    $setTests = $EnableTests -and $env:HI_RUN_TESTS -ne "1"
    if ($setTests) { $env:HI_RUN_TESTS = "1" }

    try {
        Write-Step -Activity "Hitech Operator" -Status "Full automation" -Percent 5
        Write-Host "Running full automation (npm run mcp:start)..."

        $summaryLines = @()
        $summaryJson = $null
        $inSummary = $false

        & npm run mcp:start 2>&1 | ForEach-Object {
            $line = $_.ToString()
            Write-Host $line

            if ($line -match '^::STEP\s+(\d+)\s+(\S+)\s+(.+)$') {
                $percent = [int]$matches[1]
                $message = $matches[3]
                Write-Step -Activity "Hitech Operator" -Status $message -Percent $percent
            }

            if ($line -match '^STATUS SUMMARY') {
                $inSummary = $true
                $summaryLines = @($line)
                return
            }

            if ($line -match '^END STATUS SUMMARY') {
                $inSummary = $false
                $summaryLines += $line
                return
            }

            if ($inSummary) {
                $summaryLines += $line
            }

            if ($line -match '^::STATUS_JSON\s+(.+)$') {
                try {
                    $summaryJson = $matches[1] | ConvertFrom-Json
                } catch {
                    $summaryJson = $null
                }
            }
        }

        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            throw "Full mode failed with exit code $exitCode."
        }

        Write-Progress -Activity "Hitech Operator" -Completed

        if ($summaryLines.Count -gt 0) {
            Write-Host ""
            Write-Host "STATUS SUMMARY"
            foreach ($line in $summaryLines) {
                if ($line -notmatch '^STATUS SUMMARY' -and $line -notmatch '^END STATUS SUMMARY') {
                    Write-Host $line
                }
            }
            Write-Host "END STATUS SUMMARY"
        }

        if ($summaryJson) {
            Write-Host ""
            Write-Host "STATUS SUMMARY (PowerShell)"
            Write-Host "Vite URL: $($summaryJson.viteUrl)"
            Write-Host "DevTools JSON: OK ($($summaryJson.devtoolsJson))"
            Write-Host "Selected page URL: $($summaryJson.selectedPageUrl)"
            Write-Host "Operator server running (stdio): $($summaryJson.operatorRunning)"
            Write-Host "Operator PID: $($summaryJson.operatorPid)"
            Write-Host "Test client: $($summaryJson.testClient)"
            Write-Host "Operator tools: $($summaryJson.tools -join ', ')"
            Write-Host "END STATUS SUMMARY"
        }

        return
    }
    finally {
        if ($setTests) {
            if ($envBackup) { $env:HI_RUN_TESTS = $envBackup } else { Remove-Item Env:HI_RUN_TESTS -ErrorAction SilentlyContinue }
        }
    }
}

try {
    $repoRoot = Get-RepoRoot
    Set-Location $repoRoot

    $enableFullTests = $RunTests.IsPresent -or $env:HI_RUN_TESTS -eq "1"

    Write-Step -Activity "Hitech Operator" -Status "Freeing ports 5177 and 9222" -Percent 2
    Ensure-PortFree -Port 5177
    Ensure-PortFree -Port 9222

    if ($Full) {
        Run-FullAutomation -RepoRoot $repoRoot -EnableTests:$enableFullTests
        return
    }

    $browserUrl = if ($env:HI_BROWSER_URL) { $env:HI_BROWSER_URL } else { "http://127.0.0.1:9222" }
    $urlExact = if ($env:HI_URL_EXACT) { $env:HI_URL_EXACT } else { "" }
    $urlContains = if ($env:HI_URL_CONTAINS) { $env:HI_URL_CONTAINS } else { "localhost:5177/#/deck?s=2" }
    $targetHint = if ($urlExact) { $urlExact } else { $urlContains }
    $targetUrl = ConvertTo-TargetUrl $targetHint

    $flickerOut = if ($env:HI_FLICKER_OUT) { $env:HI_FLICKER_OUT } else { "tools\mcp\_flicker_out" }

    Write-Step -Activity "Hitech Operator" -Status "Finding Chrome/Chromium" -Percent 10
    $chromePath = Find-PlaywrightChrome
    if (-not $chromePath) { $chromePath = Find-SystemChrome }

    if (-not $chromePath) {
        Write-Host "No Chrome/Chromium binary found."
        Write-Host "Next steps:"
        Write-Host "- Install Chrome OR install Playwright Chromium:"
        Write-Host "  npx playwright install chromium"
        $local = Get-LocalAppDataPath
        if ($local) { Write-Host "- Playwright expected path: $local\ms-playwright" }
        exit 1
    }

    Write-Step -Activity "Hitech Operator" -Status "Launching Chrome" -Percent 25
    $userDataDir = "C:\tmp\hi-chrome"
    New-Item -ItemType Directory -Force -Path $userDataDir | Out-Null

    $chromeArgs = @("--remote-debugging-port=9222", "--user-data-dir=$userDataDir")
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
        exit 1
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
            }
            else {
                Write-Host "Dev server reachable: $targetUrl"
            }
        }
    }
    elseif ($startDev -and -not $hasDevScript) {
        Write-Host "No npm run dev script found in package.json."
    }

    Write-Step -Activity "Hitech Operator" -Status "Starting MCP server" -Percent 80
    Start-Process -FilePath "npm" -ArgumentList @("run", "mcp:operator") -WorkingDirectory $repoRoot | Out-Null

    Write-Step -Activity "Hitech Operator" -Status "Done" -Percent 100
    Write-Progress -Activity "Hitech Operator" -Completed

    Write-Host ""
    Write-Host "Ready."
    Write-Host "Target URL: $targetUrl"
    Write-Host "Doctor: npm run mcp:doctor"
    Write-Host "Open target: npm run mcp:open-target"
    Write-Host "Test client: npm run mcp:test-client"
    Write-Host "Flicker output: $flickerOut"
}
catch {
    Write-Host "Start-HitechOperator failed: $($_.Exception.Message)"
    Write-Host "Next steps:"
    Write-Host "- Ensure Node/npm are installed."
    Write-Host "- Run: npm run mcp:doctor"
    Write-Host "- Check Chrome flags and URL settings."
    exit 1
}
