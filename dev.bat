@echo off
title AI PLANNER - Full Dev Mode Launcher
echo ======================================================================
echo           AI PLANNER - Full Development Mode (Backend + Vite)
echo ======================================================================
echo.

cd /d "%~dp0"

echo Starting FastAPI Backend in a new window...
start "AI Planner Backend (Port 8000)" cmd /k "cd /d ""%~dp0"" && "".venv\Scripts\python.exe"" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo Starting Vite Frontend in a new window...
start "AI Planner Vite Dev Server" cmd /k "cd /d ""%~dp0\frontend"" && npm run dev"

echo.
echo ======================================================================
echo Both servers have been launched in separate windows:
echo   - Backend:  http://127.0.0.1:8000
echo   - Frontend: http://localhost:3000
echo.
echo You can now close this launcher window.
echo ======================================================================
pause
