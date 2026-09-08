import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ShippingVouchersService — thay cho mảng FREESHIP_VOUCHERS hardcode trước đây trong
 * apps/web checkout/page.tsx (chỉ tồn tại ở state React, không ghi DB, khiến khách thấy
 * "0đ FREESHIP" trên UI nhưng đơn thật vẫn bị tính đủ 100% phí ship — xem
 * SHOPGO369_AUDIT_TOAN_BO.md). Bám sát pattern PromotionsService.validatePromotion /
 * incrementUsageAtomic để nhất quán cách xử lý race condition khi mã có giới hạn lượt dùng.
 */
@Injectable()
export class ShippingVouchersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Danh sách mã còn hiệu lực — dùng cho GET /shipping/vouchers (public, FE hiển thị trước khi áp mã) */
  async listActive() {
    const now = new Date();
    return this.prisma.shippingVoucher.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { discountAmount: 'desc' },
    });
  }

  /**
   * Kiểm tra + TÍNH TOÁN mã freeship cho 1 order cụ thể (dùng bởi OrdersService lúc checkout).
   * Trả về { voucher, discountAmount } nếu hợp lệ, throw nếu không.
   * KHÔNG tăng usedCount ở đây — giống PromotionsService, việc tăng đếm phải ATOMIC trong
   * cùng transaction tạo Order để tránh race condition khi mã sắp hết lượt.
   */
  async validateVoucher(code: string, shippingFee: number) {
    const voucher = await this.prisma.shippingVoucher.findUnique({ where: { code: code.toUpperCase() } });

    const now = new Date();
    if (
      !voucher ||
      !voucher.isActive ||
      (voucher.startsAt && voucher.startsAt > now) ||
      (voucher.endsAt && voucher.endsAt < now)
    ) {
      throw new BadRequestException('Mã freeship không hợp lệ hoặc đã hết hạn');
    }
    if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
      throw new BadRequestException('Mã freeship đã hết lượt sử dụng');
    }

    const discountAmount = Math.min(Number(voucher.discountAmount), shippingFee);
    return { voucher, discountAmount };
  }

  /** Tăng usedCount ATOMIC — cùng kỹ thuật raw SQL với PromotionsService.incrementUsageAtomic
   *  (Prisma không so sánh được 2 cột cùng dòng trong filter thông thường). */
  async incrementUsageAtomic(tx: Prisma.TransactionClient, voucherId: string): Promise<boolean> {
    const affectedRows = await tx.$executeRaw`
      UPDATE shipping_vouchers
      SET used_count = used_count + 1
      WHERE id = ${voucherId}
        AND is_active = true
        AND (usage_limit IS NULL OR used_count < usage_limit)
    `;
    return affectedRows > 0;
  }
}
