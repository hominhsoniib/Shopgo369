import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessStatus, MemberStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dashboard tổng quan Phase 1 — số liệu cơ bản, chưa có doanh thu (Phase 2+) */
  async getOverview() {
    const [totalUsers, totalMembers, pendingMembers, totalBusinesses, pendingBusinesses, totalStores, totalProducts] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.member.count({ where: { status: MemberStatus.APPROVED } }),
        this.prisma.member.count({ where: { status: MemberStatus.PENDING } }),
        this.prisma.business.count({ where: { status: BusinessStatus.VERIFIED } }),
        this.prisma.business.count({ where: { status: BusinessStatus.PENDING_VERIFICATION } }),
        this.prisma.store.count({ where: { deletedAt: null } }),
        this.prisma.product.count({ where: { deletedAt: null } }),
      ]);

    return {
      totalUsers,
      totalMembers,
      pendingMembers,
      totalBusinesses,
      pendingBusinesses,
      totalStores,
      totalProducts,
    };
  }
}
