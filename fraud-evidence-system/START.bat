@echo off
REM ============================================
REM   Fraud Evidence System - Quick Starter
REM ============================================
REM 
REM This script starts both Backend and Frontend
REM Author: Auto-generated
REM Date: 2025-10-14
REM
REM ============================================

cls
echo.
echo ========================================
echo   FRAUD EVIDENCE SYSTEM
echo   Quick Start Launcher
echo ========================================
echo.

REM Check if Node.js is installed
echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js 18 or higher from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)
node --version
echo     Node.js found!
echo.

REM Check if Backend exists
echo [2/4] Checking Backend directory...
if not exist "Backend\server.js" (
    echo.
    echo ERROR: Backend directory not found!
    echo Please make sure you're in the project root directory.
    echo.
    pause
    exit /b 1
)
echo     Backend found!
echo.

REM Check if Frontend exists
echo [3/4] Checking Frontend directory...
if not exist "Frontend\package.json" (
    echo.
    echo ERROR: Frontend directory not found!
    echo Please make sure you're in the project root directory.
    echo.
    pause
    exit /b 1
)
echo     Frontend found!
echo.

REM Start Backend Server
echo [4/4] Starting services...
echo.
echo Starting Backend Server (Port 5050)...
start "Backend Server - Port 5050" cmd /k "cd /d %~dp0Backend && npm start"

REM Wait for backend to initialize
timeout /t 5 /nobreak >nul

echo Starting Frontend App (Port 3000)...
start "Frontend App - Port 3000" cmd /k "cd /d %~dp0Frontend && npm start"

echo.
echo ========================================
echo   SYSTEM STARTED!
echo ========================================
echo.
echo Backend API:  http://localhost:5050
echo Frontend App: http://localhost:3000
echo Health Check: http://localhost:5050/health
echo.
echo ========================================
echo   LOGIN CREDENTIALS
echo ========================================
echo Email:    admin@fraudevidence.com
echo Password: Admin@123456
echo.
echo ========================================
echo.
echo Two new windows have opened:
echo   1. Backend Server (Port 5050)
echo   2. Frontend App (Port 3000)
echo.
echo Wait for both to finish loading, then:
echo   - Open browser to http://localhost:3000
echo   - Login with credentials above
echo.
echo To stop servers: Close the server windows
echo                   or press Ctrl+C in each
echo.
echo Press any key to close this window...
echo (Servers will continue running)
echo.
pause >nul

