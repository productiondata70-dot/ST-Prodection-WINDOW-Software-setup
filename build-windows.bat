@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo    ST Production and Stock Manager - Windows Builder
echo ========================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please download and install Node.js 18 or 20 LTS from:
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking Node.js and npm version...
node -v
npm -v
echo.

echo [2/3] Installing project dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed. Please check your internet connection.
    pause
    exit /b %errorlevel%
)
echo Dependencies installed successfully.
echo.

echo [3/3] Building and Packaging Windows Software (.exe)...
call npm run package:win
if %errorlevel% neq 0 (
    echo [ERROR] Packaging failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo [SUCCESS] Windows software packaged successfully!
echo ========================================================
echo.
echo Your generated executable files are located in the "release" folder:
echo.
echo   1. Installer Setup:
echo      release\ST Production and Stock Manager-Setup-1.0.0.exe
echo.
echo   2. Standalone Portable:
echo      release\ST Production and Stock Manager-Portable-1.0.0.exe
echo.
echo Opening release folder in Windows Explorer...
explorer release

pause
