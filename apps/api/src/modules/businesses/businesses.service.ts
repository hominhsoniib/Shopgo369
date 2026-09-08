import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service';
import { BusinessStatus } from '@prisma/client';

@Injectable()
export class BusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldEncryptionService,
  ) {}

  /** Trả 1 business với ownerIdCard đã giải mã — dùng ở mọi điểm trả dữ liệu ra ngoài */
  private decryptOne<T extends { ownerIdCard: string }>(business: T): T {
    return { ...business, ownerIdCard: this.crypto.decrypt(business.ownerIdCard) };
  }

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

    const created = await this.prisma.business.create({
      data: {
        memberId: member.id,
        businessName: data.businessName,
        taxCode: data.taxCode,
        ownerIdCard: this.crypto.encrypt(data.ownerIdCard), // mã hoá at-rest (Mục 7.2 spec, Nghị định 13/2023)
        ownerIdCardHash: this.crypto.hashForLookup(data.ownerIdCard),
        address: data.address,
        status: BusinessStatus.PENDING_VERIFICATION,
      },
    });
    return this.decryptOne(created); // trả bản rõ cho chính người vừa nhập — họ đã biết CCCD của họ
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

  async listPendingVerification() {
    const items = await this.prisma.business.findMany({
      where: { status: BusinessStatus.PENDING_VERIFICATION },
      include: { member: { include: { user: true } } },
      orderBy: { createdAt: 'asc' },
    });
    // Admin CẦN thấy CCCD thật để đối chiếu hồ sơ KYC — đây là mục đích hợp
    // pháp duy nhất cho phép giải mã hàng loạt (khác với listBusinesses ở
    // AdminController vốn phục vụ mục đích quản lý chung, xem admin.service.ts).
    return items.map((b) => this.decryptOne(b));
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
    return this.decryptOne(business);
  }
}
