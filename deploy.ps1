param(
  [string]$Branch = "main",
  [string]$ApiUrl = "http://103.35.65.57:5000/api",
  [string]$FrontendPublishPath = "",
  [string]$FrontendBaseUrl = "",
  [string[]]$FrontendSmokePaths = @("/", "/login", "/members-public"),
  [switch]$SkipGitPull,
  [switch]$SkipNpmInstall,
  [switch]$SkipFrontendSmoke,
  [string]$BackendRestartCommand = "",
  [ValidateSet("pm2", "detached", "manual")]
  [string]$BackendMode = "pm2",
  [string]$Pm2AppName = "pickleball-backend",
  [int]$BackendPort = 5000,
  [switch]$EnablePm2StartupTask
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$script:Pm2Executable = "pm2"

function Assert-LastExitCode {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Context
  )

  if ($LASTEXITCODE -ne 0) {
    throw "$Context failed with exit code $LASTEXITCODE"
  }
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Action
  )

  Write-Host "[STEP] $Message" -ForegroundColor Cyan
  & $Action
}

function Install-NodeDeps {
  if ($SkipNpmInstall) {
    Write-Host "Skipping npm install as requested." -ForegroundColor Yellow
    return
  }

  if (Test-Path "package-lock.json") {
    npm ci
    Assert-LastExitCode -Context "npm ci"
  }
  else {
    npm install
    Assert-LastExitCode -Context "npm install"
  }
}

function Get-NormalizedFullPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  return [System.IO.Path]::GetFullPath($Path).TrimEnd('\\').ToLowerInvariant()
}

function Stop-FrontendLockingProcesses {
  $ports = @(3000, 5173)

  foreach ($port in $ports) {
    try {
      $listeners = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
      foreach ($listener in $listeners) {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
      }
    }
    catch {
      Write-Host "Could not stop listeners on port $port." -ForegroundColor Yellow
    }
  }

  try {
    $frontendPathHint = (Join-Path $PSScriptRoot "frontend").ToLowerInvariant()
    $nodeProcesses = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
    foreach ($proc in $nodeProcesses) {
      $cmd = ($proc.CommandLine | Out-String).ToLowerInvariant()
      if ($cmd -like "*$frontendPathHint*") {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
      }
    }
  }
  catch {
    Write-Host "Could not inspect node process command lines for frontend locks." -ForegroundColor Yellow
  }
}

function Invoke-FrontendBuild {
  if ($ApiUrl -match "localhost|127\.0\.0\.1") {
    throw "ApiUrl must not use localhost/127.0.0.1 for server deployment. Use the server IP or domain."
  }

  $attempt = 1
  $maxAttempts = 2

  while ($attempt -le $maxAttempts) {
    try {
      Push-Location "frontend"
      Set-Content -Path ".env.production" -Value "VITE_API_URL=$ApiUrl" -Encoding ascii
      Install-NodeDeps
      npm run build
      Assert-LastExitCode -Context "npm run build"
      return
    }
    catch {
      if ($attempt -ge $maxAttempts) {
        throw
      }

      Write-Host "Frontend build failed on attempt $attempt. Trying to release file locks and retry..." -ForegroundColor Yellow
      Stop-FrontendLockingProcesses
      Start-Sleep -Seconds 2
      $attempt++
    }
    finally {
      if ((Get-Location).Path -ne $PSScriptRoot) {
        Pop-Location
      }
    }
  }
}

function Ensure-Pm2 {
  $pm2Cmd = Get-Command pm2.cmd -ErrorAction SilentlyContinue
  if (-not $pm2Cmd) {
    Write-Host "PM2 not found. Installing globally..." -ForegroundColor Yellow
    npm install -g pm2
    Assert-LastExitCode -Context "npm install -g pm2"
    $pm2Cmd = Get-Command pm2.cmd -ErrorAction SilentlyContinue
    if (-not $pm2Cmd) {
      throw "pm2.cmd was not found after installation"
    }
  }

  $script:Pm2Executable = $pm2Cmd.Source
}

function Invoke-Pm2Cmd {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Arguments,
    [switch]$CaptureOutput
  )

  $fullCmd = '"' + $script:Pm2Executable + '" ' + $Arguments
  if ($CaptureOutput) {
    return cmd /c $fullCmd 2>&1 | Out-String
  }

  cmd /c $fullCmd
}

