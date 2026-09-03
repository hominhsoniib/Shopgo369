import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessStatus, MemberStatus, ProductStatus, StoreStatus, PayoutStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dashboard tổng quan Phase 1 — số liệu cơ bản */
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

  // ── Quản lý Hộ Kinh Doanh (Business KYC) ──────────────────────────────
  async listBusinesses(params: { status?: BusinessStatus; search?: string; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: any = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { businessName: { contains: params.search, mode: 'insensitive' } },
        { taxCode: { contains: params.search, mode: 'insensitive' } },
        { ownerIdCard: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        where,
        include: {
          member: { include: { user: { select: { fullName: true, email: true, phone: true } } } },
          store: { select: { id: true, name: true, slug: true, status: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.business.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async verifyBusiness(id: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Hộ kinh doanh không tồn tại');
    return this.prisma.business.update({
      where: { id },
      data: { status: BusinessStatus.VERIFIED },
    });
  }

  async rejectBusiness(id: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Hộ kinh doanh không tồn tại');
    return this.prisma.business.update({
      where: { id },
      data: { status: BusinessStatus.REJECTED },
    });
  }

  // ── Quản lý Gian Hàng (Store Management) ───────────────────────────
  async listStores(params: { status?: StoreStatus; search?: string; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: any = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.search) where.name = { contains: params.search, mode: 'insensitive' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.store.findMany({
        where,
        include: {
          business: { include: { member: { include: { user: { select: { fullName: true, email: true } } } } } },
          _count: { select: { products: true, orders: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.store.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getStoreDetail(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        business: { include: { member: { include: { user: { select: { fullName: true, email: true, phone: true } } } } } },
        _count: { select: { products: true, orders: true } },
      },
    });
    if (!store) throw new NotFoundException('Gian hàng không tồn tại');
    return store;
  }

  async suspendStore(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Gian hàng không tồn tại');
    return this.prisma.store.update({ where: { id }, data: { status: StoreStatus.SUSPENDED } });
  }

  async reactivateStore(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Gian hàng không tồn tại');
    return this.prisma.store.update({ where: { id }, data: { status: StoreStatus.ACTIVE } });
  }

  // ── Kiểm Duyệt Sản Phẩm (Product Moderation) ────────────────────────
  async listProducts(params: { status?: ProductStatus; storeId?: string; search?: string; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: any = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.storeId) where.storeId = params.storeId;
    if (params.search) where.name = { contains: params.search, mode: 'insensitive' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: {
          store: { select: { id: true, name: true, slug: true } },
          inventory: { select: { quantityOnHand: true, reservedQuantity: true } },
          images: { select: { url: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateProductStatus(id: string, status: ProductStatus) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    return this.prisma.product.update({
      where: { id },
      data: { status },
    });
  }

  // ── Phê Duyệt Chi Trả Hoa Hồng (Commission Payouts) ─────────────────
  async listPayouts(params: { status?: PayoutStatus; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: any = {};
    if (params.status) where.status = params.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.commissionPayout.findMany({
        where,
        include: {
          referrer: { include: { user: { select: { fullName: true, email: true, phone: true } } } },
          _count: { select: { transactions: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commissionPayout.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async confirmPayoutPaid(id: string) {
    const payout = await this.prisma.commissionPayout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Đợt chi trả hoa hồng không tồn tại');
    return this.prisma.$transaction([
      this.prisma.commissionPayout.update({
        where: { id },
        data: { status: PayoutStatus.PAID, paidAt: new Date() },
      }),
      this.prisma.commissionTransaction.updateMany({
        where: { payoutId: id },
        data: { status: 'PAID' as any },
      }),
    ]);
  }

  // ── Nhật Ký Thao Tác Hệ Thống (Audit Logs) ─────────────────────────
  async listAuditLogs(params: { page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 30;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        include: { user: { select: { fullName: true, email: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);

    return { items, total, page, pageSize };
  }
}

