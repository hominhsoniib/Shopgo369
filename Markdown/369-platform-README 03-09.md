# 369 Platform — Full Build (Phase 1-6)

Toàn bộ 6 phase theo `docs/369-platform-specification.md` đã được code:
**Nền tảng · Bán hàng · Seller Center · Kế toán (Hybrid NestJS+Python) · Hệ sinh thái 369 · Mobile**

## Kiến trúc tổng thể

```
apps/
├── web/                 Next.js 14 — storefront + seller + member + admin (route groups)
├── api/                 NestJS — Modular Monolith, 20 module domain
├── accounting-service/  Python FastAPI + Celery — P&L, dự báo, xuất Excel (Mục 3.6 spec)
└── mobile/               Flutter — dùng chung API với Web (Mục 12 spec)
```

## Chạy local (khuyến nghị: Docker — chạy TOÀN BỘ hệ thống 1 lệnh)

```bash
cp .env.example .env                                    # sửa secret trước khi dùng thật
cp apps/accounting-service/.env.example apps/accounting-service/.env
docker compose up --build
```

| Service | URL |
|---|---|
| Web | http://localhost:3000 |
| API (NestJS) | http://localhost:4000/api/v1 |
| Swagger docs | http://localhost:4000/api/docs |
| Accounting Service (nội bộ) | http://localhost:8000/internal/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## Chạy local (không Docker)

```bash
pnpm install

cd apps/api
cp ../../.env.example .env
pnpm prisma:generate && pnpm prisma:migrate && pnpm prisma:seed
pnpm dev                                    # http://localhost:4000

cd apps/web && pnpm install && pnpm dev     # http://localhost:3000

cd apps/accounting-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
celery -A celery_app worker --loglevel=info   # terminal khác
celery -A celery_app beat --loglevel=info     # terminal khác

cd apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1
```

---

## Tổng hợp theo Phase

### Phase 1 — Nền tảng
Auth (JWT+argon2) · RBAC (guard + ownership ở query layer) · Members (giới hạn 1 tầng giới thiệu) · Businesses (KYC) · Stores · Catalog · Admin cơ bản

