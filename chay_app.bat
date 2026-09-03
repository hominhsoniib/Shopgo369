@echo off
chcp 65001 > nul
title HỆ THỐNG QUẢN LÝ & KHỞI CHẠY 369 PLATFORM (PORTABLE)
color 0A

:: Đảm bảo lấy chính xác thư mục gốc chứa file chay_app.bat (xử lý tốt đường dẫn chứa dấu cách)
set "APP_ROOT=%~dp0"
if "%APP_ROOT:~-1%"=="\" set "APP_ROOT=%APP_ROOT:~0,-1%"
cd /d "%APP_ROOT%"

:MAIN_MENU
cls
echo ================================================================================
echo                    🚀 HỆ THỐNG QUẢN LÝ SÀN TMĐT SHOPGO 369 🚀
echo                       (Phần mềm chạy di động - Portable)
echo ================================================================================
echo  Thư mục ứng dụng: %APP_ROOT%
echo ================================================================================
echo.
echo  [1] 🚀 Khởi chạy TẤT CẢ dịch vụ (Web 3000 + API 4000)
echo  [2] 🌐 Khởi chạy Frontend Web (Next.js — Port 3000)
echo  [3] ⚙️ Khởi chạy Backend API (NestJS — Port 4000)
echo  [4] 🐍 Khởi chạy Python Accounting Service (FastAPI — Port 8000)
echo  [5] 🗄️ Menu Quản lý Database & Prisma (Migrate / Seed / Studio)
echo  [6] 🔗 Mở Nhanh các Trang Web & Swagger Docs trên Trình Duyệt
echo  [7] 🔍 Kiểm tra Cổng (Ports 3000, 4000, 6379) & Trạng thái Dịch vụ
echo  [8] 🛑 Dừng tất cả dịch vụ đang chạy
echo  [0] 🚪 Thoát
echo.
echo ================================================================================
set /p choice="Nhập lựa chọn của bạn [0-8] và nhấn Enter: "

if "%choice%"=="1" goto START_ALL
if "%choice%"=="2" goto START_WEB
if "%choice%"=="3" goto START_API
if "%choice%"=="4" goto START_PYTHON
if "%choice%"=="5" goto MENU_DB
if "%choice%"=="6" goto MENU_URLS
if "%choice%"=="7" goto CHECK_PORTS
if "%choice%"=="8" goto STOP_ALL
if "%choice%"=="0" exit
goto MAIN_MENU

:START_ALL
cls
echo ================================================================================
echo 🚀 ĐANG KHỞI CHẠY TẤT CẢ DỊCH VỤ DƯỚI CỬA SỔ RIÊNG...
echo ================================================================================
echo.
echo 1. Đang bật Backend NestJS API (Port 4000)...
start "ShopGo API (Port 4000)" /D "%APP_ROOT%\apps\api" cmd /k "npm run dev"
timeout /t 3 > nul

echo 2. Đang bật Frontend Next.js Web (Port 3000)...
start "ShopGo Web (Port 3000)" /D "%APP_ROOT%\apps\web" cmd /k "npm run dev"

echo.
echo ✅ Đã khởi chạy các cửa sổ làm việc độc lập cho Web và API!
echo.
pause
goto MAIN_MENU

:START_WEB
cls
echo ================================================================================
echo 🌐 ĐANG KHỞI CHẠY FRONTEND WEB (NEXT.JS - PORT 3000)...
echo ================================================================================
start "ShopGo Web (Port 3000)" /D "%APP_ROOT%\apps\web" cmd /k "npm run dev"
echo ✅ Đã mở cửa sổ làm việc cho Web Frontend!
pause
goto MAIN_MENU

:START_API
cls
echo ================================================================================
echo ⚙️ ĐANG KHỞI CHẠY BACKEND API (NESTJS - PORT 4000)...
echo ================================================================================
start "ShopGo API (Port 4000)" /D "%APP_ROOT%\apps\api" cmd /k "npm run dev"
echo ✅ Đã mở cửa sổ làm việc cho Backend API!
pause
goto MAIN_MENU

:START_PYTHON
cls
echo ================================================================================
echo 🐍 ĐANG KHỞI CHẠY PYTHON ACCOUNTING SERVICE (FASTAPI - PORT 8000)...
echo ================================================================================
start "ShopGo Python Accounting (Port 8000)" /D "%APP_ROOT%\apps\accounting-service" cmd /k "uvicorn app.main:app --reload --port 8000"
echo ✅ Đã mở cửa sổ làm việc cho Python Service!
pause
goto MAIN_MENU

