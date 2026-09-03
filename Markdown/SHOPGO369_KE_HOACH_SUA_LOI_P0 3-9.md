# ShopGo-369 — Kế hoạch sửa lỗi P0 (4 lỗ hổng CRITICAL)

> Nguồn: đối chiếu trực tiếp `SHOPGO369_DOCUMENTATION_AUDIT` với code thật trong repo `hominhsoniib/Shopgo369` (branch `main`).
> Ngày lập: 2026-09-03

---

## 1. Phân tích

Đã đối chiếu trực tiếp với code thật trong repo — xác nhận 100% cả 4 finding đúng như audit mô tả, kèm vị trí file chính xác:

| # | File | Dòng vấn đề | Mức độ |
|---|---|---|---|
| P0-1 | `apps/api/src/modules/catalog/products.controller.ts:48-49` | `@UseGuards(JwtAuthGuard)` thiếu `RolesGuard` + `@Roles()` | Cao — mọi user tạo được sản phẩm, gắn vào store bất kỳ |
| P0-2 | `apps/api/src/modules/payment/payment.controller.ts:39-40` | `mock/simulate` không guard role/ownership/env-gate | **CRITICAL** — giả mạo thanh toán bất kỳ đơn nào |
| P0-3 | `apps/api/src/main.ts:26` | `return callback(null, true);` cuối cùng luôn true bất kể origin | Cao — CORS mở toàn bộ |
| P0-4 | `apps/api/src/app.module.ts` + `main.ts` | Không import `@nestjs/throttler` ở đâu cả | Cao — không rate limit `/auth/*`, `/payments/mock/simulate` |

**Điểm thuận lợi:** `RolesGuard` đã có sẵn, hoạt động đúng chuẩn NestJS (`apps/api/src/common/guards/roles.guard.ts`) — không cần viết lại, chỉ cần **áp dụng đúng chỗ**. `configuration.ts` hiện chưa đọc `NODE_ENV` — cần bổ sung để gate `mock/simulate`.

---

## 2. Kế hoạch — 4 phase độc lập, làm tuần tự theo mức độ khai thác được

