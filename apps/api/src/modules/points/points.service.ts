import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);
  private readonly pointsPerVnd: number; // vd: 1 điểm / 10,000đ

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.pointsPerVnd = parseInt(this.config.get('POINTS_PER_VND') ?? '10000', 10);
  }

  /**
   * Cộng điểm khi đơn HOÀN TẤT (Mục 4.1 spec: "HOÀN TẤT → mở đánh giá SP,
   * cộng điểm tích lũy"). Idempotent qua kiểm tra PointTransaction theo orderId.
   */
  async awardPointsForOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    const existing = await this.prisma.pointTransaction.findFirst({ where: { orderId } });
    if (existing) return; // đã cộng điểm cho đơn này rồi

    const member = await this.prisma.member.findUnique({ where: { userId: order.userId } });
    if (!member) return; // khách không phải member — không tích điểm

    const earnedPoints = Math.floor(Number(order.totalAmount) / this.pointsPerVnd);
    if (earnedPoints <= 0) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.pointTransaction.create({
        data: { memberId: member.id, orderId, points: earnedPoints, reason: `Mua hàng đơn ${order.orderCode}` },
      });
      await tx.member.update({
        where: { id: member.id },
        data: { points: { increment: earnedPoints } },
      });
    });

    await this.recalculateLevel(member.id);
    this.logger.log(`Cộng ${earnedPoints} điểm cho member ${member.id} từ đơn ${order.orderCode}`);
  }

  /** Tự động nâng hạng thành viên dựa trên tổng điểm hiện tại (Mục 5.3, 6 spec: Level) */
  async recalculateLevel(memberId: string): Promise<void> {
    const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    const eligibleLevel = await this.prisma.memberLevel.findFirst({
      where: { minPoints: { lte: member.points } },
      orderBy: { minPoints: 'desc' },
    });

    if (eligibleLevel && eligibleLevel.id !== member.levelId) {
      await this.prisma.member.update({ where: { id: memberId }, data: { levelId: eligibleLevel.id } });
      this.logger.log(`Member ${memberId} lên hạng "${eligibleLevel.name}"`);
    }
  }

  async getMyPoints(userId: string) {
    const member = await this.prisma.member.findUnique({
      where: { userId },
      include: { level: true },
    });
    if (!member) return null;

    const history = await this.prisma.pointTransaction.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { totalPoints: member.points, level: member.level, history };
  }
}
