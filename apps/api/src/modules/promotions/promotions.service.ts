import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromotionType } from '@prisma/client';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnStoreId(userId: string): Promise<string> {
    const store = await this.prisma.store.findFirst({ where: { business: { member: { userId } } } });
    if (!store) throw new NotFoundException('Bạn chưa có gian hàng');
    return store.id;
  }

  async create(userId: string, data: {
    code: string;
    type: PromotionType;
    value: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    startsAt: string;
    endsAt: string;
  }) {
    const storeId = await this.getOwnStoreId(userId);

    if (data.type === PromotionType.PERCENTAGE && (data.value <= 0 || data.value > 100)) {
      throw new BadRequestException('Giá trị % giảm giá phải trong khoảng (0, 100]');
    }
    if (new Date(data.startsAt) >= new Date(data.endsAt)) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
    }

    const existing = await this.prisma.promotion.findUnique({
      where: { storeId_code: { storeId, code: data.code.toUpperCase() } },
    });
    if (existing) throw new ConflictException('Mã khuyến mãi này đã tồn tại trong gian hàng của bạn');

    return this.prisma.promotion.create({
      data: {
        storeId,
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount ?? 0,
        maxDiscountAmount: data.maxDiscountAmount,
        usageLimit: data.usageLimit,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
      },
    });
  }

  async listOwn(userId: string) {
    const storeId = await this.getOwnStoreId(userId);
    return this.prisma.promotion.findMany({ where: { storeId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  async deactivate(userId: string, promotionId: string) {
    const promotion = await this.assertOwnership(userId, promotionId);
    return this.prisma.promotion.update({ where: { id: promotion.id }, data: { isActive: false } });
  }

  /**
   * Kiểm tra + TÍNH TOÁN mã giảm giá cho 1 đơn hàng cụ thể của 1 store
   * (dùng bởi OrdersService lúc checkout — Mục 4.1 spec luồng mua hàng
   * "CHỌN KHUYẾN MÃI" mở rộng thêm bước áp mã).
   *
   * Trả về { promotion, discountAmount } nếu hợp lệ, throw nếu không.
   * KHÔNG tăng usedCount ở đây — việc tăng đếm phải làm ATOMIC trong cùng
   * transaction tạo Order (xem OrdersService) để tránh 2 request cùng dùng
   * hết lượt mã giảm giá giới hạn ("race condition" giống hệt vấn đề tồn kho).
   */
  async validatePromotion(storeId: string, code: string, subtotal: number) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { storeId_code: { storeId, code: code.toUpperCase() } },
    });

    const now = new Date();
    if (
      !promotion ||
      !promotion.isActive ||
      promotion.deletedAt ||
      promotion.startsAt > now ||
      promotion.endsAt < now
    ) {
      throw new BadRequestException('Mã khuyến mãi không hợp lệ hoặc đã hết hạn');
    }
    if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) {
      throw new BadRequestException('Mã khuyến mãi đã hết lượt sử dụng');
    }
    if (subtotal < Number(promotion.minOrderAmount)) {
      throw new BadRequestException(
        `Đơn hàng cần tối thiểu ${Number(promotion.minOrderAmount).toLocaleString('vi-VN')}đ để áp dụng mã này`,
      );
    }

    let discountAmount =
      promotion.type === PromotionType.PERCENTAGE
        ? (subtotal * Number(promotion.value)) / 100
        : Number(promotion.value);

    if (promotion.maxDiscountAmount && discountAmount > Number(promotion.maxDiscountAmount)) {
      discountAmount = Number(promotion.maxDiscountAmount);
    }
    discountAmount = Math.min(discountAmount, subtotal); // không giảm vượt quá giá trị đơn

    return { promotion, discountAmount };
  }

  /**
   * Tăng usedCount MỘT CÁCH ATOMIC bằng raw SQL (UPDATE ... WHERE usedCount <
   * usageLimit) — Prisma Client thông thường KHÔNG hỗ trợ so sánh 2 cột cùng
   * 1 dòng (usedCount vs usageLimit) trong filter, nên phải dùng $executeRaw.
   * Nếu affected rows = 0 nghĩa là mã vừa bị dùng hết bởi request khác ngay
   * trước đó (race condition giống hệt vấn đề tồn kho) → phải rollback order.
   * Gọi bên trong CÙNG transaction Prisma với việc tạo Order.
   */
  async incrementUsageAtomic(tx: Prisma.TransactionClient, promotionId: string): Promise<boolean> {
    // ★ BUG ĐÃ SỬA (phát hiện khi test Refund API thật): "id" trong schema là
    // Prisma String (map sang Postgres "text", KHÔNG có @db.Uuid ở bất kỳ model
    // nào trong toàn schema) — ép kiểu ::uuid gây lỗi "operator does not exist:
    // text = uuid" khi chạy thật (unit test cũ dùng mock $executeRaw nên không
    // phát hiện được, vì mock không validate cú pháp SQL thật với Postgres).
    const affectedRows = await tx.$executeRaw`
      UPDATE promotions
      SET used_count = used_count + 1
      WHERE id = ${promotionId}
        AND is_active = true
        AND (usage_limit IS NULL OR used_count < usage_limit)
    `;
    return affectedRows > 0;
  }

  private async assertOwnership(userId: string, promotionId: string) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
      include: { store: { include: { business: { include: { member: true } } } } },
    });
    if (!promotion || promotion.store.business.member.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền quản lý mã khuyến mãi này');
    }
    return promotion;
  }
}
