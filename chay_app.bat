@echo off
title ShopGo 369 System Launcher
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0chay_app.ps1"
if errorlevel 1 (
    echo.
    echo Co loi xay ra khi khoi chay PowerShell.
    pause
)
