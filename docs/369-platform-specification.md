# 369 PLATFORM — TÀI LIỆU PHÂN TÍCH & KIẾN TRÚC HOÀN CHỈNH
### "Shopee mini của Hệ sinh thái HTX 369" — Bản chuẩn hóa để triển khai thực tế

**Phiên bản:** 1.0 — Production Specification
**Loại tài liệu:** System Analysis + Architecture + Implementation Blueprint
**Trạng thái:** Sẵn sàng triển khai (Ready for Build)

---

## MỤC LỤC

1. Phân tích (Research & Analysis)
2. Kế hoạch (Chiến lược & phạm vi)
3. Kiến trúc hệ thống (Architecture)
4. Workflow nghiệp vụ (Business Workflow)
5. Cấu trúc dữ liệu & source code (Structure)
6. Triển khai (Implementation Plan theo Phase)
7. Tối ưu (Optimization, Security, Performance)
8. Rủi ro & Phương án xử lý
9. Tài liệu hoá & Vận hành (Documentation & Ops)

---

# 1. PHÂN TÍCH (RESEARCH & ANALYSIS)

## 1.1 Đánh giá bản thảo gốc

Bản thảo gốc anh/chị cung cấp đã đúng hướng ở tầm nhìn (marketplace + hệ sinh thái thành viên), nhưng ở góc độ **khả thi kỹ thuật và khả thi triển khai thực tế**, có 6 điểm cần chỉnh sửa trước khi bắt tay code:

| # | Vấn đề trong bản thảo gốc | Rủi ro nếu giữ nguyên | Điều chỉnh trong bản hoàn chỉnh |
|---|---|---|---|
| 1 | Thiết kế "5 phân hệ lớn" nhưng không phân biệt **modular monolith** vs **microservices** | Dễ rơi vào over-engineering ngay từ đầu, đội 1-3 người không maintain nổi microservices | Chốt kiến trúc **Modular Monolith** (1 backend, chia module rõ ràng theo domain), tách service khi có traffic thật |
| 2 | 40+ bảng DB được liệt kê phẳng, không có ERD quan hệ, không có version/soft-delete/audit | Migration hỗn loạn, không truy vết được thay đổi dữ liệu tài chính | Bổ sung **chuẩn thiết kế bảng** (id, timestamps, soft delete, audit log) + ERD quan hệ theo nhóm |
| 3 | Không có cơ chế **tồn kho đồng thời (concurrency)** khi nhiều khách đặt cùng 1 sản phẩm | Oversell, sai lệch tồn kho khi traffic tăng | Bổ sung cơ chế **giữ kho tạm thời (reserve stock) + Redis lock** |
| 4 | Không có chiến lược **đối soát thanh toán** giữa Payment Gateway ↔ Order ↔ Kế toán | Sai lệch dòng tiền, khó audit, rủi ro pháp lý về thuế | Bổ sung **Payment Reconciliation Flow** riêng |
| 5 | Mô hình hoa hồng đa cấp (referral/commission) chưa định nghĩa **giới hạn tầng** | Rủi ro pháp lý — dễ bị hiểu nhầm là mô hình đa cấp (MLM) nếu không giới hạn | Giới hạn tối đa **1-2 tầng giới thiệu**, minh bạch % công khai, tuân thủ Nghị định về bán hàng đa cấp |
| 6 | Roadmap 6 phase không có timeline, không có ước lượng nhân sự | Không dùng để lập ngân sách / gọi vốn / thuyết trình HTX được | Bổ sung timeline theo tuần + nhân sự tối thiểu mỗi phase |

## 1.2 Phân tích stakeholder (các bên liên quan)

```text
┌─────────────────────────────────────────────────────────────────┐
│                        CÁC BÊN LIÊN QUAN                        │
├─────────────────┬─────────────────────┬─────────────────────────┤
│  Vai trò         │  Nhu cầu cốt lõi     │  Yếu tố quyết định dùng │
├─────────────────┼─────────────────────┼─────────────────────────┤
│ Khách mua hàng   │ Mua nhanh, tin cậy   │ Tốc độ load, giá, ship  │
│ Người bán/Seller │ Bán được, dễ quản lý │ Dashboard đơn giản, rõ  │
│                  │ kho & đơn            │ tiền về tài khoản       │
│ Thành viên 369   │ Có thu nhập đa nguồn │ Hoa hồng minh bạch,     │
│ (member)         │ (bán+giới thiệu+học) │ đúng hạn, dễ hiểu       │
│ HTX 369 (chủ QL) │ Kiểm soát toàn hệ    │ Dashboard tổng, đối     │
│                  │ thống, thu phí nền   │ soát tài chính chính xác│
│                  │ tảng                 │                         │
│ Kế toán HTX      │ Sổ sách minh bạch,   │ Liên kết trực tiếp module│
│                  │ đúng chuẩn thuế hộ KD│ kế toán, không nhập tay │
└─────────────────┴─────────────────────┴─────────────────────────┘
```

## 1.3 So sánh mô hình tham chiếu

| Tiêu chí | Shopee/Lazada (marketplace thuần) | 369 Platform (đề xuất) |
|---|---|---|
| Đối tượng bán | Bất kỳ ai đăng ký seller | Thành viên đã xác thực hộ KD trong HTX |
| Nguồn thu | Phí sàn, quảng cáo, logistics | Phí sàn + hoa hồng giới thiệu + đào tạo + dịch vụ kế toán |
| Vai trò người dùng | Buyer / Seller tách biệt | 1 tài khoản = Buyer + Seller + Referrer + Learner (đa vai trò) |
| Kế toán | Không tích hợp cho seller | **Tích hợp trực tiếp** — điểm khác biệt cốt lõi |
| Quy mô ban đầu | Hàng triệu seller | Vài trăm → vài nghìn hộ KD trong hệ sinh thái |
| → Kết luận kiến trúc | Cần microservices, đa vùng | **Modular Monolith đủ dùng 2-3 năm đầu**, chi phí hạ tầng thấp hơn 5-10 lần |

## 1.4 Kết luận phân tích

- **Đúng hướng:** mô hình đa vai trò (member = buyer + seller + referrer + learner) là lợi thế cạnh tranh thật sự, cần đưa vào ngay từ schema DB (đã có trong bản gốc — giữ nguyên định hướng này).
- **Cần sửa:** kiến trúc kỹ thuật (monolith thay vì tách nhỏ quá sớm), cơ chế tồn kho, đối soát thanh toán, giới hạn hoa hồng theo pháp lý.
- **Quyết định công nghệ:** giữ Next.js (frontend) nhưng khuyến nghị đổi **FastAPI → NestJS (Node.js/TypeScript)** để đồng bộ ngôn ngữ toàn bộ stack với tech stack anh/chị đang dùng (React/Next.js/Node.js/NestJS theo preferences), giảm chi phí chuyển ngữ cảnh giữa frontend/backend, dùng chung type (TypeScript end-to-end). *(Nếu team đã có sẵn nhân sự Python mạnh hơn, FastAPI vẫn là lựa chọn hợp lệ — xem mục 3.5 để so sánh 2 phương án.)*

