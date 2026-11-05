# AI Planner Launcher for PowerShell
Write-Host "========================================================" -ForegroundColor DarkRed
Write-Host "       AI PLANNER - Intelligent Personal Agent          " -ForegroundColor Yellow
Write-Host "          Starting Backend and Frontend...              " -ForegroundColor White
Write-Host "========================================================" -ForegroundColor DarkRed
Write-Host ""

# Start FastAPI backend in a new process
Write-Host "[1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; .\.venv\Scripts\Activate.ps1; uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2

# Start Vite React frontend in a new process
Write-Host "[2/2] Launching React Frontend on http://localhost:3000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev --prefix frontend"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  AI Planner is starting up!                            " -ForegroundColor Green
Write-Host "  Frontend Web UI:   http://localhost:3000              " -ForegroundColor Yellow
Write-Host "  FastAPI Swagger:   http://127.0.0.1:8000/docs         " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Green
