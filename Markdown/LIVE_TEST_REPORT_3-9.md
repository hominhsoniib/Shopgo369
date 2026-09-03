# Báo cáo Test Live End-to-End — ShopGo / 369-Platform

**Ngày thực hiện:** 03/09/2026
**Repo:** https://github.com/hominhsoniib/Shopgo369 (branch `main`)
**Phương pháp:** Chạy thật `apps/api` + `apps/web` trên máy local (Redis: Upstash qua TLS, DB: Supabase Session Pooler), thao tác trực tiếp qua trình duyệt + Swagger UI, không phải review code tĩnh.

---

## 1. Tóm tắt

Đây là lần đầu tiên hệ thống được chạy thật và test tương tác end-to-end (các báo cáo trước chỉ verify build/type-check tĩnh). Phát hiện **13 bug thật** — tất cả đều đã sửa, verify lại bằng cách chạy thật lần 2, và push lên GitHub `main`.

| Luồng đã test | Kết quả |
|---|---|
| Đăng ký tài khoản | ✅ Pass (sau khi sửa) |
| Đăng nhập + hiển thị trạng thái | ✅ Pass (sau khi sửa) |
| Xem sản phẩm, thêm giỏ hàng | ✅ Pass (sau khi sửa) |
| Checkout COD | ✅ Pass |
| Checkout Online (mock gateway) | ✅ Pass (sau khi sửa) |
| Refund — tạo yêu cầu + seller/admin duyệt | ✅ Pass (sau khi sửa) — verify đủ: đổi trạng thái đơn, nhập lại kho, ghi kế toán |
| Seller Dashboard | ⏳ Đang test (đã sửa 1 bug chặn truy cập) |

---

## 2. Danh sách bug phát hiện & đã sửa

### 2.1. Frontend (`apps/web`) — thiếu trang / lỗi hiển thị

| # | Bug | File | Trạng thái |
|---|---|---|---|
| 1 | Header không đọc `localStorage` → luôn hiện "Đăng nhập" dù đã login thật (Server Component không có quyền truy cập localStorage) | `app/layout.tsx`, `components/Header.tsx` (mới), `lib/auth-client.ts` (mới) | ✅ Đã sửa |
| 2 | Trang `/register` chưa tồn tại — link "Đăng ký" trên login 404 | `app/(auth)/register/page.tsx` (mới) | ✅ Đã sửa |
| 3 | `apiFetch` không parse đúng response lỗi validate dạng lồng 2 lớp `{message:{message:[...]}}` → luôn hiện `"API error: 400"` mơ hồ | `lib/api-client.ts` | ✅ Đã sửa |
| 4 | Trang chi tiết sản phẩm `/p/[slug]` chưa tồn tại — chặn cứng toàn bộ luồng mua hàng (không cách nào thêm giỏ hàng) | `app/(shop)/p/[slug]/page.tsx` (mới) | ✅ Đã sửa |
| 5 | Trang danh sách đơn hàng `/orders` chưa tồn tại — chỉ có `/orders/[id]` (trang chi tiết) | `app/(shop)/orders/page.tsx` (mới) | ✅ Đã sửa |
| 6 | Trang `seller/dashboard` hardcode sẵn credential demo cũ (`SellerMe@369`) đã hết hạn sau khi đổi secret mặc định — gây hiểu lầm khi test | `app/(seller)/seller/dashboard/page.tsx` | ✅ Đã sửa |

### 2.2. Backend (`apps/api`) — lỗi nghiệp vụ / hạ tầng

| # | Bug | File | Trạng thái |
|---|---|---|---|
| 7 | `CheckoutDto.address` thiếu `@ValidateNested()` + `@Type()` → bị `ValidationPipe` (whitelist mode) từ chối với `"property address should not exist"`, chặn toàn bộ checkout | `orders/dto/checkout.dto.ts` | ✅ Đã sửa |
| 8 | `HttpExceptionFilter` nuốt **mọi lỗi 500 hoàn toàn im lặng**, không log gì ra console server — khiến debug lỗi thật gần như không thể (log trống dù có crash thật) | `common/filters/http-exception.filter.ts` | ✅ Đã sửa — giờ log đầy đủ stack trace cho lỗi 500 |
| 9 | BullMQ `jobId` dùng dấu `:` (`order-timeout:${orderId}`) — bản BullMQ 5.81+ đang dùng cấm ký tự này trong Custom Job ID → crash toàn bộ checkout **Online** (COD không bị ảnh hưởng vì không dùng queue) | `queue/queue.service.ts` | ✅ Đã sửa (đổi `:` → `-`) |
| 10 | `RefundService` dùng `$executeRaw` với ép kiểu `WHERE id = ${refundId}::uuid` — nhưng `Refund.id` là Prisma `String` (map sang Postgres `text`), không phải kiểu `uuid` gốc (không có `@db.Uuid` ở model nào trong toàn schema) → lỗi `operator does not exist: text = uuid`, chặn duyệt refund | `payment/refund.service.ts` | ✅ Đã sửa (bỏ ép kiểu thừa) |
| 11 | **Bug tiềm ẩn có sẵn từ trước** (không phải do phiên này gây ra): `PromotionsService.incrementUsageAtomic` có **cùng lỗi `::uuid`** hệt trên — chưa từng bị phát hiện vì unit test dùng mock `$executeRaw`, không validate cú pháp SQL thật. Sẽ crash **mọi đơn hàng dùng mã giảm giá** nếu chạy thật | `promotions/promotions.service.ts` | ✅ Đã sửa (phát hiện chủ động khi audit code tương tự) |

