# ShopGo-369 — Báo cáo đã sửa (P0 + 3 lỗi P1 mới soi ra)

> Đã clone trực tiếp `hominhsoniib/Shopgo369` (branch `main`), sửa code thật, kiểm chứng bằng `tsc --noEmit` (TypeScript) + `py_compile` + test logic thủ công (Python). Không có lỗi TS/Python mới nào phát sinh từ các thay đổi này.
> File đính kèm `shopgo369_p0_p1_fixes.patch` — áp trực tiếp vào repo bằng `git apply shopgo369_p0_p1_fixes.patch` từ thư mục gốc repo, hoặc dùng làm tài liệu review cho PR.

---

## Đã sửa — 4 P0 (CRITICAL)

| # | File | Trước | Sau |
|---|---|---|---|
| P0-1 | `apps/api/src/modules/catalog/products.controller.ts` | `POST /products` chỉ có `JwtAuthGuard` | Thêm `RolesGuard` + `@Roles('SELLER','ADMIN','SUPER_ADMIN')` |
| P0-1b | `apps/api/src/modules/catalog/catalog.service.ts` | Fallback tự gán vào "gian hàng ACTIVE đầu tiên trong DB" nếu user không có store | Bỏ fallback — không có store thì `NotFoundException`, không suy đoán ngầm |
| P0-2 | `apps/api/src/modules/payment/payment.controller.ts` + `config/configuration.ts` | `mock/simulate` không gate gì, chỉ có comment cảnh báo | Chặn cứng bằng `NODE_ENV === 'production'` → `ForbiddenException`, không chỉ dựa comment |
| P0-3 | `apps/api/src/main.ts` | CORS `return callback(null, true)` vô điều kiện ở nhánh cuối | Đổi thành `return callback(new Error(...), false)` — reject đúng nghĩa |
| P0-4 | `apps/api/src/app.module.ts`, `payment.controller.ts`, `auth.controller.ts`, `package.json` | Không có rate limiting ở đâu cả | Thêm `@nestjs/throttler` global (20 req/phút mặc định) + siết riêng `login`, `register`, `mock/simulate` (5 req/phút) |

## Đã sửa thêm — 3 lỗi P1 mới soi ra khi đào sâu

| # | File | Vấn đề | Cách sửa |
|---|---|---|---|
| P1-5 | `payment.controller.ts` + `payment.service.ts` | `GET /payments/:orderId/status` không kiểm tra ownership (IDOR — finding #5) | Thêm kiểm tra `order.userId === user.id` hoặc role `ADMIN/SUPER_ADMIN/ACCOUNTANT` trước khi trả dữ liệu |
| P1-6 | `shipping.controller.ts` + `shipping.service.ts` | `GET /shipping/orders/:orderId` chỉ cần đăng nhập là xem được tracking của **bất kỳ** đơn nào (IDOR — finding #6) | Thêm kiểm tra buyer / seller sở hữu store / role `ADMIN` |
| P1-17 | `apps/accounting-service/app/tasks/tax_estimation.py` | Job chạy đầu quý nhưng tính doanh thu **quý hiện tại** (vừa mới bắt đầu, gần như = 0) thay vì **quý vừa kết thúc** → số liệu kê khai thuế sai hoàn toàn | Thêm `_previous_quarter_range()`, đã test cả 2 trường hợp (giữa năm + qua năm mới) — PASS |
| P1-16/18 | `apps/accounting-service/app/db/report_writer.py` | `ON CONFLICT (id)` nhưng `id` luôn là UUID mới sinh mỗi lần gọi → **không bao giờ trùng "id" thật**, khiến lần chạy lại cho cùng kỳ/cùng store vi phạm unique constraint nghiệp vụ thật trong schema và **ném lỗi IntegrityError** (nặng hơn cả audit mô tả — không phải "nhân đôi report" mà là job **crash khi retry**) | Thêm `BUSINESS_KEY_COLUMNS` map đúng khoá `@@unique(...)` thật của từng bảng (`accounting_reports`, `revenue_forecasts`, `tax_estimation_snapshots`), `ON CONFLICT` target đúng khoá đó |

---

## Kiểm chứng đã thực hiện
- `pnpm install` thành công cho `apps/api` (thêm `@nestjs/throttler@^6.2.1`).
- `npx tsc --noEmit` — **0 lỗi mới** trong 8 file TypeScript đã sửa. Các lỗi còn sót lại (`@prisma/client` thiếu export enum, `jest`/`expect` không tìm thấy ở file `.spec.ts`) đều **có sẵn từ trước**, do sandbox không tải được Prisma engine binary + thiếu cấu hình test runner — không liên quan tới thay đổi lần này.
- `python3 -m py_compile` sạch cho cả 2 file Python đã sửa.
- Test logic thủ công cho `_previous_quarter_range()`: chạy đầu Q4/2026 → đúng tính Q3/2026; chạy đầu Q1/2027 (qua năm mới) → đúng tính Q4/2026. Cả 2 case PASS.

## Chưa làm trong đợt này (còn lại trong P1/P2/P3 của audit gốc)
- Mã hoá `ownerIdCard` (CCCD) tại rest — cần chọn giải pháp KMS/mã hoá cột, ảnh hưởng migration.
- Đồng bộ lại README theo đúng trạng thái code thật (đóng MÂU THUẪN #1, #2).
- `POST /admin/products` + upload ảnh multipart thật (finding #12).
- 2FA cho Admin/Super Admin, chuyển token web sang cookie httpOnly, các module còn thiếu (wallet, notification, review...).

## Cách áp dụng
```bash
cd Shopgo369   # thư mục gốc repo thật của anh
git apply /đường/dẫn/shopgo369_p0_p1_fixes.patch
git diff --stat   # xác nhận đúng 14 file thay đổi
pnpm install       # cài @nestjs/throttler mới
pnpm test          # chạy lại 6 file spec hiện có
```
Sau đó review kỹ từng hunk (đặc biệt `catalog.service.ts` — đổi hành vi tạo sản phẩm) trước khi merge, rồi commit riêng theo từng finding như đã bàn để dễ audit lại.