---

# 2. KẾ HOẠCH (CHIẾN LƯỢC & PHẠM VI)

## 2.1 Mục tiêu sản phẩm (Product Goals)

```text
MỤC TIÊU NĂM 1
│
├── 🎯 500 - 2,000 hộ kinh doanh thành viên 369 hoạt động
├── 🎯 Xử lý được 1,000 - 5,000 đơn hàng/tháng ổn định
├── 🎯 Module kế toán tự động hoá ≥ 80% nghiệp vụ thu-chi cơ bản
├── 🎯 Thời gian tải trang chủ < 2.5s (LCP) trên mobile 4G
└── 🎯 Đối soát thanh toán sai lệch < 0.1%
```

## 2.2 Phạm vi MVP (bắt buộc để ra mắt) vs Giai đoạn sau

| Nhóm chức năng | MVP (Phase 1-2, bắt buộc) | Sau MVP (Phase 3-6) |
|---|---|---|
| Mua hàng | Xem SP, giỏ hàng, checkout, thanh toán, theo dõi đơn | Flash sale, đánh giá nâng cao, live shopping |
| Bán hàng | Đăng SP, quản lý kho cơ bản, xử lý đơn | Báo cáo nâng cao, khuyến mãi phức tạp |
| Thành viên | Hồ sơ, mã giới thiệu, điểm cơ bản | Cấp độ, khóa học, cộng đồng |
| Kế toán | Ghi nhận thu/chi tự động từ đơn hàng | Báo cáo thuế, xuất hoá đơn điện tử |
| Admin | Duyệt seller, quản lý SP/đơn, cấu hình cơ bản | Đối soát nâng cao, BI dashboard |
| Mobile | PWA responsive | App Flutter native |

## 2.3 Timeline tổng quan (ước tính đội 3-5 người)

```text
Tháng 1-2   ████████████░░░░░░░░░░░░░░░░░░░░░░░░  Phase 1: Nền tảng
Tháng 2-3   ░░░░████████████░░░░░░░░░░░░░░░░░░░░  Phase 2: Bán hàng
Tháng 3-4   ░░░░░░░░████████████░░░░░░░░░░░░░░░░  Phase 3: Seller Center
Tháng 4-5   ░░░░░░░░░░░░████████████░░░░░░░░░░░░  Phase 4: Kế toán
Tháng 5-6   ░░░░░░░░░░░░░░░░████████████░░░░░░░░  Phase 5: Hệ sinh thái 369
Tháng 7+    ░░░░░░░░░░░░░░░░░░░░░░░░████████████  Phase 6: Mobile App
```
*(Chi tiết nhân sự & deliverable từng phase → xem Mục 6)*

---

# 3. KIẾN TRÚC HỆ THỐNG (ARCHITECTURE)

## 3.1 Kiến trúc tổng thể (đã tối ưu hoá)

```text
                              ┌───────────────────────────┐
                              │     HỆ SINH THÁI 369      │
                              └─────────────┬─────────────┘
                                            │
          ┌─────────────────────┬──────────┴──────────┬─────────────────────┐
          │                     │                      │                    │
     KHÁCH HÀNG            NGƯỜI BÁN               THÀNH VIÊN            ADMIN 369
     (Buyer role)          (Seller role)          (Member/Referrer)     (Admin role)
          │                     │                      │                    │
          └─────────────────────┴──────────┬───────────┴────────────────────┘
                                            │  1 tài khoản = nhiều vai trò (RBAC)
                                   ┌────────▼────────┐
                                   │   NEXT.JS 14+   │  ← Web App (SSR/PWA)
                                   │ React+Tailwind  │
                                   │  shadcn/ui      │
                                   └────────┬────────┘
                                            │ REST/GraphQL API (HTTPS + JWT)
                                   ┌────────▼────────┐
                                   │  BACKEND API    │  ← Modular Monolith
                                   │ NestJS/FastAPI  │     (chia theo domain module)
                                   └────────┬────────┘
                                            │
      ┌───────────────┬──────────────┬─────┼──────┬───────────────┬────────────────┐
      │               │              │            │               │                │
      ▼               ▼              ▼            ▼               ▼                ▼
 PostgreSQL         Redis      Object Storage   Payment      Notification    Queue Worker
 (nguồn sự thật)   (cache +   (S3/R2: ảnh,    Gateway     (Email/SMS/Zalo   (BullMQ/Celery:
                    session +   video SP)      (VNPay/     OA/Push)          gửi mail, tính
                    lock kho)                   Momo/ZaloPay)                hoa hồng, đối soát)
```

**Nguyên tắc kiến trúc:**
1. **Modular Monolith trước, Microservices sau** — 1 codebase backend, chia rõ theo `modules/` (auth, product, order...), mỗi module độc lập về logic nhưng dùng chung DB transaction khi cần (đảm bảo tính toàn vẹn đơn hàng ↔ kho ↔ kế toán).
2. **1 nguồn sự thật (Single Source of Truth):** PostgreSQL là nơi duy nhất lưu dữ liệu giao dịch — Redis chỉ cache/lock, không lưu dữ liệu vĩnh viễn.
3. **Queue-based cho tác vụ nặng:** tính hoa hồng, gửi thông báo hàng loạt, đối soát thanh toán → chạy nền qua queue, không chặn luồng chính.
4. **API-first:** để tái sử dụng ngay khi làm Flutter app ở Phase 6 mà không sửa backend.

## 3.2 Kiến trúc 5 phân hệ (giữ định hướng gốc, chuẩn hoá lại)

```text
369 ECOSYSTEM
│
├── A. 369 SHOP          (Storefront — public, SEO-first, SSR)
├── B. 369 SELLER        (Seller Center — dashboard riêng, auth role=seller)
├── C. 369 MEMBER        (Trang thành viên — điểm, giới thiệu, khóa học)
├── D. 369 ACCOUNTING    (Kế toán — tự động từ order/payment, không nhập tay)
└── E. 369 ADMIN         (Quản trị toàn hệ thống — role=admin/super_admin)
```