### Phase 2 — Bán hàng
Cart · Checkout (tách đơn theo store) · **Redis distributed lock chống oversell** (reserve stock TTL 15') · BullMQ (job tự huỷ đơn quá hạn) · Shipping · Payment (Mock Gateway theo Adapter pattern, webhook idempotent)

### Phase 3 — Seller Center
Dashboard doanh thu (raw SQL time-series) · Top sản phẩm · Cảnh báo tồn kho · Promotions (mã giảm giá, tăng `usedCount` atomic chống race condition) · Inventory management

### Phase 4 — Kế toán (Kiến trúc Hybrid — Mục 3.6 spec)
- **NestJS**: ghi bút toán gốc transactional ngay khi `order.paid` (`IncomeTransaction`/`ExpenseTransaction`, idempotent qua unique constraint), sổ thu-chi cơ bản
- **Python** (`apps/accounting-service`): đọc Read Replica, tính P&L (pandas), dự báo doanh thu (linear regression), xuất Excel (openpyxl), 3 Celery Beat job định kỳ (daily/monthly/tax estimation), chỉ có quyền ghi 4 bảng report riêng — **không đụng bảng nguồn**
- NestJS gọi Python qua HTTP nội bộ (API key), có fallback graceful nếu Python service down

### Phase 5 — Hệ sinh thái 369
Commission (1 tầng, giữ 10 ngày, cron duyệt tự động, gộp kỳ chi trả) · Points (cộng khi đơn hoàn tất, tự động lên hạng) · Learning (khoá học/bài học/tiến độ)

### Phase 6 — Mobile
Flutter app dùng chung 100% API với Web — Login, Shop, Product Detail, Cart, Checkout, Order Tracking, Seller Dashboard rút gọn

---

## ⚠️ Trạng thái & giới hạn hiện tại (cập nhật 03/09/2026)

### Đã hoàn thành (khác so với ghi chú "chưa làm" trước đây)
1. ✅ Unit test cho các điểm nhạy cảm nhất: `InventoryService`, `PaymentService.handleWebhook` (idempotency), `PromotionsService.incrementUsageAtomic`, `MembersService` (giới hạn 1 tầng giới thiệu), `RefundService`, Guest Cart — **53/53 test PASS**.
2. ✅ Refund API đầy đủ (`RefundService`/`RefundController`) — 1 refund/đơn (ràng buộc `@@unique([orderId, category])`), duyệt dùng `$executeRaw` atomic chống race condition khi 2 admin cùng duyệt 1 refund.
3. ✅ Guest cart — `Cart.userId` nullable + `sessionId`, `OptionalJwtAuthGuard`, `POST /cart/merge` gộp giỏ khi đăng nhập.
4. ✅ Đổi toàn bộ secret mặc định: mật khẩu seed admin/seller, `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`PAYMENT_MOCK_SECRET`/`INTERNAL_API_KEY` sang giá trị ngẫu nhiên thật; `prisma/seed.ts` chặn cứng seed mật khẩu mặc định khi `NODE_ENV=production`.
5. ✅ Next.js nâng cấp 14.2.0 → 14.2.35 (vá CVE-2025-66478 / 55183 / 55184 / 67779).
6. ✅ Mobile (Flutter): SDK đã cài, `flutter create . --platforms=android,ios` đã sinh project shell, `flutter analyze` = "No issues found!". Biết trước: `flutter test` lỗi do bug đã biết của Dart/Flutter khi path chứa khoảng trắng trên Windows (`objective_c`/`flutter_secure_storage` native-assets hook) — không phải lỗi code, cần dời project ra path không dấu cách để chạy `flutter test`.
7. ✅ **Audit bảo mật vòng 1 (03/09/2026)** — xem chi tiết mục "Bảo mật" bên dưới.

### Chưa làm — cần xử lý trước khi lên production
1. Tích hợp Payment/Shipping gateway thật (VNPay/Momo/GHN) — hiện dùng Mock Gateway (Adapter pattern, không cần sửa `PaymentService` khi thêm gateway thật). **Quyết định có chủ đích**: chỉ làm sau khi backend + Refund API chạy ổn định thực tế, tránh phát sinh giao dịch thật khi hệ thống còn khả năng lỗi nghiệp vụ.
2. Production DB cho Python accounting service cần tách **user quyền hạn chế thật ở cấp PostgreSQL** (`GRANT INSERT, UPDATE` chỉ trên 4 bảng report), không chỉ dựa vào whitelist trong code (`report_writer.py`).
3. Chưa test tải thật (load test) cho luồng concurrent checkout ở quy mô production.
4. Mobile: chưa tích hợp Push Notification (FCM) và WebView thanh toán thật; `flutter test` hiện chạy được cho từng phần nhưng bị bug path-with-space (mục 6 ở trên) khi chạy toàn bộ.
5. `apps/api/prisma:generate && pnpm build`, `pnpm --filter web build` cần chạy lại trên máy/CI có mạng đầy đủ (sandbox tạo code này bị chặn `binaries.prisma.sh` và `fonts.googleapis.com`) trước khi merge bản vá bảo mật mới nhất.

---

## 🔒 Bảo mật — Audit vòng 1 (03/09/2026)

Rà soát sau khi cập nhật giao diện (font) và tính năng Admin panel (upload ảnh sản phẩm). Phát hiện & xử lý:

| # | Vấn đề | Mức độ | Trạng thái |
|---|---|---|---|
| 1 | CORS: nhánh `else` luôn `callback(null, true)` bất kể origin có trong whitelist hay không — chấp nhận **mọi** origin kèm `credentials: true` | Nghiêm trọng | ✅ Đã vá (`apps/api/src/main.ts`) |
| 2 | Không có rate limit cho `/auth/login`, `/auth/register`, `/auth/refresh` — brute-force không giới hạn | Cao | ✅ Đã vá — `@nestjs/throttler` (60 req/phút toàn API, 5–10 req/phút riêng auth) |
| 3 | Thiếu security headers cơ bản (X-Frame-Options, HSTS...) | Trung bình | ✅ Đã vá — thêm `helmet()` |
| 4 | Admin panel "Thêm sản phẩm": ảnh chỉ đọc base64 nhét vào JSON, gọi nhầm `POST /products` (Seller-only, tự suy `storeId` từ user hiện tại) → luôn lỗi với tài khoản admin; không có validate ảnh thật phía server | Trung bình (bug chức năng, không khai thác được nhờ `forbidNonWhitelisted`) | ✅ Đã vá — endpoint mới `POST /admin/products` (admin chọn `storeId`) + `POST /admin/uploads/image` (multipart thật, giới hạn 5MB, kiểm tra magic-bytes JPEG/PNG/WEBP thay vì tin mimetype/tên file client gửi, lưu tên file ngẫu nhiên) |
| 5 | `admin/layout.tsx` không kiểm tra đăng nhập/role phía client — ai cũng xem được khung giao diện quản trị dù dữ liệu vẫn được API chặn đúng | Thấp | ✅ Đã vá — check `getCurrentUser().roles` (`ADMIN`/`SUPER_ADMIN`), redirect `/login` nếu không hợp lệ |
| 6 | Access/refresh token lưu ở `localStorage` — nếu có XSS thì mất token toàn bộ | Thấp (khuyến nghị) | ⏳ Chưa vá — cân nhắc chuyển sang cookie `httpOnly` ở giai đoạn sau (thay đổi kiến trúc auth, không làm vội) |

Verify: `tsc --noEmit` sạch ở cả `apps/api` và `apps/web` cho toàn bộ file đã sửa. `pnpm install` cho `multer`/`@types/multer`/`helmet`/`@nestjs/throttler` thành công. `next build` và `pnpm --filter api build` **chưa build-verify được đầy đủ** trong sandbox này do mạng chặn `fonts.googleapis.com` (Google Fonts, dùng bởi `next/font/google`) và `binaries.prisma.sh` — cần chạy lại trên máy/CI thật trước khi merge.

## Tài liệu đầy đủ

Xem `docs/369-platform-specification.md` — kiến trúc, ERD, workflow, API spec, bảo mật, SEO, deployment guide chi tiết cho từng phase.
