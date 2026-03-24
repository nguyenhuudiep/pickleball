param(
  [string]$Branch = "main",
  [string]$ApiUrl = "http://103.35.65.57:8002/api",
  [switch]$SkipGitPull,
  [switch]$SkipNpmInstall,
  [string]$BackendRestartCommand = "",
  [ValidateSet("pm2", "detached", "manual")]
  [string]$BackendMode = "pm2",
  [string]$Pm2AppName = "pickleball-backend",
  [int]$BackendPort = 5000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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
  }
  else {
    npm install
  }
}

function Ensure-Pm2 {
  $pm2Cmd = Get-Command pm2 -ErrorAction SilentlyContinue
  if (-not $pm2Cmd) {
    Write-Host "PM2 not found. Installing globally..." -ForegroundColor Yellow
    npm install -g pm2
  }
}

function Restart-BackendWithPm2 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$AppName
  )

  Push-Location "backend"
  try {
    pm2 describe $AppName *> $null
    if ($LASTEXITCODE -eq 0) {
      pm2 restart $AppName --update-env
    }
    else {
      pm2 start server.js --name $AppName --cwd (Get-Location).Path
    }
    pm2 save
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

Push-Location $PSScriptRoot

try {
  Invoke-Step -Message "Deploy started in $PSScriptRoot" -Action {
    git status --short
  }

  if (-not $SkipGitPull) {
    Invoke-Step -Message "Update source code from origin/$Branch" -Action {
      git fetch origin
      git checkout $Branch
      git pull origin $Branch
    }
  }

  Invoke-Step -Message "Build frontend with production API URL" -Action {
    Push-Location "frontend"
    Set-Content -Path ".env.production" -Value "VITE_API_URL=$ApiUrl" -Encoding ascii
    Install-NodeDeps
    npm run build
    Pop-Location
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

  Write-Host "Deploy completed." -ForegroundColor Green
  Write-Host "Frontend build output: frontend/dist" -ForegroundColor Green
  if ($BackendMode -eq "pm2" -and -not $BackendRestartCommand.Trim()) {
    Write-Host "Tip: run 'pm2 startup' once on the server to auto-start PM2 apps after reboot." -ForegroundColor Yellow
  }
}
finally {
  Pop-Location
}