> **Lưu ý kiến trúc quan trọng:** C (Member) không phải trang riêng biệt về mặt kỹ thuật — nó là **một layer vai trò** phủ trên mọi tài khoản. Một `user` có thể vừa có `store` (bán), vừa có `referral_code` (giới thiệu), vừa mua hàng ở Shop — cùng 1 `user_id`. Đây là điểm khác biệt cốt lõi so với Shopee cần được model đúng trong DB (xem Mục 5).

## 3.3 Component Map (Frontend)

```text
frontend/app/
│
├── (shop)/                    ← Route group: Storefront công khai
│   ├── page.tsx                   Trang chủ
│   ├── category/[slug]/           Danh mục
│   ├── product/[slug]/            Chi tiết sản phẩm
│   ├── store/[slug]/              Trang gian hàng
│   ├── cart/                      Giỏ hàng
│   ├── checkout/                  Thanh toán
│   └── orders/[id]/               Theo dõi đơn
│
├── (seller)/seller/           ← Route group: Seller Center (auth required)
│   ├── dashboard/
│   ├── products/
│   ├── orders/
│   ├── inventory/
│   └── finance/
│
├── (member)/member/           ← Route group: Trang thành viên
│   ├── profile/
│   ├── referral/
│   ├── points/
│   └── learning/
│
├── (admin)/admin/             ← Route group: Admin Portal
│   ├── dashboard/
│   ├── members/
│   ├── products/
│   ├── orders/
│   ├── accounting/
│   └── settings/
│
└── (auth)/                    ← login/register/verify
```

## 3.4 Data Flow tổng quát (1 đơn hàng đi qua hệ thống)

```text
[Khách bấm "Đặt hàng"]
        │
        ▼
 API Gateway (NestJS) ── xác thực JWT + kiểm tra role
        │
        ▼
 Order Service ── mở DB Transaction
        │
        ├──► 1. Redis: LOCK sản phẩm (tránh oversell)
        ├──► 2. Inventory Service: kiểm tra & TRỪ/GIỮ kho
        ├──► 3. Order Service: tạo bản ghi `orders` + `order_items`
        ├──► 4. Payment Service: khởi tạo giao dịch (redirect Payment Gateway)
        │
        ▼ (khi Payment Gateway callback thành công — qua Webhook)
 Payment Webhook Handler
        │
        ├──► 5. Cập nhật `orders.status = paid`
        ├──► 6. Queue: "order.paid" event
        │           │
        │           ├──► Accounting Worker → ghi `income_transactions` + `accounting_entries`
        │           ├──► Commission Worker → tính `commission_transactions` cho người giới thiệu
        │           ├──► Notification Worker → gửi email/SMS/Zalo xác nhận
        │           └──► Inventory Worker → chốt trừ kho vĩnh viễn (release lock)
        │
        ▼
 Seller nhận thông báo đơn mới → xử lý đóng gói → cập nhật `shipping_tracking`
        │
        ▼
 Khách nhận hàng → xác nhận → `orders.status = completed`
        │
        └──► Trigger: Đánh giá SP + Ghi nhận điểm tích lũy `member_points`
```

**Đây là điểm kỹ thuật quan trọng nhất của toàn hệ thống** — bản gốc mới liệt kê các bảng nhưng chưa mô tả **event nào trigger bảng nào**. Toàn bộ automation hoá kế toán/hoa hồng phụ thuộc vào event `order.paid` này chạy đúng và **idempotent** (chạy lại không bị nhân đôi dữ liệu — bắt buộc dùng `event_id` unique khi xử lý webhook).

## 3.5 So sánh Backend: NestJS vs FastAPI (để anh/chị quyết định)

| Tiêu chí | NestJS (Node/TS) | FastAPI (Python) |
|---|---|---|
| Đồng bộ ngôn ngữ với Frontend (Next.js) | ✅ Cùng TypeScript, share types | ❌ Khác ngôn ngữ |
| Hệ sinh thái ORM | TypeORM / Prisma (mạnh, type-safe) | SQLAlchemy (mạnh, mature) |
| Tốc độ xử lý số liệu/báo cáo kế toán nặng | Khá | Tốt hơn (nếu dùng pandas cho báo cáo phức tạp) |
| Tốc độ tuyển dụng dev tại VN | Dev JS/TS phổ biến, dễ tuyển | Dev Python cho backend ít hơn dev JS |
| Tích hợp AI/automation sau này (theo hướng AI Builder) | Tốt, gọi API AI dễ dàng | Tốt nhất nếu cần chạy AI model cục bộ |
| **Khuyến nghị** | **✅ Chọn NestJS** nếu ưu tiên tốc độ dev + đồng bộ team full-stack JS | Chọn FastAPI nếu team đã mạnh Python hoặc cần xử lý data/AI nặng ở backend |

→ **Quyết định cuối cùng (đã chốt với anh/chị): Kiến trúc Hybrid — NestJS core + 1 Python service riêng cho Kế toán/Báo cáo.** Chi tiết thiết kế ở Mục 3.6.

## 3.6 Kiến trúc Hybrid: NestJS Core + Python Accounting & Reporting Service

### 3.6.1 Nguyên tắc phân chia trách nhiệm

Điểm mấu chốt: **không để 2 service cùng ghi (write) vào cùng một bảng tài chính** — tránh split-brain, mất tính toàn vẹn dữ liệu kế toán. Vì vậy ranh giới được chia theo **loại xử lý**, không chia theo domain:

```text
┌─────────────────────────────────┬─────────────────────────────────────┐
│  NestJS CORE (ghi transactional) │  PYTHON SERVICE (đọc + tính toán nặng)│
├─────────────────────────────────┼─────────────────────────────────────┤
│ ✅ Ghi income_transactions,      │ ✅ Tính P&L, dự báo doanh thu (forecast)│
│    expense_transactions,         │ ✅ Phân tích xu hướng bán hàng          │
│    accounting_entries NGAY khi   │ ✅ Đề xuất số liệu kê khai thuế hộ KD   │
│    order.paid xảy ra (đảm bảo    │ ✅ Xuất báo cáo Excel/PDF (dùng openpyxl,│
│    đúng transaction, real-time)  │    pandas — Python mạnh hơn Node ở đây) │
│ ✅ API CRUD cơ bản: xem sổ thu-chi│ ✅ Chạy job định kỳ (Celery Beat):       │
│    theo ngày/tháng (query đơn giản)│    tổng hợp báo cáo tháng, đối chiếu   │
│ ✅ Vẫn là "nguồn sự thật" (source │    số liệu lớn                          │
│    of truth) cho mọi bút toán    │ ❌ KHÔNG được ghi trực tiếp vào bảng    │
│                                   │    accounting_entries gốc               │
└─────────────────────────────────┴─────────────────────────────────────┘
```