function Restart-BackendWithPm2 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$AppName
  )

  Push-Location "backend"
  try {
    $appsRaw = Invoke-Pm2Cmd -Arguments "jlist" -CaptureOutput
    Assert-LastExitCode -Context "pm2 jlist"
    $escapedAppName = [regex]::Escape($AppName)
    $appExists = $appsRaw -match '"name"\s*:\s*"' + $escapedAppName + '"'

    if ($appExists) {
      Invoke-Pm2Cmd -Arguments "restart $AppName --update-env"
      Assert-LastExitCode -Context "pm2 restart $AppName"
    }
    else {
      $cwd = (Get-Location).Path
      Invoke-Pm2Cmd -Arguments "start server.js --name $AppName --cwd `"$cwd`""
      Assert-LastExitCode -Context "pm2 start $AppName"
    }
    Invoke-Pm2Cmd -Arguments "save"
    Assert-LastExitCode -Context "pm2 save"
    Write-Host "Backend is managed by PM2 as '$AppName'." -ForegroundColor Green
  }
  finally {
    Pop-Location
  }
}

function Restart-BackendDetached {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  try {
    $existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($existing) {
      Stop-Process -Id $existing.OwningProcess -Force -ErrorAction SilentlyContinue
      Start-Sleep -Seconds 1
    }
  }
  catch {
    Write-Host "Could not inspect/stop existing backend process on port $Port." -ForegroundColor Yellow
  }

  $backendPath = Join-Path $PSScriptRoot "backend"
  Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $backendPath -WindowStyle Hidden
  Write-Host "Backend started in detached mode via node server.js." -ForegroundColor Green
}

function Ensure-Pm2StartupTask {
  if ($env:OS -ne "Windows_NT") {
    Write-Host "Skipping Windows startup task setup on non-Windows OS." -ForegroundColor Yellow
    return
  }

  $taskName = "PM2Resurrect"
  $taskCmd = 'schtasks /Create /TN "PM2Resurrect" /SC ONSTART /RL HIGHEST /TR "cmd /c pm2 resurrect" /F'

  try {
    schtasks /Query /TN $taskName *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "Startup task '$taskName' already exists. Updating it..." -ForegroundColor Yellow
    }

    cmd /c $taskCmd
    Assert-LastExitCode -Context "Create or update startup task $taskName"
    Write-Host "Startup task '$taskName' is configured." -ForegroundColor Green
  }
  catch {
    Write-Host "Could not create startup task '$taskName'. Run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Yellow
  }
}

function Publish-FrontendBuild {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TargetPath
  )

  $sourceDist = Join-Path $PSScriptRoot "frontend\dist"
  if (-not (Test-Path $sourceDist)) {
    throw "Frontend build output not found at $sourceDist"
  }

  $normalizedRoot = Get-NormalizedFullPath -Path $PSScriptRoot
  $normalizedFrontend = Get-NormalizedFullPath -Path (Join-Path $PSScriptRoot "frontend")
  $normalizedBackend = Get-NormalizedFullPath -Path (Join-Path $PSScriptRoot "backend")
  $normalizedDist = Get-NormalizedFullPath -Path $sourceDist
  $normalizedTarget = Get-NormalizedFullPath -Path $TargetPath

  if ($normalizedTarget -eq $normalizedRoot -or $normalizedTarget -eq $normalizedFrontend -or $normalizedTarget -eq $normalizedBackend -or $normalizedTarget -eq $normalizedDist) {
    throw "FrontendPublishPath is unsafe. Choose a dedicated static folder (example: D:\\...\\frontend-public)."
  }

  if ($normalizedTarget.StartsWith($normalizedFrontend + "\\")) {
    throw "FrontendPublishPath must not be inside the frontend source directory."
  }

  if (-not (Test-Path $TargetPath)) {
    New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null
  }

  # Preserve IIS rewrite config that may exist only on server target.
  $targetWebConfig = Join-Path $TargetPath "web.config"
  $sourceWebConfig = Join-Path $sourceDist "web.config"
  $backupWebConfig = Join-Path $env:TEMP ("pickleball-web.config.{0}.bak" -f ([guid]::NewGuid().ToString("N")))
  $hadTargetWebConfig = Test-Path $targetWebConfig
  if ($hadTargetWebConfig) {
    Copy-Item -Path $targetWebConfig -Destination $backupWebConfig -Force
    Write-Host "Preserved existing web.config from target before publish." -ForegroundColor Yellow
  }

  $robocopySource = $sourceDist.TrimEnd('\\')
  $robocopyTarget = $TargetPath.TrimEnd('\\')

  try {
    robocopy $robocopySource $robocopyTarget /MIR /NFL /NDL /NJH /NJS /NC /NS
    $robocopyExit = $LASTEXITCODE
    if ($robocopyExit -gt 7) {
      throw "robocopy failed with exit code $robocopyExit"
    }

    if ($hadTargetWebConfig -and -not (Test-Path $sourceWebConfig)) {
      Copy-Item -Path $backupWebConfig -Destination $targetWebConfig -Force
      Write-Host "Restored preserved web.config to target after publish." -ForegroundColor Green
    }

    if (-not $hadTargetWebConfig -and (Test-Path $sourceWebConfig)) {
      Write-Host "web.config was provided by frontend/dist and published to target." -ForegroundColor Green
    }
  }
  finally {
    if (Test-Path $backupWebConfig) {
      Remove-Item -Path $backupWebConfig -Force -ErrorAction SilentlyContinue
    }
  }

  Write-Host "Frontend build published to: $TargetPath" -ForegroundColor Green
}

function Invoke-FrontendSmokeChecks {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,
    [Parameter(Mandatory = $true)]
    [string[]]$Paths
  )

  foreach ($path in $Paths) {
    $normalizedPath = if ($path.StartsWith('/')) { $path } else { '/' + $path }
    $url = $BaseUrl.TrimEnd('/') + $normalizedPath
    $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 20
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
      throw "Frontend smoke check failed: $url returned status $($response.StatusCode)"
    }
    Write-Host "Frontend smoke check passed: $($response.StatusCode) $url" -ForegroundColor Green
  }
}

Push-Location $PSScriptRoot

try {
  $gitSyncSucceeded = $true

  Invoke-Step -Message "Deploy started in $PSScriptRoot" -Action {
    git status --short
  }

  if (-not $SkipGitPull) {
    Invoke-Step -Message "Update source code from origin/$Branch" -Action {
      try {
        git fetch origin
        Assert-LastExitCode -Context "git fetch"
        git checkout $Branch
        Assert-LastExitCode -Context "git checkout $Branch"
        git pull --rebase --autostash origin $Branch
        Assert-LastExitCode -Context "git pull"
      }
      catch {
        $gitSyncSucceeded = $false
        Write-Host "Git sync failed. Continuing deploy with current local code." -ForegroundColor Yellow
        Write-Host $_.Exception.Message -ForegroundColor Yellow
      }
    }
  }

  Invoke-Step -Message "Build frontend with production API URL" -Action {
    Invoke-FrontendBuild
  }

  if ($FrontendPublishPath.Trim()) {
    Invoke-Step -Message "Publish frontend build to target directory" -Action {
      Publish-FrontendBuild -TargetPath $FrontendPublishPath
    }
  }
  else {
    Write-Host "Frontend publish path not set. Build output remains at frontend/dist." -ForegroundColor Yellow
  }

  Invoke-Step -Message "Install backend dependencies" -Action {
    Push-Location "backend"
    Install-NodeDeps
    Pop-Location
  }

  if ($BackendRestartCommand.Trim()) {
    Invoke-Step -Message "Restart backend process using custom command" -Action {
      Invoke-Expression $BackendRestartCommand
    }
  }
  else {
    if ($BackendMode -eq "pm2") {
      Invoke-Step -Message "Restart backend with PM2" -Action {
        Ensure-Pm2
        Restart-BackendWithPm2 -AppName $Pm2AppName
      }
    }
    elseif ($BackendMode -eq "detached") {
      Invoke-Step -Message "Restart backend in detached mode" -Action {
        Restart-BackendDetached -Port $BackendPort
      }
    }
    else {
      Write-Host "Backend restart skipped (manual mode)." -ForegroundColor Yellow
    }
  }

  Invoke-Step -Message "Verify API health" -Action {
    $healthUrl = "$ApiUrl/health"
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 20
      Write-Host "Health check status: $($response.StatusCode) $healthUrl" -ForegroundColor Green
    }
    catch {
      Write-Host "Health check failed: $healthUrl" -ForegroundColor Yellow
      Write-Host $_.Exception.Message -ForegroundColor Yellow
    }
  }

  if (-not $SkipFrontendSmoke -and $FrontendBaseUrl.Trim()) {
    Invoke-Step -Message "Verify frontend routes" -Action {
      Invoke-FrontendSmokeChecks -BaseUrl $FrontendBaseUrl -Paths $FrontendSmokePaths
    }
  }
  elseif (-not $SkipFrontendSmoke) {
    Write-Host "Frontend smoke checks skipped because FrontendBaseUrl is not set." -ForegroundColor Yellow
  }

  Write-Host "Deploy completed." -ForegroundColor Green
  Write-Host "Frontend build output: frontend/dist" -ForegroundColor Green
  if (-not $gitSyncSucceeded) {
    Write-Host "Warning: deployment used local code because git sync failed." -ForegroundColor Yellow
  }
  if ($BackendMode -eq "pm2" -and -not $BackendRestartCommand.Trim()) {
    if ($env:OS -eq "Windows_NT") {
      if ($EnablePm2StartupTask) {
        Invoke-Step -Message "Configure PM2 startup task on Windows" -Action {
          Ensure-Pm2StartupTask
        }
      }
      else {
        Write-Host "Windows server detected: 'pm2 startup' is not supported here." -ForegroundColor Yellow
        Write-Host "Run with -EnablePm2StartupTask to auto-create PM2Resurrect startup task." -ForegroundColor Yellow
      }
      Write-Host "Keep process list updated after deploy: pm2 save" -ForegroundColor Yellow
    }
    else {
      Write-Host "Tip: run 'pm2 startup' once on the server to auto-start PM2 apps after reboot." -ForegroundColor Yellow
    }
  }
}
finally {
  Pop-Location
}