:MENU_DB
cls
echo ================================================================================
echo 🗄️ MENU QUẢN LÝ DATABASE & PRISMA ORM
echo ================================================================================
echo.
echo  [1] 🌱 Nạp dữ liệu mẫu (Prisma Seed Data)
echo  [2] 🔄 Tạo & Chạy Migration DB (Prisma Migrate Dev)
echo  [3] ⚡ Sinh Client Prisma mới (Prisma Generate)
echo  [4] 🖥️ Mở Trình quản lý DB Giao diện (Prisma Studio — Port 5555)
echo  [0] ↩️ Quay lại Menu Chính
echo.
echo ================================================================================
set /p db_choice="Nhập lựa chọn [0-4]: "

if "%db_choice%"=="1" (
    echo Đang nạp dữ liệu mẫu vào DB...
    cd /d "%APP_ROOT%\apps\api"
    call npx prisma db seed
    pause
    goto MENU_DB
)
if "%db_choice%"=="2" (
    echo Đang chạy Migration DB...
    cd /d "%APP_ROOT%\apps\api"
    call npx prisma migrate dev
    pause
    goto MENU_DB
)
if "%db_choice%"=="3" (
    echo Đang sinh Prisma Client...
    cd /d "%APP_ROOT%\apps\api"
    call npx prisma generate
    pause
    goto MENU_DB
)
if "%db_choice%"=="4" (
    echo Đang khởi chạy Prisma Studio tại http://localhost:5555 ...
    start "Prisma Studio" /D "%APP_ROOT%\apps\api" cmd /k "npx prisma studio"
    pause
    goto MENU_DB
)
if "%db_choice%"=="0" goto MAIN_MENU
goto MENU_DB

:MENU_URLS
cls
echo ================================================================================
echo 🔗 TRÌNH DUYỆT SHORTCUTS — MỞ TRANG WEB TRÊN BROWSER
echo ================================================================================
echo.
echo  [1] 🛒 Mở Trang chủ Sàn ShopGo (http://localhost:3000)
echo  [2] 👑 Mở Ban Quản Trị Admin Portal (http://localhost:3000/admin/dashboard)
echo  [3] 🏢 Mở Admin Duyệt Hộ Kinh Doanh KYC (http://localhost:3000/admin/businesses)
echo  [4] 🏪 Mở Admin Quản lý Gian hàng (http://localhost:3000/admin/stores)
echo  [5] 📦 Mở Admin Kiểm duyệt Sản phẩm (http://localhost:3000/admin/products)
echo  [6] 🏬 Mở Kênh Người Bán Seller Center (http://localhost:3000/seller/dashboard)
echo  [7] 📚 Mở Tài liệu API Swagger Docs (http://localhost:4000/api/docs)
echo  [8] 🐍 Mở Python FastAPI Docs (http://localhost:8000/docs)
echo  [0] ↩️ Quay lại Menu Chính
echo.
echo ================================================================================
set /p url_choice="Nhập lựa chọn [0-8]: "

if "%url_choice%"=="1" start http://localhost:3000
if "%url_choice%"=="2" start http://localhost:3000/admin/dashboard
if "%url_choice%"=="3" start http://localhost:3000/admin/businesses
if "%url_choice%"=="4" start http://localhost:3000/admin/stores
if "%url_choice%"=="5" start http://localhost:3000/admin/products
if "%url_choice%"=="6" start http://localhost:3000/seller/dashboard
if "%url_choice%"=="7" start http://localhost:4000/api/docs
if "%url_choice%"=="8" start http://localhost:8000/docs
if "%url_choice%"=="0" goto MAIN_MENU
goto MENU_URLS

:CHECK_PORTS
cls
echo ================================================================================
echo 🔍 KIỂM TRA TRẠNG THÁI CÁC CỔNG (PORTS) ĐANG LẮNG NGHE
echo ================================================================================
echo.
powershell -Command "Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 3000, 4000, 5432, 6379, 8000, 5555 } | Select-Object LocalAddress, LocalPort, OwningProcess | Format-Table -AutoSize"
echo.
echo Ghi chú:
echo - Port 3000 : Next.js Web Frontend
echo - Port 4000 : NestJS API Backend
echo - Port 6379 : Redis Broker
echo - Port 5432 : PostgreSQL Database
echo - Port 8000 : Python Accounting Service
echo - Port 5555 : Prisma Studio
echo.
pause
goto MAIN_MENU

:STOP_ALL
cls
echo ================================================================================
echo 🛑 ĐANG DỪNG TẤT CẢ DỊCH VỤ NODE / NEST / NEXT ĐANG CHẠY...
echo ================================================================================
echo.
powershell -Command "Get-Process node, python -ErrorAction SilentlyContinue | Stop-Process -Force"
echo ✅ Đã dừng toàn bộ các tiến trình Node.js và Python!
echo.
pause
goto MAIN_MENU