### 3.6.2 Sơ đồ kiến trúc chi tiết

```text
                       NestJS Core API
                             │
              order.paid → ghi transactional NGAY
              vào accounting_entries/income/expense
              (trong cùng DB transaction với order)
                             │
                             ▼
                    PostgreSQL (PRIMARY)
                             │
                   (Streaming Replication —
                    không query báo cáo nặng
                    trực tiếp trên Primary)
                             ▼
                  PostgreSQL READ REPLICA
                             │
                             ▼
            ┌────────────────────────────────────┐
            │   PYTHON ACCOUNTING SERVICE          │
            │   FastAPI + Celery + Celery Beat     │
            │   + pandas / numpy                   │
            ├────────────────────────────────────┤
            │ 1. Đọc dữ liệu từ Read Replica        │
            │    (KHÔNG bao giờ đọc/ghi Primary     │
            │    trực tiếp cho query nặng)          │
            │ 2. Tổng hợp, tính toán, dự báo        │
            │ 3. Xuất file Excel/PDF báo cáo         │
            │ 4. Ghi KẾT QUẢ (đã tính xong) vào      │
            │    bảng riêng do Python sở hữu:        │
            │    accounting_reports,                 │
            │    revenue_forecasts,                  │
            │    tax_estimation_snapshots            │
            └───────────────┬────────────────────┘
                             │ ghi qua kết nối DB riêng,
                             │ chỉ có quyền INSERT/UPDATE
                             │ trên 3 bảng report ở trên
                             ▼
                    PostgreSQL (PRIMARY)
                             │
                             ▼
         NestJS expose GET /api/v1/accounting/reports/*
         (đọc từ accounting_reports — FE gọi qua NestJS,
          KHÔNG gọi thẳng Python service từ frontend)
```

### 3.6.3 Giao tiếp giữa 2 service

| Kịch bản | Cơ chế | Lý do chọn |
|---|---|---|
| NestJS yêu cầu Python "tính báo cáo tháng X ngay" (on-demand) | REST API nội bộ: `POST /internal/reports/generate` (Python expose) | Đơn giản, đồng bộ, cần kết quả nhanh để hiển thị loading → done |
| Job định kỳ (VD: 00:00 mỗi ngày tổng hợp báo cáo hôm qua) | **Celery Beat** (Python tự chạy theo lịch, không cần NestJS gọi) | Tách rời hoàn toàn, NestJS không cần biết lịch chạy |
| Event thời gian thực cần Python biết ngay (VD: có đơn hoàn tiền lớn cần tính lại forecast) | **Message Queue trung lập** (Redis Streams hoặc RabbitMQ — không dùng BullMQ vì đó là thư viện riêng của Node) | Redis Streams có client tốt cho cả Node lẫn Python, nhẹ, không cần thêm hạ tầng nếu đã dùng Redis |
| Bảo mật giao tiếp nội bộ | Internal API Key hoặc mTLS giữa 2 service, **không** expose Python service ra internet công khai | Tránh bị gọi trực tiếp bỏ qua NestJS (mất kiểm soát auth/RBAC) |

### 3.6.4 Cấu trúc thư mục cập nhật (Monorepo)

```text
369-platform/
│
├── apps/
│   ├── web/                          # Next.js (không đổi)
│   ├── api/                          # NestJS Core (không đổi — xem Mục 5.5)
│   │
│   └── accounting-service/           # ★ MỚI — Python FastAPI
│       ├── app/
│       │   ├── main.py
│       │   ├── api/
│       │   │   └── internal/         # endpoint nội bộ, có API key guard
│       │   │       ├── reports.py
│       │   │       └── forecast.py
│       │   ├── tasks/                # Celery tasks
│       │   │   ├── daily_report.py
│       │   │   ├── monthly_pnl.py
│       │   │   └── tax_estimation.py
│       │   ├── services/
│       │   │   ├── pnl_calculator.py
│       │   │   ├── forecast_engine.py     # pandas/statsmodels
│       │   │   └── excel_exporter.py      # openpyxl
│       │   ├── db/
│       │   │   ├── read_replica.py        # kết nối read-only
│       │   │   └── report_writer.py       # kết nối write-limited (chỉ 3 bảng)
│       │   └── core/
│       │       └── config.py
│       ├── celery_app.py
│       └── requirements.txt
│
├── infra/
│   ├── docker-compose.yml            # thêm service: accounting-service, celery-worker, celery-beat
│   └── ...
```

### 3.6.5 Bảng dữ liệu do Python sở hữu (bổ sung vào Mục 5.3)

```text
📦 module: accounting-analytics (owned by Python service — write access riêng)
   accounting_reports        (báo cáo P&L đã tổng hợp theo kỳ)
   revenue_forecasts         (dự báo doanh thu — kết quả model)
   tax_estimation_snapshots  (số liệu đề xuất kê khai thuế theo kỳ)
   report_export_files       (metadata file Excel/PDF đã xuất, link tới Object Storage)
```

### 3.6.6 Vì sao thiết kế này an toàn hơn để 2 service cùng ghi 1 bảng

- **Toàn vẹn giao dịch (transactional integrity):** bút toán gốc (`order.paid` → ghi nợ/có) bắt buộc nằm trong cùng DB transaction với việc trừ kho/tạo đơn ở NestJS — nếu tách sang Python qua async event, có rủi ro **race condition** (đơn đã trừ kho nhưng kế toán chưa kịp ghi nếu Python service down). Do đó bút toán gốc **vẫn ở NestJS**.
- **Read Replica tách tải:** báo cáo/dự báo là truy vấn nặng (quét hàng chục nghìn dòng, group by, tính trung bình trượt...) — nếu chạy trên Primary sẽ ảnh hưởng tốc độ checkout của khách đang mua hàng real-time. Tách sang Read Replica giải quyết triệt để.
- **Phạm vi ghi giới hạn:** Python chỉ có quyền ghi 3-4 bảng "kết quả tính toán", không đụng vào bảng nguồn — nếu Python service lỗi/crash, dữ liệu tài chính gốc vẫn an toàn 100%, chỉ báo cáo bị chậm cập nhật (chấp nhận được).

---

# 4. WORKFLOW NGHIỆP VỤ (BUSINESS WORKFLOW)

## 4.1 Luồng mua hàng (chi tiết hoá, có xử lý lỗi)

