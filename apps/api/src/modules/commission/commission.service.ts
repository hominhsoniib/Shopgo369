import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommissionStatus, ExpenseCategory, PayoutStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const HOLD_DAYS = 10; // Mục 4.3 spec: giữ 7-14 ngày — chọn 10 làm mặc định cấu hình được

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Ghi nhận hoa hồng khi order.paid (Mục 4.3 spec luồng tính hoa hồng).
   *
   * GIẢ ĐỊNH: hoa hồng trả cho Member đã giới thiệu NGƯỜI MUA (buyer), CHỈ
   * 1 TẦNG DUY NHẤT (member.referredById — KHÔNG truy ngược lên referredBy
   * .referredBy) — tuân thủ pháp luật về bán hàng đa cấp (Mục 1.1, 4.3 spec).
   * Nếu buyer không phải Member hoặc không có người giới thiệu → bỏ qua, không
   * phát sinh hoa hồng cho đơn này.
   */
  async recordCommissionForOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    const existing = await this.prisma.commissionTransaction.findUnique({ where: { orderId } });
    if (existing) {
      this.logger.log(`Đơn ${order.orderCode} đã được tính hoa hồng trước đó — bỏ qua (idempotent)`);
      return;
    }

    const buyerMember = await this.prisma.member.findUnique({ where: { userId: order.userId } });
    if (!buyerMember || !buyerMember.referredById) {
      return; // người mua không phải member hoặc không được ai giới thiệu — không có hoa hồng
    }

    const rule = await this.prisma.commissionRule.findFirst({ where: { isActive: true } });
    if (!rule) {
      this.logger.warn('Chưa cấu hình CommissionRule đang active — bỏ qua tính hoa hồng');
      return;
    }

    const baseAmount = Number(order.subtotal) - Number(order.discountAmount);
    const commissionAmount = Math.round((baseAmount * Number(rule.ratePercent)) / 100);
    if (commissionAmount <= 0) return;

    await this.prisma.commissionTransaction.create({
      data: {
        referrerId: buyerMember.referredById,
        orderId: order.id,
        ruleId: rule.id,
        amount: commissionAmount,
        status: CommissionStatus.PENDING,
        holdUntil: new Date(Date.now() + HOLD_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`Ghi nhận hoa hồng ${commissionAmount}đ cho member ${buyerMember.referredById} từ đơn ${order.orderCode}`);
  }

  /** Đơn bị huỷ/hoàn trong thời gian giữ → từ chối hoa hồng tương ứng (Mục 4.3 spec) */
  async rejectCommissionForOrder(orderId: string): Promise<void> {
    await this.prisma.commissionTransaction.updateMany({
      where: { orderId, status: CommissionStatus.PENDING },
      data: { status: CommissionStatus.REJECTED },
    });
  }

  /**
   * Cron chạy hàng ngày: duyệt các commission đã hết hạn giữ (holdUntil đã
   * qua) và đơn hàng KHÔNG bị huỷ/hoàn → APPROVED + ghi ExpenseTransaction
   * (Mục 4.4 spec: "commission_transactions.approved → expense_transactions").
   */
  async approveMaturedCommissions(): Promise<number> {
    const matured = await this.prisma.commissionTransaction.findMany({
      where: { status: CommissionStatus.PENDING, holdUntil: { lte: new Date() } },
      include: { order: true },
    });

    let approvedCount = 0;
    for (const commission of matured) {
      const cancelledLike = (['CANCELLED', 'PAYMENT_FAILED', 'REFUNDED'] as string[]).includes(commission.order.status);
      if (cancelledLike) {
        await this.prisma.commissionTransaction.update({
          where: { id: commission.id },
          data: { status: CommissionStatus.REJECTED },
        });
        continue;
      }

      await this.prisma.$transaction([
        this.prisma.commissionTransaction.update({
          where: { id: commission.id },
          data: { status: CommissionStatus.APPROVED },
        }),
        this.prisma.expenseTransaction.create({
          data: {
            storeId: commission.order.storeId,
            orderId: commission.orderId,
            category: ExpenseCategory.COMMISSION,
            amount: commission.amount,
            description: `Hoa hồng giới thiệu — đơn ${commission.order.orderCode}`,
            occurredAt: new Date(),
          },
        }),
      ]);
      approvedCount++;
    }

    if (approvedCount > 0) this.logger.log(`Đã duyệt ${approvedCount} hoa hồng đến hạn`);
    return approvedCount;
  }

  /** Gộp các commission APPROVED thành 1 kỳ chi trả (Mục 4.3 spec: "2 lần/tháng") */
  async createPayoutBatch(periodLabel: string): Promise<{ payoutsCreated: number }> {
    const approvedGrouped = await this.prisma.commissionTransaction.groupBy({
      by: ['referrerId'],
      where: { status: CommissionStatus.APPROVED, payoutId: null },
      orderBy: { referrerId: 'asc' },
      _sum: { amount: true },
    });

    let payoutsCreated = 0;
    for (const group of approvedGrouped) {
      const totalAmount = Number(group._sum.amount ?? 0);
      if (totalAmount <= 0) continue;

      await this.prisma.$transaction(async (tx) => {
        const payout = await tx.commissionPayout.create({
          data: { referrerId: group.referrerId, periodLabel, totalAmount, status: PayoutStatus.PENDING },
        });
        await tx.commissionTransaction.updateMany({
          where: { referrerId: group.referrerId, status: CommissionStatus.APPROVED, payoutId: null },
          data: { payoutId: payout.id },
        });
      });
      payoutsCreated++;
    }

    return { payoutsCreated };
  }

  async getMyCommissions(userId: string) {
    const member = await this.prisma.member.findUnique({ where: { userId } });
    if (!member) return { transactions: [], payouts: [] };

    const [transactions, payouts] = await this.prisma.$transaction([
      this.prisma.commissionTransaction.findMany({
        where: { referrerId: member.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commissionPayout.findMany({
        where: { referrerId: member.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { transactions, payouts };
  }
}
