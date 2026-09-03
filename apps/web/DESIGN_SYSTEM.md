# Design System — 369 SHOP

Định hướng thương hiệu: **nông sản sạch, mộc mạc, đáng tin**.

## 1. Token màu (`tailwind.config.ts`)

| Token | Base (600) | Dùng cho |
|---|---|---|
| `primary` (Lá non) | `#4F7A2A` | Thương hiệu, nút chính, giá, link active |
| `secondary` (Đất nâu) | `#785331` | Nhấn phụ, viền, icon phụ |
| `neutral` (Giấy gạo) | nền `#FAF9F6` / chữ `#4A463A` | Nền trang, text — thay `gray` mặc định (lạnh) của Tailwind |
| `danger` (Gạch) | `#A8402A` | Lỗi, xoá, đăng xuất |
| `warning` (Nghệ) | `#C08A2E` | Trạng thái chờ xử lý |

Mỗi màu có đủ scale `50 → 900`. Không dùng `red-*`, `gray-*`, `green-*` mặc định của Tailwind nữa cho code mới — luôn dùng token thương hiệu ở trên.

## 2. Font

- **`font-sans`** (mặc định body/UI): Be Vietnam Pro — hỗ trợ tiếng Việt tốt, humanist, thân thiện.
- **`font-display`**: Lora (serif ấm) — chỉ dùng cho tiêu đề lớn và giá tiền nổi bật (`PriceTag`, `<h1>`), tạo cảm giác đáng tin.

Nạp qua `next/font/google` trong `app/layout.tsx` — tự tối ưu, cache local lúc build, không phụ thuộc CDN runtime.

## 3. Component (`components/ui/`)

| Component | Dùng khi nào |
|---|---|
| `Button` | Mọi nút bấm — variant `primary/secondary/ghost/danger`, size `sm/md/lg` |
| `Card` | Khung nội dung có viền/bo góc — prop `hoverable` cho card có thể click |
| `Badge` | Nhãn trạng thái nhỏ (đơn hàng, tồn kho...) — tone `primary/secondary/neutral/danger/warning` |
| `PriceTag` | Mọi chỗ hiển thị giá VND — thay pattern `Number(x).toLocaleString('vi-VN') + 'đ'` lặp lại |
| `ProductCard` | Thẻ sản phẩm — dùng ở trang chủ, danh mục, tìm kiếm |
| `EmptyState` | Trạng thái rỗng (giỏ hàng trống, chưa có đơn...) |

## 4. Đã áp dụng

**Phase 1:**
- `Header.tsx` — dùng token màu + `Button`
- `app/(shop)/page.tsx` (trang chủ) — dùng `ProductCard` + `EmptyState`

**Phase 2 (luồng mua hàng chính):**
- `app/(shop)/p/[slug]/page.tsx` (chi tiết sản phẩm) — `Button`, `Badge`, `PriceTag`, `EmptyState`
- `app/(shop)/cart/page.tsx` (giỏ hàng) — `Card`, `Button`, `Badge`, `PriceTag`, `EmptyState`
- `app/(shop)/checkout/page.tsx` — `Card`, `Button`, `PriceTag`; radio chọn vận chuyển/thanh toán có viền `primary-400` khi active

## 5. Chưa áp dụng — việc còn lại (phase 3)

- `app/(shop)/orders/*` (danh sách + chi tiết đơn hàng)
- `app/(auth)/login`, `register`, `app/(shop)/account/change-password`
- `app/(seller)/*`, `app/(admin)/*`, `app/(member)/*`

Gợi ý thứ tự tiếp theo: trang đơn hàng (cùng luồng mua hàng, khách hàng thấy ngay sau checkout) trước, rồi tới seller/admin.