```text
KHÁCH
  │
  ▼
XEM SẢN PHẨM ──► kiểm tra tồn kho hiển thị (cache Redis, TTL 30s)
  │
  ▼
THÊM GIỎ HÀNG ──► lưu `cart_items` (guest: localStorage → merge khi login)
  │
  ▼
CHECKOUT
  │
  ├─ Chưa đăng nhập? → yêu cầu đăng nhập/đăng ký nhanh (OTP SMS/Zalo)
  │
  ▼
CHỌN ĐỊA CHỈ ──► lấy từ `user_addresses` hoặc nhập mới
  │
  ▼
CHỌN VẬN CHUYỂN ──► gọi API đối tác GHN/GHTK/Viettel Post tính phí real-time
  │
  ▼
CHỌN THANH TOÁN ──► COD | Chuyển khoản | VNPay/Momo/ZaloPay | Ví 369
  │
  ▼
XÁC NHẬN ĐƠN
  │
  ├─ LOCK kho (Redis, TTL 15 phút) ──► nếu hết hàng: báo lỗi ngay, không tạo đơn
  ├─ Tạo `orders` (status=pending_payment hoặc pending_confirm nếu COD)
  ├─ Tạo `order_items`, `order_addresses`
  │
  ▼
[Nếu online payment] Redirect Payment Gateway
  │
  ├─ Thành công → Webhook → status=paid → trigger event chuỗi (Mục 3.4)
  ├─ Thất bại → status=payment_failed → release lock kho → khách thử lại
  └─ Timeout 15 phút không thanh toán → job tự động huỷ đơn + release kho
  │
  ▼
NGƯỜI BÁN nhận thông báo → xác nhận xử lý → đóng gói → bàn giao vận chuyển
  │
  ▼
CẬP NHẬT TRACKING (webhook từ đối tác vận chuyển hoặc seller cập nhật tay)
  │
  ▼
GIAO HÀNG THÀNH CÔNG
  │
  ├─ COD: seller xác nhận đã thu tiền → đối soát COD định kỳ
  ├─ Online: đã thu từ bước thanh toán
  │
  ▼
KHÁCH XÁC NHẬN ĐÃ NHẬN (hoặc tự động sau 3 ngày không phản hồi)
  │
  ▼
HOÀN TẤT ──► mở đánh giá SP, cộng điểm tích lũy, tính hoa hồng giới thiệu (nếu có)
```

## 4.2 Luồng đối soát thanh toán (bổ sung mới — quan trọng)

```text
MỖI NGÀY (Cron 00:00)
  │
  ▼
Lấy danh sách `payment_transactions` trong ngày từ hệ thống
  │
  ▼
So khớp với báo cáo giao dịch từ Payment Gateway (API đối soát VNPay/Momo)
  │
  ├─ Khớp 100% → đánh dấu `reconciled = true`
  ├─ Có trong hệ thống, không có ở Gateway → cảnh báo Admin (giao dịch treo)
  └─ Có ở Gateway, không có trong hệ thống → cảnh báo (thất thoát doanh thu)
  │
  ▼
Ghi vào `accounting_entries` sau khi đối soát khớp — KHÔNG ghi kế toán trước khi đối soát
```
> Nguyên tắc: **kế toán chỉ ghi nhận số liệu đã đối soát**, tránh sai lệch sổ sách nếu payment gateway báo lỗi.

## 4.3 Luồng tính hoa hồng giới thiệu (đã giới hạn theo pháp lý)

```text
Đơn hàng thanh toán thành công (order.paid)
  │
  ▼
Xác định `referrer_id` từ `member_referrals` của Seller/Buyer
  │
  ▼
Áp dụng `commission_rules` (VD: 5% cho người giới thiệu trực tiếp — TẦNG 1 DUY NHẤT)
  │
  ├─ Tầng 1 (người giới thiệu trực tiếp): X% hoa hồng
  └─ KHÔNG tính hoa hồng cho tầng 2 trở lên
       → tuân thủ quy định pháp luật VN về bán hàng đa cấp
         (Nghị định 40/2018/NĐ-CP và sửa đổi) — nền tảng TMĐT
         có cơ chế giới thiệu nhưng KHÔNG được cấu trúc như
         mô hình kinh doanh đa cấp nhiều tầng.
  │
  ▼
Ghi `commission_transactions` (status=pending) ──► giữ 7-14 ngày (chờ khách xác nhận
  │                                                  nhận hàng, tránh hoàn hàng/huỷ đơn)
  ▼
Sau thời gian giữ, nếu đơn không bị huỷ/hoàn:
  status = approved ──► gộp vào `commission_payouts` (chi trả định kỳ, VD: 2 lần/tháng)
```

## 4.4 Luồng kế toán tự động (điểm khác biệt cốt lõi so với Shopee)

```text
SỰ KIỆN                              →   GHI NHẬN KẾ TOÁN TỰ ĐỘNG
─────────────────────────────────────────────────────────────────────
order.paid (khách thanh toán)        →   income_transactions (+doanh thu)
                                          accounting_entries (Nợ: Tiền/Phải thu
                                                               Có: Doanh thu bán hàng)
platform_fee tính trên đơn           →   expense_transactions (seller: -phí sàn)
commission_transactions.approved     →   expense_transactions (-chi phí hoa hồng)
order.refunded (hoàn hàng)           →   accounting_entries đảo bút toán tương ứng
payment_transactions (chi phí ship)  →   expense_transactions (-chi phí vận chuyển)
─────────────────────────────────────────────────────────────────────
                                          ↓
                              Mỗi seller có "Sổ kế toán hộ kinh doanh"
                              tự động tổng hợp theo tháng/quý, xuất báo
                              cáo Thu-Chi-Lợi nhuận mà KHÔNG cần nhập tay.
```

---

# 5. CẤU TRÚC DỮ LIỆU & SOURCE CODE

## 5.1 Chuẩn thiết kế bảng (áp dụng cho TẤT CẢ bảng trong hệ thống)

```sql
-- Mọi bảng transaction bắt buộc có các cột chuẩn sau:
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
deleted_at      TIMESTAMPTZ NULL              -- soft delete, KHÔNG xoá cứng dữ liệu tài chính
created_by      UUID NULL REFERENCES users(id)
```
Ngoài ra, mọi thay đổi trên bảng nhạy cảm (`orders`, `payments`, `accounting_entries`, `commission_transactions`) đều ghi vào bảng `audit_logs` (ai sửa, sửa gì, khi nào) — bắt buộc cho việc đối soát và tuân thủ pháp lý.

## 5.2 ERD theo nhóm (quan hệ chi tiết hoá từ bản gốc)