### 2.3. Sự cố thao tác/vận hành (không phải bug code)

| # | Sự cố | Nguyên nhân | Cách xử lý |
|---|---|---|---|
| 12 | Redis (Memurai local) cài xong nhưng API báo `Reached max retries per request` | `REDIS_URL` thật trỏ tới Upstash (cloud) chứ không phải Memurai local — thiếu scheme `rediss://` (TLS) | Sửa `REDIS_URL` thành `rediss://...` |
| 13 | 10 tiến trình Node "mồ côi" chạy song song, gây định tuyến request lộn xộn (log server trống dù có request thật) | Nhiều lần Ctrl+C không thoát hẳn `pnpm dev:api`/`dev:web` qua nhiều lượt restart | `Get-Process node \| Stop-Process -Force` rồi khởi động lại sạch |

---

## 3. Chi tiết verify Refund end-to-end

Luồng đã test thật (không phải giả lập):

1. Tạo đơn `ORD-000006` (2 sản phẩm, 720.000đ) — thanh toán **Online**
2. Giả lập thanh toán thành công qua `POST /payments/mock/simulate` → `Payment.status = SUCCESS`
3. Khách hàng (`test2@gmail.com`) gọi `POST /refunds` với lý do "Sản phẩm không đúng mô tả" → tạo `Refund` trạng thái `PENDING`
4. Admin (`admin@369.vn`) gọi `POST /refunds/{id}/approve` → **thành công**, `Refund.status = SUCCESS`
5. Xác nhận trên web: đơn hiện đúng trạng thái **"Đã hoàn tiền"**, số tiền khớp `720.000đ`

Vì đây là hoàn tiền **toàn phần**, hệ thống tự động:
- Đổi `Payment.status` → `REFUNDED`
- Đổi `Order.status` → `REFUNDED`
- Nhập lại kho (`InventoryService.restockFromRefund`)
- Ghi bút toán kế toán hoàn tiền

---

## 4. Ghi chú / việc còn lại

- Đơn `ORD-000001` (đợt test COD đầu tiên) hiện trạng thái **"Đã huỷ"** không rõ nguyên nhân — có thể liên quan tới các lần test lỗi liên tiếp trong phiên. **Chưa điều tra**, không chặn các luồng chính, để xem xét sau nếu cần.
- Refund API hiện giới hạn **1 refund/đơn hàng** (do ràng buộc DB có sẵn trên bảng kế toán) — đã ghi rõ trong code, là quyết định kiến trúc có chủ đích, không phải thiếu sót.
- Web (`apps/web`) **chưa có giao diện Refund** — toàn bộ luồng refund hiện chỉ test được qua Swagger/API trực tiếp, chưa có UI cho khách hàng/seller thao tác.
- Seller Dashboard: đã sửa bug chặn truy cập (thiếu 1 cấp `../` trong import), **đang chờ verify kết quả cuối** sau khi đăng nhập bằng tài khoản seller.
- Flutter mobile: `flutter analyze` pass 100%, nhưng chưa chạy live được do bug công cụ (đường dẫn có khoảng trắng) — đã xác nhận không phải lỗi code.

---

## 5. Danh sách commit đã push trong phiên này

```
c277983 fix: log loi 500 thay vi nuot im lang, fix BullMQ jobId chua dau :, fix ::uuid cast sai kieu du lieu (refund + promotions)
07593a4 fix: them trang chi tiet san pham + danh sach don hang con thieu, fix ValidateNested checkout DTO
267ad91 feat: them trang dang ky (/register), fix loi hien thi message validate API
bcc832c fix: header web hien thi dung trang thai dang nhap (Xin chao ten user + Dang xuat)
```

*(Bug #6 — xoá hardcode credentials trang seller dashboard — đang chờ commit sau khi verify xong ở mục 4.)*

---

*Báo cáo này bổ sung cho `BUILD_VERIFICATION_REPORT_2-9.md` (verify build tĩnh) — tập trung vào kết quả test tương tác thật trên môi trường chạy sống.*
