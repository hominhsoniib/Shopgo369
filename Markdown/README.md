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

## ⚠️ Giới hạn cần xử lý trước khi lên production

1. **Chưa build-verify được ở sandbox tạo code này** (giới hạn mạng chặn `binaries.prisma.sh` cho NestJS; không có Flutter SDK cho Mobile). Đã chạy `tsc --noEmit` cho NestJS (chỉ còn lỗi cascade do thiếu Prisma generate — không phải lỗi logic) và `py_compile` cho Python (không lỗi cú pháp). **Bắt buộc** chạy `pnpm prisma:generate && pnpm build` (NestJS), `flutter analyze` (Mobile) trên máy/CI thật trước khi merge.
2. Test kỹ luồng **concurrent checkout** (2 request đặt cùng 1 sản phẩm gần hết hàng) — logic quan trọng nhất Phase 2.
3. Refund flow chưa có API đầy đủ (model `Refund` đã có sẵn, service/API để bổ sung).
4. Guest cart (khách chưa đăng nhập) chưa hỗ trợ — Phase 2 chỉ dùng cho user đã đăng nhập.
5. Tích hợp API vận chuyển thật (GHN/GHTK) — hiện dùng phí tĩnh.
6. Payment Gateway thật (VNPay/Momo) — hiện chỉ có Mock Gateway để test, đã thiết kế theo Adapter pattern nên thêm gateway thật không cần sửa `PaymentService`.
7. Production DB cho Python service cần tách **user quyền hạn chế thật sự ở cấp PostgreSQL** (`GRANT INSERT, UPDATE` chỉ trên 4 bảng report), không chỉ dựa vào whitelist trong code (`report_writer.py`).
8. Đổi mật khẩu admin mặc định (`admin@369.vn` / `ChangeMe@369`) và toàn bộ secret trong `.env.example` trước khi deploy thật.
9. Mobile: chạy `flutter create .` để sinh `android/`/`ios/` project shell, merge với `pubspec.yaml` đã viết sẵn; chưa tích hợp Push Notification (FCM) và WebView thanh toán thật.
10. Chưa viết unit test (đã ghi chú các điểm quan trọng nhất cần test trước: `InventoryService`, `PaymentService.handleWebhook` idempotency, `PromotionsService.incrementUsageAtomic`, `MembersService` giới hạn 1 tầng giới thiệu).

## Tài liệu đầy đủ

Xem `docs/369-platform-specification.md` — kiến trúc, ERD, workflow, API spec, bảo mật, SEO, deployment guide chi tiết cho từng phase.