```text
┌──────────────┐        ┌───────────────┐        ┌──────────────┐
│    users     │1──────*│    members    │1──────*│member_referrals
│ (auth core)  │        │ (hồ sơ 369)   │        │ (giới thiệu)  │
└──────┬───────┘        └───────┬───────┘        └──────────────┘
       │1                       │1
       │*                       │*
┌──────▼───────┐        ┌───────▼───────┐
│user_addresses│        │  businesses   │◄──── xác thực hộ KD (KYC)
└──────────────┘        │ (hộ kinh doanh)│
                         └───────┬───────┘
                                 │1
                                 │*
                         ┌───────▼───────┐
                         │    stores     │
                         │  (gian hàng)  │
                         └───────┬───────┘
                                 │1
                        ┌────────┼────────┐
                        │*                │*
                ┌───────▼──────┐  ┌───────▼────────┐
                │   products    │  │ store_settings │
                └───────┬───────┘  └────────────────┘
                        │1
              ┌─────────┼─────────┐
              │*                  │*
      ┌───────▼──────┐   ┌────────▼─────────┐
      │product_variants│  │ product_inventory│◄── giữ kho realtime + Redis lock
      └───────┬────────┘  └──────────────────┘
              │*
      ┌───────▼──────┐
      │  order_items  │───────────┐
      └───────┬───────┘           │*
              │*                  │
      ┌───────▼───────┐   ┌───────▼────────┐
      │    orders     │───►│ order_payments │──► payment_transactions
      └───────┬───────┘   └────────────────┘
              │1                                 │
      ┌───────▼────────┐                         │
      │order_status_    │                         ▼
      │history          │                 ┌───────────────┐
      └────────────────┘                 │ accounting_    │
                                          │ entries        │◄── nguồn sự thật kế toán
      orders.paid event ──────────────────┴───────┬────────┘
              │                                    │
      ┌───────▼────────────┐            ┌──────────▼─────────┐
      │commission_          │            │ income/expense_    │
      │transactions          │            │ transactions        │
      └──────────────────────┘            └────────────────────┘
```

## 5.3 Danh sách bảng đầy đủ (chuẩn hoá theo domain module — khớp với backend NestJS module)

```text
📦 module: identity
   users, roles, permissions, user_roles, user_addresses, user_sessions, audit_logs

📦 module: members
   members, member_profiles, member_documents, member_referrals,
   member_points, member_levels, member_learning_progress

📦 module: businesses
   businesses, business_categories, business_documents,
   business_bank_accounts, business_tax_profiles

📦 module: stores
   stores, store_members, store_settings, store_categories, store_followers

📦 module: catalog (products)
   products, product_variants, product_images, product_categories,
   product_attributes, product_attribute_values, product_prices

📦 module: inventory
   product_inventory, inventory_reservations (kho GIỮ tạm), inventory_movements (log xuất/nhập)

📦 module: cart-order
   carts, cart_items, orders, order_items, order_status_history, order_addresses

📦 module: shipping
   shipping_methods, shipping_orders, shipping_tracking, shipping_rate_cache

📦 module: payment
   payments, order_payments, payment_transactions, refunds,
   wallets, wallet_transactions, payment_reconciliation_logs ★ mới

📦 module: commission
   commission_rules, commission_transactions, commission_payouts, referrals

📦 module: accounting
   accounting_accounts, accounting_entries, accounting_entry_lines,
   income_transactions, expense_transactions, receivables, payables

📦 module: notification
   notification_templates, notification_logs, notification_preferences

📦 module: review
   product_reviews, review_images, review_replies

📦 module: cms
   banners, promotions, promotion_conditions, learning_courses, learning_lessons
```

## 5.4 Cấu trúc URL (chuẩn hoá SEO, giữ định hướng gốc)

```text
369.vn
├── /                                Trang chủ
├── /c/{category-slug}               Danh mục (SEO-friendly, không dùng /category/)
├── /p/{product-slug}-{id}           Sản phẩm (slug + id để chống trùng SEO)
├── /s/{store-slug}                  Gian hàng
├── /cart
├── /checkout
├── /account/orders/{id}
├── /account/addresses
│
├── /seller/{dashboard|products|orders|inventory|customers|finance|reports}
│
├── /member/{profile|referral|points|learning}
│
└── /admin/{dashboard|members|stores|products|orders|payments|
            commissions|accounting|reconciliation|settings}
```

## 5.5 Cấu trúc source code (chuẩn NestJS + Next.js, production-ready)

```text
369-platform/
│
├── apps/
│   ├── web/                          # Next.js 14 (App Router)
│   │   ├── app/
│   │   │   ├── (shop)/
│   │   │   ├── (seller)/
│   │   │   ├── (member)/
│   │   │   ├── (admin)/
│   │   │   └── (auth)/
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui base components
│   │   │   ├── shop/
│   │   │   ├── seller/
│   │   │   └── admin/
│   │   ├── hooks/
│   │   ├── services/                 # API client (React Query)
│   │   ├── stores/                   # Zustand state
│   │   ├── lib/
│   │   └── types/                    # dùng chung với backend qua package types
│   │
│   └── api/                          # NestJS backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── modules/
│       │   │   ├── identity/
│       │   │   ├── members/
│       │   │   ├── businesses/
│       │   │   ├── stores/
│       │   │   ├── catalog/
│       │   │   ├── inventory/
│       │   │   ├── cart-order/
│       │   │   ├── shipping/
│       │   │   ├── payment/
│       │   │   ├── commission/
│       │   │   ├── accounting/
│       │   │   ├── notification/
│       │   │   ├── review/
│       │   │   └── cms/
│       │   ├── common/
│       │   │   ├── guards/           # RBAC guards
│       │   │   ├── decorators/
│       │   │   ├── interceptors/     # audit log interceptor
│       │   │   └── filters/
│       │   ├── queue/                # BullMQ processors
│       │   │   ├── accounting.processor.ts
│       │   │   ├── commission.processor.ts
│       │   │   └── notification.processor.ts
│       │   └── config/
│       ├── migrations/               # TypeORM/Prisma migrations
│       └── test/
│
├── packages/
│   ├── shared-types/                 # Type dùng chung FE-BE
│   └── ui/                           # Design system dùng chung (nếu có mobile web khác)
│
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── nginx/
│
├── docs/                             # Tài liệu kỹ thuật (xem Mục 9)
├── .github/workflows/                # CI/CD
└── README.md
```

## 5.6 API Design (mẫu chi tiết, đủ để dev bắt tay code ngay)

