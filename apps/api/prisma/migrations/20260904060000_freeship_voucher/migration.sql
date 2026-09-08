-- ★ Freeship voucher (thay thế mảng hardcode FREESHIP369/FREESHIP30K/HTX369SHIP
-- trước đây chỉ tồn tại trong state React của checkout/page.tsx, không hề ghi DB)

-- CreateTable
CREATE TABLE "shipping_vouchers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discount_amount" DECIMAL(14,2) NOT NULL,
    "usage_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_vouchers_code_key" ON "shipping_vouchers"("code");

-- CreateTable
CREATE TABLE "shipping_voucher_usages" (
    "id" TEXT NOT NULL,
    "shipping_voucher_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_voucher_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_voucher_usages_order_id_key" ON "shipping_voucher_usages"("order_id");

-- AlterTable: thêm cột giảm giá ship vào orders (tách riêng khỏi discount_amount hiện có,
-- vì discount_amount đang dùng cho Promotion — giảm trên subtotal, khác bản chất với
-- shipping_discount_amount — giảm trên shippingFee)
ALTER TABLE "orders" ADD COLUMN "shipping_discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "shipping_voucher_id" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_voucher_id_fkey"
    FOREIGN KEY ("shipping_voucher_id") REFERENCES "shipping_vouchers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_voucher_usages" ADD CONSTRAINT "shipping_voucher_usages_shipping_voucher_id_fkey"
    FOREIGN KEY ("shipping_voucher_id") REFERENCES "shipping_vouchers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_voucher_usages" ADD CONSTRAINT "shipping_voucher_usages_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed 3 mã freeship đang hiển thị hardcode trên FE (checkout/page.tsx) — để khi FE
-- được sửa sang gọi API thật (GET /shipping/vouchers), dữ liệu hiển thị không đổi.
INSERT INTO "shipping_vouchers" ("id", "code", "name", "description", "discount_amount", "usage_limit", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid()::text, 'FREESHIP369', 'Miễn phí vận chuyển 100% — ShopGo 369', 'Giảm 100% phí giao hàng cho mọi đơn nông sản', 35000, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'FREESHIP30K', 'Mã Freeship Nông Sản 30.000đ', 'Giảm tối đa 30.000đ phí giao hàng nhanh', 30000, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'HTX369SHIP', 'Mã Khuyến Mãi Phí Ship Hợp Tác Xã 369', 'Hỗ trợ 20.000đ cước vận chuyển nông sản tận nhà', 20000, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
