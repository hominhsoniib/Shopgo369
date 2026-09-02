import { BadRequestException } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionType } from '@prisma/client';

function makeMockPrisma() {
  return { promotion: { findUnique: jest.fn() }, store: { findFirst: jest.fn() } } as any;
}

describe('PromotionsService.incrementUsageAtomic — chống race condition hết lượt mã giảm giá', () => {
  let service: PromotionsService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    prisma = makeMockPrisma();
    service = new PromotionsService(prisma);
  });

  it('trả về true khi UPDATE thành công (affectedRows > 0) — mã còn lượt', async () => {
    const tx: any = { $executeRaw: jest.fn().mockResolvedValue(1) };

    const ok = await service.incrementUsageAtomic(tx, 'promo-1');

    expect(ok).toBe(true);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('★ trả về false khi affectedRows = 0 — mã VỪA bị request khác dùng hết ngay trước đó (thua race condition)', async () => {
    const tx: any = { $executeRaw: jest.fn().mockResolvedValue(0) };

    const ok = await service.incrementUsageAtomic(tx, 'promo-1');

    expect(ok).toBe(false);
  });

  it('dùng RAW SQL với điều kiện WHERE usedCount < usageLimit trong CÙNG 1 câu UPDATE (atomic, không phải đọc-rồi-ghi 2 bước)', async () => {
    const tx: any = { $executeRaw: jest.fn().mockResolvedValue(1) };

    await service.incrementUsageAtomic(tx, 'promo-1');

    // Prisma tagged-template: strings[] + values[]. Kiểm tra promotionId được
    // truyền như tham số bind (chống SQL injection) chứ không nối chuỗi thủ công.
    const [strings, ...values] = tx.$executeRaw.mock.calls[0];
    const sql = strings.join('?');
    expect(sql).toMatch(/UPDATE\s+promotions/i);
    expect(sql).toMatch(/used_count\s*=\s*used_count\s*\+\s*1/i);
    expect(sql).toMatch(/used_count\s*<\s*usage_limit/i);
    expect(values).toContain('promo-1');
  });

  it('dùng tx (transaction client được truyền vào) chứ KHÔNG dùng this.prisma riêng — bắt buộc chạy CÙNG transaction với việc tạo Order', async () => {
    const tx: any = { $executeRaw: jest.fn().mockResolvedValue(1) };
    prisma.$executeRaw = jest.fn(); // nếu service lỡ dùng nhầm this.prisma, spy này sẽ bị gọi

    await service.incrementUsageAtomic(tx, 'promo-1');

    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('2 request đồng thời giành 1 lượt cuối cùng: chỉ 1 request được true, request kia phải false (mô phỏng DB tuần tự hoá UPDATE)', async () => {
    let usedCount = 9;
    const usageLimit = 10; // chỉ còn đúng 1 lượt
    const tx: any = {
      $executeRaw: jest.fn().mockImplementation(async () => {
        if (usedCount < usageLimit) {
          usedCount += 1;
          return 1;
        }
        return 0;
      }),
    };

    const [r1, r2] = await Promise.all([
      service.incrementUsageAtomic(tx, 'promo-1'),
      service.incrementUsageAtomic(tx, 'promo-1'),
    ]);

    // Đúng 1 trong 2 phải thắng — không được cả 2 cùng true (mới là bug oversell mã giảm giá)
    expect([r1, r2].filter(Boolean)).toHaveLength(1);
    expect(usedCount).toBe(10);
  });
});

describe('PromotionsService.validatePromotion — điều kiện áp mã (bổ trợ cho incrementUsageAtomic)', () => {
  let service: PromotionsService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    prisma = makeMockPrisma();
    service = new PromotionsService(prisma);
  });

  const basePromotion = {
    id: 'promo-1',
    isActive: true,
    deletedAt: null,
    startsAt: new Date(Date.now() - 86400000),
    endsAt: new Date(Date.now() + 86400000),
    usageLimit: null,
    usedCount: 0,
    minOrderAmount: 0,
    maxDiscountAmount: null,
    type: PromotionType.PERCENTAGE,
    value: 10,
  };

  it('throw BadRequestException nếu đã hết lượt sử dụng (usedCount >= usageLimit)', async () => {
    prisma.promotion.findUnique.mockResolvedValue({
      ...basePromotion,
      usageLimit: 5,
      usedCount: 5,
    });

    await expect(
      service.validatePromotion('store-1', 'SALE10', 500_000),
    ).rejects.toThrow(BadRequestException);
  });

  it('giới hạn discount không vượt quá maxDiscountAmount khi type=PERCENTAGE', async () => {
    prisma.promotion.findUnique.mockResolvedValue({
      ...basePromotion,
      value: 50, // 50%
      maxDiscountAmount: 100_000,
    });

    const { discountAmount } = await service.validatePromotion(
      'store-1',
      'SALE50',
      1_000_000, // 50% = 500k, nhưng trần là 100k
    );

    expect(discountAmount).toBe(100_000);
  });

  it('discount không bao giờ vượt quá subtotal (kể cả FIXED_AMOUNT lớn hơn giá trị đơn)', async () => {
    prisma.promotion.findUnique.mockResolvedValue({
      ...basePromotion,
      type: PromotionType.FIXED_AMOUNT,
      value: 200_000,
    });

    const { discountAmount } = await service.validatePromotion(
      'store-1',
      'FIX200K',
      150_000, // đơn chỉ 150k
    );

    expect(discountAmount).toBe(150_000);
  });
});