```text
AUTH
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/otp/request
POST   /api/v1/auth/otp/verify

CATALOG (public, cache mạnh — SSR/ISR)
GET    /api/v1/products?category=&search=&page=
GET    /api/v1/products/{slug}
GET    /api/v1/stores/{slug}
GET    /api/v1/categories

CART / ORDER (auth required)
POST   /api/v1/cart/items
GET    /api/v1/cart
POST   /api/v1/orders                      # body: {addressId, shippingMethodId, paymentMethod, items[]}
GET    /api/v1/orders/{id}
POST   /api/v1/orders/{id}/cancel
POST   /api/v1/orders/{id}/confirm-received

PAYMENT
POST   /api/v1/payments/{orderId}/init      # trả về redirect URL
POST   /api/v1/webhooks/payment/{provider}  # webhook nhận từ VNPay/Momo — KHÔNG public docs

SELLER (role=seller, chỉ thấy dữ liệu store của mình — enforce ở DB query layer)
GET    /api/v1/seller/products
POST   /api/v1/seller/products
GET    /api/v1/seller/orders
PATCH  /api/v1/seller/orders/{id}/status
GET    /api/v1/seller/inventory
GET    /api/v1/seller/finance/summary

ACCOUNTING (role=seller|accountant, tự động — hầu như chỉ có GET)
GET    /api/v1/accounting/revenue?from=&to=
GET    /api/v1/accounting/expenses?from=&to=
GET    /api/v1/accounting/profit-loss?period=

COMMISSION
GET    /api/v1/member/referral/code
GET    /api/v1/member/commission/transactions
GET    /api/v1/member/commission/payouts

ADMIN (role=admin|super_admin)
GET    /api/v1/admin/dashboard/overview
GET    /api/v1/admin/members?status=pending
PATCH  /api/v1/admin/members/{id}/approve
GET    /api/v1/admin/reconciliation/daily
```

---

# 6. TRIỂN KHAI (IMPLEMENTATION PLAN THEO PHASE)

| Phase | Nội dung | Thời gian | Nhân sự tối thiểu | Deliverable đo được |
|---|---|---|---|---|
| **1. Nền tảng** | Auth, RBAC, Member, Product, Category, Store, Admin cơ bản, CI/CD, Docker | 4-6 tuần | 1 BE, 1 FE, 1 PM/kiêm QA | Đăng ký/đăng nhập hoạt động, seller đăng SP được, admin duyệt được |
| **2. Bán hàng** | Cart, Checkout, Order, Payment (1 gateway), Shipping (1 đối tác), Inventory + lock | 4-6 tuần | 2 BE, 1 FE | Đặt hàng thành công từ A-Z, thanh toán online hoạt động, không oversell |
| **3. Seller Center** | Dashboard, quản lý SP nâng cao, đơn hàng, kho, doanh thu, báo cáo | 3-4 tuần | 1 BE, 1 FE | Seller tự vận hành gian hàng không cần hỗ trợ thủ công |
| **4. Kế toán** | Thu/Chi tự động (NestJS), đối soát thanh toán, + **dựng Python Accounting Service** (P&L, forecast, xuất Excel/PDF, Celery Beat) | 5-6 tuần | 1 BE (NestJS), 1 BE Python (kiêm hiểu kế toán cơ bản), 1 FE | Seller xem được báo cáo lãi/lỗ + dự báo doanh thu mà không nhập tay; xuất được file Excel |
| **5. Hệ sinh thái 369** | Referral, Commission (giới hạn tầng), Points, Levels, Learning cơ bản | 3-4 tuần | 1 BE, 1 FE | Hoa hồng tính đúng, chi trả đúng lịch |
| **6. Mobile** | Flutter Android/iOS dùng chung API, Push notification, QR | 6-8 tuần | 1-2 Mobile dev | App lên store, đồng bộ dữ liệu real-time với Web |

**Tổng thời gian dự kiến MVP (Phase 1-2) sẵn sàng ra mắt: ~10-12 tuần** với đội tối thiểu 2-3 người full-time.
**Full platform (Phase 1-5, chưa gồm mobile): ~18-24 tuần (~4.5-6 tháng).**

## 6.1 Checklist Go-Live (trước khi ra mắt thật)

```text
☐ Load test: chịu được ít nhất 200 concurrent users checkout cùng lúc
☐ Backup DB tự động hàng ngày + test restore thử ít nhất 1 lần
☐ SSL/HTTPS toàn bộ domain + subdomain
☐ Webhook payment có xác thực chữ ký (signature verification) — chống giả mạo
☐ Rate limiting cho API auth (chống brute-force)
☐ Toàn bộ input đều validate ở backend (không tin frontend)
☐ Chính sách bảo mật dữ liệu cá nhân (tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân)
☐ Điều khoản sử dụng + Chính sách đổi trả công khai trên site
```

---

# 7. TỐI ƯU (OPTIMIZATION, SECURITY, PERFORMANCE)

## 7.1 Chiến lược Performance

| Layer | Kỹ thuật | Mục tiêu |
|---|---|---|
| Frontend | Next.js ISR cho trang sản phẩm/danh mục, Image optimization (next/image), lazy load | LCP < 2.5s |
| API | Redis cache cho danh mục/sản phẩm hot, pagination cursor-based cho list lớn | p95 API < 300ms |
| Database | Index đúng trên `product_slug`, `order.status`, `user_id` FK; partition bảng `order_status_history` theo tháng khi dữ liệu lớn | Query < 100ms |
| Inventory | Redis distributed lock (Redlock) khi trừ kho, tránh oversell | 0% oversell |
| Media | Ảnh/video sản phẩm qua CDN (Cloudflare R2 + CDN), resize ảnh khi upload | Giảm 60-80% băng thông |

## 7.2 Chiến lược Security

```text
✓ JWT access token (15 phút) + refresh token (7 ngày, rotate)
✓ RBAC enforce ở CẢ API layer (guard) LẪN query layer (WHERE store_id = current_user.store_id)
✓ Mọi endpoint ghi tiền (payment, commission, accounting) đều idempotent (dùng idempotency key)
✓ Webhook Payment Gateway: verify signature + whitelist IP nếu gateway hỗ trợ
✓ Mã hoá dữ liệu nhạy cảm (CCCD, số tài khoản ngân hàng) tại rest (pgcrypto hoặc application-level)
✓ Audit log cho mọi thao tác sửa/xoá trên bảng tài chính
✓ 2FA cho tài khoản Admin/Super Admin
```

## 7.3 SEO Plan (cho 369 SHOP — trang public)

```text
✓ SSR/ISR cho toàn bộ trang sản phẩm, danh mục, gian hàng (Next.js App Router)
✓ URL slug chuẩn: /p/ten-san-pham-{id} (tránh đổi slug làm mất SEO — id cố định)
✓ Schema.org structured data: Product, Offer, AggregateRating, BreadcrumbList
✓ Sitemap.xml tự động sinh, cập nhật khi có SP mới (cron hoặc ISR revalidate)
✓ Meta tag động theo sản phẩm/danh mục (Open Graph cho chia sẻ Zalo/Facebook)
✓ Core Web Vitals: ưu tiên LCP, CLS — ảnh SP có kích thước cố định tránh layout shift
```

