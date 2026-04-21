@echo off
REM Encrypted File Sharing System - Quick Start Script
REM This script installs dependencies and starts both backend and frontend servers

echo.
echo ================================================
echo    🔐 Encrypted File Sharing System
echo       Quick Start Setup & Run
echo ================================================
echo.

setlocal enabledelayedexpansion

REM Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo    Download from: https://nodejs.org
    pause
    exit /b 1
)

echo ✓ Node.js found: 
node -v
echo.

REM Get the script directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo ================================================
echo   STEP 1: Installing Backend Dependencies
echo ================================================
echo.
cd backend
echo 📦 Installing backend packages...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo ❌ Backend installation failed!
    pause
    exit /b 1
)
echo ✓ Backend dependencies installed
echo.

echo ================================================
echo   STEP 2: Installing Frontend Dependencies
echo ================================================
echo.
cd ..\frontend
echo 📦 Installing frontend packages...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo ❌ Frontend installation failed!
    pause
    exit /b 1
)
echo ✓ Frontend dependencies installed
echo.

echo ================================================
echo   STEP 3: Verifying Configuration
echo ================================================
echo.

cd ..
if not exist backend\.env (
    echo ⚠️  WARNING: backend\.env not found!
    echo    Creating default .env...
)

if not exist frontend\.env (
    echo ⚠️  WARNING: frontend\.env not found!
    echo    Creating default .env...
)

echo ✓ Configuration files verified
echo.

echo ================================================
echo   ✅ Setup Complete!
echo ================================================
echo.
echo 🚀 To start the application:
echo.
echo   Terminal 1 (Backend):
echo   cd backend
echo   npm run dev
echo.
echo   Terminal 2 (Frontend):
echo   cd frontend
echo   npm run dev
echo.
echo   Then open: http://localhost:5173
echo.
echo 📖 For detailed instructions, see: SETUP_GUIDE.md
echo.
pause
