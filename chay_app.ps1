# Set console output encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$AppRoot = $PSScriptRoot

function Show-Menu {
    Clear-Host
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "                   HETHONG QUAN LY SAN TMDT SHOPGO 369" -ForegroundColor Green
    Write-Host "                      (Phan mem chay di dong - Portable)" -ForegroundColor Yellow
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host " Thu muc ung dung: $AppRoot" -ForegroundColor Gray
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host " [1] Khoi chay TAT CA dich vu (Web 3000 + API 4000)" -ForegroundColor White
    Write-Host " [2] Khoi chay Frontend Web (Next.js - Port 3000)" -ForegroundColor White
    Write-Host " [3] Khoi chay Backend API (NestJS - Port 4000)" -ForegroundColor White
    Write-Host " [4] Khoi chay Python Accounting Service (FastAPI - Port 8000)" -ForegroundColor White
    Write-Host " [5] Menu Quan ly Database va Prisma (Migrate / Seed / Studio)" -ForegroundColor White
    Write-Host " [6] Mo Nhanh cac Trang Web va Swagger Docs tren Trinh Duyet" -ForegroundColor White
    Write-Host " [7] Kiem tra Cong (Ports 3000, 4000, 6379, 5432) va Trang thai Dich vu" -ForegroundColor White
    Write-Host " [8] Dung tat ca dich vu dang chay" -ForegroundColor Red
    Write-Host " [0] Thoat" -ForegroundColor Gray
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Cyan
}

