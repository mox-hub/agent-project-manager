# Agent Project Manager - Desktop Build Script
# Usage: .\scripts\build-desktop.ps1
# Prerequisites: Node.js 22+, pnpm 8.x, Rust toolchain, Tauri CLI

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Agent Project Manager - Desktop Build" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

Write-Host ""
Write-Host "[1/6] Installing dependencies..." -ForegroundColor Yellow
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }

Write-Host ""
Write-Host "[2/6] Type checking..." -ForegroundColor Yellow
pnpm type-check
if ($LASTEXITCODE -ne 0) { throw "Type check failed" }

Write-Host ""
Write-Host "[3/6] Building frontend..." -ForegroundColor Yellow
pnpm --filter "./apps/frontend" run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

Write-Host ""
Write-Host "[4/6] Building backend..." -ForegroundColor Yellow
pnpm --filter "./apps/server" run build
if ($LASTEXITCODE -ne 0) { throw "Server build failed" }

Write-Host ""
Write-Host "[5/6] Generating Prisma client..." -ForegroundColor Yellow
Set-Location "$RootDir/apps/server"
$env:DATABASE_URL = "file:./dev.db"
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "Prisma generate failed" }
Set-Location $RootDir

Write-Host ""
Write-Host "[6/6] Building Tauri desktop app..." -ForegroundColor Yellow
Set-Location "$RootDir/apps/desktop"
pnpm tauri build
if ($LASTEXITCODE -ne 0) { throw "Tauri build failed" }

Set-Location $RootDir

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Build completed successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "NSIS installer: apps/desktop/src-tauri/target/release/bundle/nsis/" -ForegroundColor White
