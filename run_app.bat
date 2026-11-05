@echo off
title AI PLANNER - Launcher
echo ========================================================
echo        AI PLANNER - Intelligent Personal Agent
echo           Starting Backend and Frontend...
echo ========================================================
echo.

:: 1. Start FastAPI Backend Gateway in a new window
echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "AI Planner - Backend (FastAPI)" cmd /k ".\.venv\Scripts\activate.bat && uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

:: 2. Wait 2 seconds
timeout /t 2 /nobreak >nul

:: 3. Start React Frontend in a new window
echo [2/2] Launching React Frontend on http://localhost:3000 ...
start "AI Planner - Frontend (Vite)" cmd /k "npm run dev --prefix frontend"

echo.
echo ========================================================
echo   AI Planner is now starting!
echo   Frontend: http://localhost:3000
echo   Backend API & Swagger Docs: http://127.0.0.1:8000/docs
echo ========================================================
echo.
pause
