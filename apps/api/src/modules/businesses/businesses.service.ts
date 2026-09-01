import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessStatus } from '@prisma/client';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Đăng ký hộ kinh doanh — bắt buộc đã là Member (Mục 3.2 spec: quan hệ Member → Business). */
  async register(userId: string, data: {
    businessName: string;
    taxCode?: string;
    ownerIdCard: string;
    address: string;
  }) {
    const member = await this.prisma.member.findUnique({ where: { userId } });
    if (!member) {
      throw new NotFoundException('Bạn cần đăng ký thành viên 369 trước khi đăng ký hộ kinh doanh');
    }

    const existing = await this.prisma.business.findUnique({ where: { memberId: member.id } });
    if (existing) {
      throw new ConflictException('Hộ kinh doanh đã tồn tại cho thành viên này');
    }

    return this.prisma.business.create({
      data: {
        memberId: member.id,
        businessName: data.businessName,
        taxCode: data.taxCode,
        ownerIdCard: data.ownerIdCard, // Lưu ý production: mã hoá field này (Mục 7.2 spec)
        address: data.address,
        status: BusinessStatus.PENDING_VERIFICATION,
      },
    });
  }

  async verify(businessId: string) {
    return this.prisma.business.update({
      where: { id: businessId },
      data: { status: BusinessStatus.VERIFIED },
    });
  }

  async reject(businessId: string) {
    return this.prisma.business.update({
      where: { id: businessId },
      data: { status: BusinessStatus.REJECTED },
    });
  }

  listPendingVerification() {
    return this.prisma.business.findMany({
      where: { status: BusinessStatus.PENDING_VERIFICATION },
      include: { member: { include: { user: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Kiểm tra quyền sở hữu — dùng ở tầng service cho enforce RBAC theo dữ liệu (Mục 7.2 spec) */
  async assertOwnership(businessId: string, userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { member: true },
    });
    if (!business || business.member.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập hộ kinh doanh này');
    }
    return business;
  }
}
