# Audit log + Đối soát thanh toán — ghi chú triển khai

Bổ sung theo `369-platform-specification.md` (Mục 4.2, 5.1, 5.3, 5.6, 7.2). Audit tại thời điểm bắt đầu cho thấy **Redis lock chống oversell** (Mục 3.1/4.1) và **giới hạn hoa hồng 1 tầng** (Mục 4.3) đã được implement đầy đủ từ trước — không cần làm lại.

## 1. Audit log

`AuditLogInterceptor` đã tồn tại sẵn nhưng **chưa từng được gắn vào controller nào** — code chết. Đã gắn `@UseInterceptors(AuditLogInterceptor)` ở cấp controller cho:
- `OrdersController` (checkout, cancel, confirm-received, confirm/pack/ship của seller)
- `RefundController` (create, approve, reject)

Mỗi request POST/PATCH/PUT/DELETE tới 2 controller này giờ tự động ghi 1 dòng vào bảng `audit_logs` (ai, thao tác gì, entity nào, dữ liệu sau khi sửa).

## 2. Đối soát thanh toán

**Model mới:** `PaymentReconciliationLog` (`payment_reconciliation_logs`) — mỗi dòng là kết quả so khớp 1 giao dịch cho 1 ngày, trạng thái `MATCHED | MISMATCH_AMOUNT | MISSING_IN_GATEWAY | MISSING_IN_SYSTEM`.

**Luồng:**
1. `PaymentGatewayAdapter` interface có thêm `fetchDailyTransactions(date)` — mỗi gateway (Mock hiện tại, VNPay/Momo sau này) tự implement cách lấy báo cáo giao dịch phía họ.
2. `ReconciliationService.runDailyReconciliation(date)` — so khớp `payment_transactions` (hệ thống) với kết quả `fetchDailyTransactions()` (gateway), ghi log cho từng giao dịch.
3. `ReconciliationCron` chạy **00:00 hàng ngày**, đối soát ngày hôm qua.
4. `GET /admin/reconciliation/daily?date=YYYY-MM-DD&run=true` — Admin xem log; `run=true` để chạy ngay không cần đợi cron (tiện test).

**Quyết định thiết kế quan trọng — lệch có chủ đích so với spec Mục 4.2:**
Spec viết "chỉ ghi kế toán sau khi đối soát khớp", nhưng Mục 3.6.1 (đã chạy ổn định) ghi kế toán **real-time ngay khi `order.paid`** — hai nguyên tắc mâu thuẫn nhau trong spec gốc. Đã **giữ nguyên hành vi ghi real-time**, đối soát đóng vai trò **lớp phát hiện/cảnh báo độc lập** (đúng giá trị cốt lõi: bắt giao dịch treo/thất thoát), không chặn sổ sách. Nếu cần đúng 100% theo 4.2, phải sửa cả luồng accounting hiện có — rủi ro cao hơn, chưa làm.

**Giới hạn của Mock gateway:** vì Mock không có sổ giao dịch độc lập thật (nó chính là nơi hệ thống tự ghi nhận), `fetchDailyTransactions()` của Mock chỉ echo lại dữ liệu hệ thống đã có → đối soát với Mock **luôn khớp 100%**, không phát hiện được lỗi thật. Giá trị thật của tính năng này chỉ phát huy khi tích hợp gateway thật (VNPay/Momo) — việc đó đã được quyết định để lại giai đoạn sau.

## 3. Việc cần làm trên máy thật

```powershell
cd "D:\HTX 369\ShopGo\369-platform\apps\api"
pnpm prisma:generate
pnpm prisma db push
```

Sau đó test thử:
```
GET /admin/reconciliation/daily?run=true
```
(cần token Admin) — kỳ vọng trả về `summary.matched` = số giao dịch thành công trong ngày, các mục còn lại = 0 (vì Mock luôn khớp như đã nêu).
