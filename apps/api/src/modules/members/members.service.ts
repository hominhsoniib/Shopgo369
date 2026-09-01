import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberStatus } from '@prisma/client';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Đăng ký trở thành thành viên 369 — sinh member_code duy nhất,
   * ghi nhận người giới thiệu (referredBy) nếu có, GIỚI HẠN 1 TẦNG
   * (Mục 4.3 spec — tuân thủ pháp luật về bán hàng đa cấp).
   */
  async registerMember(userId: string, referralCode?: string) {
    const existing = await this.prisma.member.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('Tài khoản này đã là thành viên 369');
    }

    let referredById: string | undefined;
    if (referralCode) {
      const referrer = await this.prisma.member.findUnique({
        where: { memberCode: referralCode },
      });
      if (!referrer) {
        throw new NotFoundException('Mã giới thiệu không tồn tại');
      }
      // Chỉ lấy referrer trực tiếp — KHÔNG truy ngược lên referredBy.referredBy
      // để đảm bảo chỉ có đúng 1 tầng hoa hồng (xem Mục 4.3 spec).
      referredById = referrer.id;
    }

    const memberCode = await this.generateMemberCode();

    return this.prisma.member.create({
      data: {
        userId,
        memberCode,
        referredById,
        status: MemberStatus.PENDING,
      },
    });
  }

  async approve(memberId: string) {
    return this.prisma.member.update({
      where: { id: memberId },
      data: { status: MemberStatus.APPROVED },
    });
  }

  async reject(memberId: string) {
    return this.prisma.member.update({
      where: { id: memberId },
      data: { status: MemberStatus.REJECTED },
    });
  }

  findByUserId(userId: string) {
    return this.prisma.member.findUnique({
      where: { userId },
      include: { business: { include: { store: true } }, level: true },
    });
  }

  listPending() {
    return this.prisma.member.findMany({
      where: { status: MemberStatus.PENDING },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async generateMemberCode(): Promise<string> {
    // Đơn giản hoá cho Phase 1: 369-000001, 369-000002...
    const count = await this.prisma.member.count();
    return `369-${String(count + 1).padStart(6, '0')}`;
  }
}
