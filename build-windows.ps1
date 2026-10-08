# PowerShell Build Script for ST Production and Stock Manager

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   ST Production and Stock Manager - Windows Builder    " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please download and install Node.js 18 or 20 LTS from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/3] Node environment:" -ForegroundColor Green
node -v
npm -v
Write-Host ""

Write-Host "[2/3] Installing dependencies..." -ForegroundColor Green
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[3/3] Building production bundle and packaging Windows .exe..." -ForegroundColor Green
npm run package:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build packaging failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "[SUCCESS] Windows Software built successfully!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your .exe files are ready in the 'release' folder:" -ForegroundColor Cyan
Get-ChildItem -Path "release\*.exe" | ForEach-Object {
    Write-Host "  -> $($_.Name) ($([math]::Round($_.Length / 1MB, 2)) MB)" -ForegroundColor Yellow
}
Write-Host ""