## 7.4 Responsive Plan

```text
Breakpoints (Tailwind):     Chiến lược:
sm  (≥640px)   Mobile       Mobile-first design — 369 SHOP chủ yếu dùng trên điện thoại
md  (≥768px)   Tablet       Seller Center: bảng dữ liệu chuyển sang dạng card trên tablet
lg  (≥1024px)  Desktop      Admin Portal: tối ưu cho desktop (bảng dữ liệu lớn, nhiều cột)
xl  (≥1280px)  Wide desktop Dashboard admin có sidebar cố định
```

---

# 8. RỦI RO & PHƯƠNG ÁN XỬ LÝ

| Rủi ro | Mức độ | Phương án xử lý |
|---|---|---|
| Mô hình hoa hồng bị hiểu nhầm là đa cấp (MLM) trái phép | 🔴 Cao | Giới hạn 1 tầng hoa hồng, minh bạch công khai tỷ lệ, tư vấn pháp lý trước khi ra mắt |
| Oversell do nhiều khách mua cùng lúc | 🟠 Trung bình | Redis lock + reserve stock có TTL (đã thiết kế ở Mục 4.1) |
| Sai lệch sổ sách kế toán do lỗi đối soát | 🟠 Trung bình | Luồng đối soát riêng trước khi ghi kế toán (Mục 4.2), audit log đầy đủ |
| Seller gian lận (đơn ảo để lấy điểm/hoa hồng) | 🟠 Trung bình | Chỉ tính hoa hồng/điểm sau khi khách xác nhận nhận hàng + giữ 7-14 ngày |
| Chi phí hạ tầng vượt ngân sách khi scale sớm bằng microservices | 🟡 Thấp (đã xử lý) | Modular Monolith — chỉ tách service khi có số liệu traffic thật chứng minh cần thiết |
| Rò rỉ dữ liệu cá nhân (CCCD, tài khoản NH của hộ KD) | 🔴 Cao | Mã hoá at-rest, giới hạn quyền truy cập theo RBAC, tuân thủ NĐ 13/2023 |
| Đội ngũ kỹ thuật nhỏ không maintain nổi 40+ bảng | 🟡 Thấp | Naming convention chuẩn theo module, tài liệu hoá ERD (Mục 9), onboarding doc cho dev mới |

---

# 9. TÀI LIỆU HOÁ & VẬN HÀNH (DOCUMENTATION & OPS)

## 9.1 Bộ tài liệu cần có khi triển khai thật

```text
docs/
├── 01-business-requirements.md      # Tài liệu này (phần 1-2)
├── 02-architecture.md               # Phần 3
├── 03-database-erd.md               # Phần 5 + file .sql migration
├── 04-api-specification.md          # OpenAPI/Swagger tự sinh từ NestJS
├── 05-workflow-diagrams.md          # Phần 4
├── 06-deployment-guide.md           # Hướng dẫn deploy chi tiết (xem 9.2)
├── 07-security-checklist.md         # Phần 7.2
└── 08-onboarding-dev.md             # Hướng dẫn dev mới setup local trong < 30 phút
```

## 9.2 Deployment Guide (tóm tắt)

```text
Frontend (Next.js)        → Vercel (auto CI/CD từ GitHub main branch)
Backend Core (NestJS)     → VPS/Cloud (Docker container) hoặc Railway/Render giai đoạn đầu
Accounting Service (Python)→ Container riêng, cùng VPS/Cloud (Docker Compose) hoặc tách VPS riêng
                             khi tải báo cáo tăng cao; scale độc lập với NestJS Core
Celery Worker + Beat      → Container riêng trong cùng docker-compose, dùng chung Redis làm broker
Database (PostgreSQL)     → Managed service (Neon/Supabase/DigitalOcean Managed DB) — có backup tự động
                             + bật Read Replica từ Phase 4 để phục vụ Python service
Redis                     → Managed Redis (Upstash/Redis Cloud) — dùng chung cho cache, lock kho,
                             VÀ làm message broker giữa NestJS ↔ Python (Redis Streams)
Object Storage            → Cloudflare R2 (rẻ hơn S3, không phí egress) — lưu file Excel/PDF báo cáo
CI/CD                     → GitHub Actions: 2 pipeline riêng (api/ và accounting-service/) →
                             test → build → deploy tự động khi merge vào main
Monitoring                → Sentry (error tracking, bật riêng cho cả 2 service) +
                             Uptime robot/BetterStack (uptime) ngay từ Phase 1
```

## 9.3 Định nghĩa "Done" cho mỗi tính năng (Definition of Done)

```text
☐ Code có unit test cho logic nghiệp vụ quan trọng (tính kho, tính hoa hồng, tính tiền)
☐ API có Swagger doc tự sinh
☐ Có xử lý lỗi & validate input đầy đủ
☐ Đã test trên mobile viewport thật (không chỉ resize browser)
☐ Đã review bởi ít nhất 1 người khác (code review)
☐ Đã cập nhật CHANGELOG.md
```

---

# TỔNG KẾT

Tài liệu này giữ nguyên **tầm nhìn và điểm khác biệt cốt lõi** của bản thảo gốc — mô hình đa vai trò (mua/bán/giới thiệu/học) tích hợp trực tiếp với kế toán hộ kinh doanh — đồng thời bổ sung các yếu tố **bắt buộc phải có để triển khai thực tế**:

1. ✅ Kiến trúc Modular Monolith thay vì microservices quá sớm → tiết kiệm chi phí, dev nhanh hơn
2. ✅ Cơ chế chống oversell kho hàng bằng Redis lock
3. ✅ Luồng đối soát thanh toán độc lập trước khi ghi kế toán
4. ✅ Giới hạn hoa hồng 1 tầng để tuân thủ pháp luật về bán hàng đa cấp
5. ✅ Timeline + nhân sự cụ thể cho từng phase, có thể dùng lập ngân sách ngay
6. ✅ API spec chi tiết đủ để dev bắt tay code không cần hỏi lại
7. ✅ Checklist bảo mật, SEO, performance, go-live rõ ràng, đo lường được

**Bước tiếp theo đề xuất:** bắt đầu Phase 1 với việc dựng ERD chi tiết thành file migration thật (TypeORM/Prisma) và scaffold cấu trúc NestJS theo Mục 5.5 — em có thể hỗ trợ sinh trực tiếp code khởi tạo dự án nếu anh/chị xác nhận chọn NestJS.
