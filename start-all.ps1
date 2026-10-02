# CoalGov - Unified Offline App & AI Launcher
# Supports:
# 1. Local Device Mode (Default): Runs Ollama, ML service, Backend, and Frontend locally.
# 2. Offline Server Mode: Points ML_SERVICE_URL or OLLAMA_BASE_URL to an offline LAN server.

param(
    [string]$OfflineServer = "127.0.0.1",
    [switch]$NoBrowser
)

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "          COALGOV - SMART MINE GOVERNANCE PLATFORM" -ForegroundColor White
Write-Host "            (Offline AI Copilot + Local RAG System)" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-Endpoint {
    param([string]$Url)

    try {
        Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Start-ServiceWindow {
    param(
        [string]$WorkingDirectory,
        [string]$Command
    )

    $escapedDirectory = $WorkingDirectory.Replace("'", "''")
    $escapedCommand = "Set-Location -LiteralPath '$escapedDirectory'; $Command"
    Start-Process powershell.exe -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $escapedCommand) -WorkingDirectory $WorkingDirectory | Out-Null
}

function Wait-ForEndpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$TimeoutSeconds = 60
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Endpoint -Url $Url) {
            Write-Host "      ✓ $Name is ready ($Url)" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
    }

    Write-Host "      ❌ $Name did not become ready ($Url). Check its service window for the startup error." -ForegroundColor Red
    return $false
}

# 1. Check Ollama
Write-Host "[1/4] Checking Ollama Service (gemma3:1b)..." -ForegroundColor Cyan
try {
    $ollamaCheck = Invoke-RestMethod -Uri "http://${OfflineServer}:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction Stop
    Write-Host "      ✓ Ollama is online. Models available: $(($ollamaCheck.models | ForEach-Object { $_.name }) -join ', ')" -ForegroundColor Green
} catch {
    if ($OfflineServer -eq "127.0.0.1" -or $OfflineServer -eq "localhost") {
        $ollamaCommand = Get-Command ollama -ErrorAction SilentlyContinue
        if ($ollamaCommand) {
            Write-Host "      ⚠ Local Ollama not responding. Attempting to start ollama serve..." -ForegroundColor Yellow
            Start-Process $ollamaCommand.Source -ArgumentList "serve" -WindowStyle Hidden | Out-Null
            if (Wait-ForEndpoint -Name 'Ollama' -Url 'http://127.0.0.1:11434/api/tags' -TimeoutSeconds 15) {
                Write-Host "      ✓ Ollama is online." -ForegroundColor Green
            } else {
                Write-Host "      ⚠ Continuing without Ollama. Local AI features will be unavailable." -ForegroundColor Yellow
            }
        } else {
            Write-Host "      ⚠ Ollama is not installed or not on PATH. Local AI features will be unavailable." -ForegroundColor Yellow
        }
    } else {
        Write-Host "      ⚠ Could not connect to offline Ollama server at http://${OfflineServer}:11434. AI features may be unavailable." -ForegroundColor Yellow
    }
}

# 2. Start ML FastAPI Service
Write-Host "[2/4] Starting ML FastAPI Service (Port 8001)..." -ForegroundColor Cyan
$mlVenvPython = Join-Path $rootDir "ML\venv\Scripts\python.exe"
if (Test-Endpoint -Url 'http://127.0.0.1:8001/docs') {
    Write-Host "      ✓ ML Service is already running (http://localhost:8001)" -ForegroundColor Green
} elseif (Test-Path $mlVenvPython) {
    $mlCommand = "`$env:HF_HUB_OFFLINE='1'; & '$mlVenvPython' -m uvicorn main:app --host 0.0.0.0 --port 8001"
    Start-ServiceWindow -WorkingDirectory (Join-Path $rootDir 'ML') -Command $mlCommand
    if (-not (Wait-ForEndpoint -Name 'ML Service' -Url 'http://127.0.0.1:8001/docs' -TimeoutSeconds 45)) { exit 1 }
} else {
    Write-Host "      ❌ ML virtualenv not found at ML\venv. Run: python -m venv ML\venv && pip install -r ML\requirements.txt" -ForegroundColor Red
    exit 1
}

# 3. Start Node.js Backend
Write-Host "[3/4] Starting Backend Service (Port 5000)..." -ForegroundColor Cyan
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    Write-Host "      ❌ Node.js is not installed or not on PATH." -ForegroundColor Red
    exit 1
}

if (Test-Endpoint -Url 'http://127.0.0.1:5000/health') {
    Write-Host "      ✓ Backend is already running (http://localhost:5000)" -ForegroundColor Green
} else {
    Write-Host "      ⚠ Backend health check failed. Ensuring PostgreSQL is running..." -ForegroundColor Yellow
    Push-Location (Join-Path $rootDir 'Backend')
    try {
        & $nodeCommand.Source -e "require('./src/config/dbLauncher').ensurePostgresRunning().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); })"
        $databaseExitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    if ($databaseExitCode -ne 0) {
        Write-Host "      ❌ PostgreSQL could not be started. See the error above." -ForegroundColor Red
        exit 1
    }

    if (Test-Endpoint -Url 'http://127.0.0.1:5000/health') {
        Write-Host "      ✓ Backend is healthy (http://localhost:5000)" -ForegroundColor Green
    } else {
        $backendPortInUse = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
        if ($backendPortInUse) {
            Write-Host "      ❌ Backend is listening on port 5000 but remains unhealthy. Check its database connection." -ForegroundColor Red
            exit 1
        }

        $backendCommand = "& '$($nodeCommand.Source)' src/index.js"
        Start-ServiceWindow -WorkingDirectory (Join-Path $rootDir 'Backend') -Command $backendCommand
        if (-not (Wait-ForEndpoint -Name 'Backend' -Url 'http://127.0.0.1:5000/health' -TimeoutSeconds 90)) { exit 1 }
    }
}

# 4. Start React Frontend
Write-Host "[4/4] Starting React Frontend (Port 5173)..." -ForegroundColor Cyan
if (Test-Endpoint -Url 'http://127.0.0.1:5173/') {
    Write-Host "      ✓ Frontend is already running (http://localhost:5173)" -ForegroundColor Green
} else {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npmCommand) {
        Write-Host "      ❌ npm is not installed or not on PATH." -ForegroundColor Red
        exit 1
    }
    Start-ServiceWindow -WorkingDirectory (Join-Path $rootDir 'Frontend') -Command 'npm run dev -- --host 0.0.0.0'
    if (-not (Wait-ForEndpoint -Name 'Frontend' -Url 'http://127.0.0.1:5173/' -TimeoutSeconds 45)) { exit 1 }
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host " All services are running!" -ForegroundColor White
Write-Host " - Frontend UI:    http://localhost:5173" -ForegroundColor Cyan
Write-Host " - AI Copilot:     http://localhost:5173/copilot" -ForegroundColor Yellow
Write-Host " - Backend API:    http://localhost:5000" -ForegroundColor Cyan
Write-Host " - ML & RAG API:   http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Green

if (-not $NoBrowser) {
    Start-Process "http://localhost:5173/copilot"
}