| Phase | Nội dung | Effort ước tính |
|---|---|---|
| **Phase 1** | Gate `POST /payments/mock/simulate` (rủi ro tài chính trực tiếp — ưu tiên tuyệt đối). Tiện thể vá luôn IDOR ở `GET /payments/:orderId/status` (finding #5, cùng file) | ~30 phút |
| **Phase 2** | RolesGuard cho `POST /products`, bỏ fallback "store đầu tiên" | ~30 phút |
| **Phase 3** | Sửa CORS reject đúng nghĩa | ~15 phút |
| **Phase 4** | Thêm `@nestjs/throttler` cho `/auth/*` + `/payments/mock/simulate` | ~45 phút |

Mỗi phase: sửa → viết/chạy test → commit riêng (dễ review, dễ revert nếu lỗi).

---

## 3. Workflow triển khai (áp dụng cho từng phase)

```
Sửa code
  → chạy `pnpm test` module liên quan → tsc --noEmit
  → test thủ công bằng curl/Postman (case fail + case pass)
  → commit riêng theo finding (#1, #2, #3, #4)
  → cập nhật README 03-09.md khớp trạng thái thật (đóng MÂU THUẪN #2)
```

---

## 4. Triển khai chi tiết từng phase

### Phase 1 — `payment.controller.ts` (finding #2, CRITICAL + finding #5, IDOR)

**`apps/api/src/config/configuration.ts`** — thêm dòng:
```ts
env: process.env.NODE_ENV ?? 'development',
```

**`payment.controller.ts`**:
```ts
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// ...

@Post('mock/simulate')
simulateMockPayment(@Body() dto: SimulateMockPaymentDto) {
  if (this.configService.get('env') === 'production') {
    throw new ForbiddenException('Endpoint này không khả dụng ở môi trường production');
  }
  const payload = this.paymentService.buildMockWebhookPayload(
    dto.orderId,
    dto.gatewayTransactionRef,
    dto.amount,
    dto.result,
  );
  // ... giữ nguyên phần còn lại
}

@Get(':orderId/status')
async getStatus(@CurrentUser() user: { id: string; roles: string[] }, @Param('orderId') orderId: string) {
  const order = await this.paymentService.getOrderForOwnershipCheck(orderId);
  const isOwner = order?.userId === user.id;
  const isPrivileged = user.roles?.some((r) => ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(r));
  if (!isOwner && !isPrivileged) {
    throw new ForbiddenException('Bạn không có quyền xem trạng thái thanh toán của đơn này');
  }
  return this.paymentService.getStatus(orderId);
}
```
*(Cần thêm hàm `getOrderForOwnershipCheck` trong `payment.service.ts` nếu chưa có sẵn cách lấy `order.userId`.)*

---

### Phase 2 — `products.controller.ts` + `catalog.service.ts` (finding #1)

**`products.controller.ts`**:
```ts
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
@Post()
create(@CurrentUser() user: { id: string }, @Body() dto: CreateProductDto) {
  return this.catalogService.createProduct(user.id, dto);
}
```

**`catalog.service.ts`** — bỏ fallback nguy hiểm:
```ts
async createProduct(userId: string, data: { /* ... */ }) {
  const store = await this.prisma.store.findFirst({ where: { business: { member: { userId } } } });
  if (!store) throw new NotFoundException('Bạn chưa có gian hàng để đăng sản phẩm');
  // ... giữ nguyên phần còn lại
}
```
> Việc admin tạo hộ sản phẩm nên đi qua endpoint riêng `POST /admin/products` (finding #12, P1) — không xử lý bằng fallback ngầm "gán vào store ACTIVE đầu tiên trong DB".

---

### Phase 3 — `main.ts` CORS

```ts
app.enableCors({
  origin: (origin, callback) => {
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') ?? [];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin không được phép bởi CORS'), false);
  },
  credentials: true,
});
```

Cần thêm `CORS_ORIGIN` vào `.env.example` với ví dụ domain thật, ví dụ:
```
CORS_ORIGIN=https://web.shopgo369.vn,https://admin.shopgo369.vn
```

---

### Phase 4 — Rate limiting

```bash
pnpm --filter api add @nestjs/throttler
```

**`app.module.ts`**:
```ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]), // default toàn hệ thống
    // ...các module hiện có
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

Siết riêng cho `/auth/*` (chống brute-force) và `mock/simulate`:
```ts
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
login(...) { ... }
```

---

## 5. Tối ưu / kiểm chứng sau khi hoàn tất cả 4 phase

- [ ] Chạy lại `pnpm test` toàn bộ 6 file spec hiện có, đảm bảo không phá vỡ test cũ.
- [ ] Test thủ công:
  - Gọi `mock/simulate` với `NODE_ENV=production` → phải trả **403**.
  - Gọi `POST /products` bằng user role `CUSTOMER` → phải trả **403**.
  - Gọi API từ origin lạ (không trong `CORS_ORIGIN`) → phải bị **chặn**.
  - Gọi `/auth/login` liên tục >5 lần/phút → phải trả **429**.
- [ ] Cập nhật bảng "Audit bảo mật vòng 1" trong README để khớp thật (đóng MÂU THUẪN #2 trong audit), tránh lặp lại tình trạng "tài liệu nói đã vá nhưng code chưa vá".
- [ ] Sau khi xong P0 mới chuyển sang xử lý P1 (IDOR còn lại ở `shipping/orders/:orderId`, mã hoá CCCD tại rest, đồng bộ README, sửa lỗi tính quý thuế `tax_estimation.py`).

---

## Checklist tổng hợp P0

- [ ] Phase 1: Gate `mock/simulate` theo `NODE_ENV` + vá IDOR `payments/:orderId/status`
- [ ] Phase 2: RolesGuard cho `POST /products` + bỏ fallback store đầu tiên
- [ ] Phase 3: CORS reject đúng nghĩa với origin không hợp lệ
- [ ] Phase 4: `@nestjs/throttler` cho `/auth/*` và `mock/simulate`
- [ ] Chạy full test suite + test thủ công 4 case trên
- [ ] Cập nhật README đồng bộ trạng thái thật
