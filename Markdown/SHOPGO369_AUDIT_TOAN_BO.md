# ShopGo-369 — Audit toàn bộ (P0 + P1 đã sửa, quét hết 19 controller + 2 service Python)

> Phạm vi lần này: đọc **toàn bộ 19 controller** trong `apps/api` (không chỉ 4 finding cũ), cả 2 service Python (`accounting-service`), file cấu hình/env, docker-compose, CI workflow, và quét pattern rủi ro (secret hardcode, XSS, timing attack) trên `apps/web` + `apps/mobile`.

---

## Tổng kết nhanh
- **19/19 controller đã đọc.** 15/19 controller vốn đã đúng chuẩn (guard + ownership check qua `user.id`) — không phải sửa gì thêm.
- **4 P0 đã sửa ở lượt trước** (RolesGuard sản phẩm, gate mock/simulate, CORS, rate limit) — không lặp lại ở đây.
- **3 P1 đã sửa ở lượt trước** (IDOR payment status, IDOR shipping tracking, sai quý thuế, upsert_report sai khoá).
- **4 lỗi MỚI soi ra ở lượt audit toàn bộ này** — tất cả nằm ở tầng xác thực bí mật (secret/signature), một dạng lỗi khác hẳn nhóm IDOR/guard đã tìm trước đó. Đã sửa cả 4.

---

## 4 lỗi mới phát hiện + đã sửa

### 1. So sánh chữ ký webhook thanh toán bằng `!==` — timing attack
**File:** `apps/api/src/modules/payment/gateways/mock-payment.gateway.ts`
`payload.signature !== expectedSignature` là so sánh chuỗi thông thường — thời gian xử lý phụ thuộc vào việc ký tự đầu tiên sai lệch sớm hay muộn, về lý thuyết lộ thông tin qua đo độ trễ lặp lại nhiều lần. Đây là **endpoint webhook thật, KHÔNG có JwtAuthGuard** (`webhooks.controller.ts` — đúng thiết kế, vì cổng thanh toán ngoài không có JWT hệ thống), nên toàn bộ bảo mật dồn hết vào việc verify chữ ký này.
→ Đổi sang `crypto.timingSafeEqual` (constant-time), kèm validate hex + độ dài trước khi so sánh để tránh crash khi input rác.

### 2. `PAYMENT_MOCK_SECRET` rỗng vẫn chạy được ở production
Cùng file trên: `const secret = ... ?? ''`. Nếu quên set biến môi trường này ở production, secret = chuỗi rỗng — HMAC-SHA256 với key rỗng là thuật toán ai cũng tính được, tức **ai cũng tự ký giả webhook được** mà không cần biết secret thật.
→ Thêm guard: nếu secret rỗng và `NODE_ENV=production` → throw ngay, từ chối xử lý (đúng pattern `seed.ts` đã áp dụng cho `SEED_ADMIN_PASSWORD`, nhưng trước đây **không áp dụng nhất quán** cho payment secret).

### 3. So sánh `INTERNAL_API_KEY` bằng `!=` trong Python — cùng lỗi timing attack
**File:** `apps/accounting-service/app/api/internal/auth.py`
`x_internal_api_key != settings.internal_api_key` — cùng dạng lỗi như #1 nhưng ở service Python, bảo vệ toàn bộ API nội bộ giữa NestJS ↔ Accounting Service.
→ Đổi sang `hmac.compare_digest()` (constant-time chuẩn của Python).

### 4. `INTERNAL_API_KEY` mặc định `"change-me-internal-api-key"` — công khai trong mã nguồn, không có guard production
**File:** `apps/accounting-service/app/core/config.py` + `docker-compose.yml`
Giá trị mặc định này nằm ngay trong `config.py` (không phải chỉ trong `.env.example`) — nếu deploy production mà quên set `INTERNAL_API_KEY` thật, key mặc định **đã công khai sẵn trong repo** (kể cả trong tài liệu audit này) vẫn hoạt động bình thường, ai đọc được source code cũng gọi thẳng API nội bộ.
→ Thêm field `env` vào `Settings` (đọc từ biến `ENV`, mặc định `development`), chặn cứng nếu `internal_api_key` còn là giá trị mặc định và `ENV=production`.

