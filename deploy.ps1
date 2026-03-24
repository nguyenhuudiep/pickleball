param(
  [string]$Branch = "main",
  [string]$ApiUrl = "http://103.35.65.57:8002/api",
  [switch]$SkipGitPull,
  [switch]$SkipNpmInstall,
  [string]$BackendRestartCommand = ""
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
    Invoke-Step -Message "Restart backend process" -Action {
      Invoke-Expression $BackendRestartCommand
    }
  }
  else {
    Write-Host "No backend restart command provided. Restart manually if needed." -ForegroundColor Yellow
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
}
finally {
  Pop-Location
}
