@echo off
title AI PLANNER - Personal Planning Agent
echo ======================================================================
echo           AI PLANNER - Intelligent Personal Planning Agent
echo ======================================================================
echo.

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found at .venv\Scripts\python.exe!
    echo Please make sure you are running from the AI-Planner root directory.
    echo.
    pause
    exit /b 1
)

echo [1/2] Virtual environment verified (.venv)
echo [2/2] Starting AI Planner Server on port 8000...
echo.
echo ======================================================================
echo   * APPLICATION IS LIVE AT:
echo     Website UI:       http://127.0.0.1:8000
echo     Voice Assistant:  http://127.0.0.1:8000/voice
echo     Interactive Docs: http://127.0.0.1:8000/docs
echo.
echo   Keep this terminal window OPEN while using the application.
echo   To stop the server, press Ctrl+C in this window.
echo ======================================================================
echo.

".venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