---

## Đã rà nhưng KHÔNG có lỗi (để anh yên tâm, không phải chỉ báo lỗi)
- **15 controller còn lại** (`accounting`, `admin`, `businesses`, `cart`, `categories`, `commission`, `inventory`, `learning`, `members`, `orders`, `refund`, `points`, `promotions`, `seller-analytics`, `stores`) — đều dùng đúng pattern: lấy `user.id` từ `@CurrentUser()`, không nhận `storeId`/`userId` trực tiếp từ client để tra cứu, có `RolesGuard` ở route cần phân quyền admin.
- **`webhooks.controller.ts`** — không có `JwtAuthGuard` là **đúng thiết kế** (gateway ngoài gọi vào, không có JWT), bảo mật đúng chỗ là verify signature (đã vá điểm yếu ở #1, #2).
- **`accounting-service` — 2 endpoint internal** (`/internal/reports/*`, `/internal/forecast/*`) đều có `Depends(verify_internal_api_key)`, không endpoint nào bị bỏ sót guard.
- **Không có secret hardcode** nào ngoài các placeholder `change-me-...` đã biết trong `.env.example`/`docker-compose.yml`.
- **`apps/web`** — không có `dangerouslySetInnerHTML`, `eval()`, hay gán `innerHTML` trực tiếp (không có lỗ hổng XSS kiểu này).
- **`apps/mobile`** — không hardcode base URL/API key ngoài `AppConfig.apiBaseUrl` cấu hình theo môi trường build.
- **CI workflow** (`.github/workflows`) — không có secret bị lộ trong log/config.

---

## Kiểm chứng
- `python3 -m py_compile` sạch cho `auth.py` + `config.py`.
- `npx tsc --noEmit` — không có lỗi TS mới trong `mock-payment.gateway.ts` (2 lỗi còn lại là do Prisma client chưa generate được trong sandbox — môi trường, không phải code).

## Tổng hợp file đã thay đổi (18 file, tính cả lượt P0+P1 trước)
```
apps/accounting-service/.env.example
apps/accounting-service/app/api/internal/auth.py
apps/accounting-service/app/core/config.py
apps/accounting-service/app/db/report_writer.py
apps/accounting-service/app/tasks/tax_estimation.py
apps/api/package.json
apps/api/src/app.module.ts
apps/api/src/config/configuration.ts
apps/api/src/main.ts
apps/api/src/modules/catalog/catalog.service.ts
apps/api/src/modules/catalog/products.controller.ts
apps/api/src/modules/identity/auth/auth.controller.ts
apps/api/src/modules/payment/gateways/mock-payment.gateway.ts
apps/api/src/modules/payment/payment.controller.ts
apps/api/src/modules/payment/payment.service.ts
apps/api/src/modules/shipping/shipping.controller.ts
apps/api/src/modules/shipping/shipping.service.ts
pnpm-lock.yaml
```
File `shopgo369_p0_p1_fixes.patch` đính kèm đã được cập nhật, gồm **toàn bộ** thay đổi trên (không cần patch riêng cho đợt này).

## Còn lại chưa động tới (ngoài phạm vi bảo mật/logic đã audit)
- Mã hoá CCCD (`ownerIdCard`) tại rest.
- Đồng bộ README theo trạng thái code thật.
- `POST /admin/products`, upload ảnh multipart thật, 2FA admin, cookie httpOnly cho token web.
- Chưa audit sâu: `apps/web` (logic nghiệp vụ), `apps/mobile` (toàn bộ business logic Dart), migration SQL, hiệu năng query N+1 — đây là audit tập trung vào bảo mật (authz/authn/secret), chưa phải audit hiệu năng hay chất lượng code toàn diện.