function Show-DbMenu {
    Clear-Host
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host " MENU QUAN LY DATABASE VA PRISMA ORM" -ForegroundColor Green
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host " [1] Nap du lieu mau (Prisma Seed Data)" -ForegroundColor White
    Write-Host " [2] Tao va Chay Migration DB (Prisma Migrate Dev)" -ForegroundColor White
    Write-Host " [3] Sinh Client Prisma moi (Prisma Generate)" -ForegroundColor White
    Write-Host " [4] Mo Trinh quan ly DB Giao dien (Prisma Studio - Port 5555)" -ForegroundColor White
    Write-Host " [0] Quay lai Menu Chinh" -ForegroundColor Gray
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Cyan
    
    $choice = Read-Host "Nhap lua chon [0-4]"
    switch ($choice) {
        "1" {
            Write-Host "Dang nap du lieu mau vao DB..." -ForegroundColor Yellow
            Set-Location "$AppRoot\apps\api"
            npx prisma db seed
            Read-Host "Nhan Enter de tiep tuc..."
        }
        "2" {
            Write-Host "Dang chay Migration DB..." -ForegroundColor Yellow
            Set-Location "$AppRoot\apps\api"
            npx prisma migrate dev
            Read-Host "Nhan Enter de tiep tuc..."
        }
        "3" {
            Write-Host "Dang sinh Prisma Client..." -ForegroundColor Yellow
            Set-Location "$AppRoot\apps\api"
            npx prisma generate
            Read-Host "Nhan Enter de tiep tuc..."
        }
        "4" {
            Write-Host "Dang mo Prisma Studio tai http://localhost:5555 ..." -ForegroundColor Yellow
            Start-Process cmd -ArgumentList "/k cd /d `"$AppRoot\apps\api`" && npx prisma studio"
            Read-Host "Nhan Enter de tiep tuc..."
        }
    }
}

function Show-UrlMenu {
    Clear-Host
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host " TRINH DUYET SHORTCUTS - MO TRANG WEB TREN BROWSER" -ForegroundColor Green
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host " [1] Mo Trang chu San ShopGo (http://localhost:3000)" -ForegroundColor White
    Write-Host " [2] Mo Ban Quan Tri Admin Portal (http://localhost:3000/admin/dashboard)" -ForegroundColor White
    Write-Host " [3] Mo Admin Duyet Ho Kinh Doanh KYC (http://localhost:3000/admin/businesses)" -ForegroundColor White
    Write-Host " [4] Mo Admin Quan ly Gian hang (http://localhost:3000/admin/stores)" -ForegroundColor White
    Write-Host " [5] Mo Admin Kiem duyet San pham (http://localhost:3000/admin/products)" -ForegroundColor White
    Write-Host " [6] Mo Kenh Nguoi Ban Seller Center (http://localhost:3000/seller/dashboard)" -ForegroundColor White
    Write-Host " [7] Mo Tai lieu API Swagger Docs (http://localhost:4000/api/docs)" -ForegroundColor White
    Write-Host " [8] Mo Python FastAPI Docs (http://localhost:8000/docs)" -ForegroundColor White
    Write-Host " [0] Quay lai Menu Chinh" -ForegroundColor Gray
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Cyan
    
    $choice = Read-Host "Nhap lua chon [0-8]"
    switch ($choice) {
        "1" { Start-Process "http://localhost:3000" }
        "2" { Start-Process "http://localhost:3000/admin/dashboard" }
        "3" { Start-Process "http://localhost:3000/admin/businesses" }
        "4" { Start-Process "http://localhost:3000/admin/stores" }
        "5" { Start-Process "http://localhost:3000/admin/products" }
        "6" { Start-Process "http://localhost:3000/seller/dashboard" }
        "7" { Start-Process "http://localhost:4000/api/docs" }
        "8" { Start-Process "http://localhost:8000/docs" }
    }
}

do {
    Show-Menu
    $inputChoice = Read-Host "Nhap lua chon [0-8]"
    switch ($inputChoice) {
        "1" {
            Write-Host "Dang khoi chay NestJS API (Port 4000)..." -ForegroundColor Green
            Start-Process cmd -ArgumentList "/k cd /d `"$AppRoot\apps\api`" && npm run dev"
            Start-Sleep -Seconds 2
            Write-Host "Dang khoi chay Next.js Web (Port 3000)..." -ForegroundColor Green
            Start-Process cmd -ArgumentList "/k cd /d `"$AppRoot\apps\web`" && npm run dev"
            Start-Sleep -Seconds 3
            Write-Host "Dang tu dong mo Trinh duyet Web App (http://localhost:3000)..." -ForegroundColor Cyan
            Start-Process "http://localhost:3000"
            Read-Host "Nhan Enter de quay lai Menu..."
        }
        "2" {
            Write-Host "Dang khoi chay Next.js Web (Port 3000)..." -ForegroundColor Green
            Start-Process cmd -ArgumentList "/k cd /d `"$AppRoot\apps\web`" && npm run dev"
            Start-Sleep -Seconds 3
            Write-Host "Dang tu dong mo Trinh duyet Web App (http://localhost:3000)..." -ForegroundColor Cyan
            Start-Process "http://localhost:3000"
            Read-Host "Nhan Enter de quay lai Menu..."
        }
        "3" {
            Write-Host "Dang khoi chay NestJS API (Port 4000)..." -ForegroundColor Green
            Start-Process cmd -ArgumentList "/k cd /d `"$AppRoot\apps\api`" && npm run dev"
            Start-Sleep -Seconds 3
            Write-Host "Dang tu dong mo Swagger API Docs (http://localhost:4000/api/docs)..." -ForegroundColor Cyan
            Start-Process "http://localhost:4000/api/docs"
            Read-Host "Nhan Enter de quay lai Menu..."
        }
        "4" {
            Write-Host "Dang khoi chay Python Accounting Service (Port 8000)..." -ForegroundColor Green
            Start-Process cmd -ArgumentList "/k cd /d `"$AppRoot\apps\accounting-service`" && uvicorn app.main:app --reload --port 8000"
            Start-Sleep -Seconds 3
            Write-Host "Dang tu dong mo Python FastAPI Docs (http://localhost:8000/docs)..." -ForegroundColor Cyan
            Start-Process "http://localhost:8000/docs"
            Read-Host "Nhan Enter de quay lai Menu..."
        }
        "5" { Show-DbMenu }
        "6" { Show-UrlMenu }
        "7" {
            Clear-Host
            Write-Host "KIEM TRA TRANG THAI CAC CONG DICH VU:" -ForegroundColor Yellow
            Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 3000, 4000, 5432, 6379, 8000, 5555 } | Select-Object LocalAddress, LocalPort, OwningProcess | Format-Table -AutoSize
            Read-Host "Nhan Enter de quay lai Menu..."
        }
        "8" {
            Write-Host "Dang dung toan bo cac tien trinh Node.js va Python..." -ForegroundColor Red
            Get-Process node, python -ErrorAction SilentlyContinue | Stop-Process -Force
            Write-Host "Da dung tat ca dich vu!" -ForegroundColor Green
            Read-Host "Nhan Enter de quay lai Menu..."
        }
    }
} while ($inputChoice -ne "0")
