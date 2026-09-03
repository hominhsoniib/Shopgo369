import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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
  async getUnattachedMembers() {
    return this.prisma.member.findMany({
      where: {
        business: null,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBusinessByAdmin(dto: {
    memberId: string;
    businessName: string;
    taxCode?: string;
    ownerIdCard: string;
    address: string;
    status?: BusinessStatus;
  }) {
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
      include: { business: true },
    });

    if (!member) throw new NotFoundException('Thành viên không tồn tại');
    if (member.business) throw new ConflictException('Thành viên này đã đăng ký Hộ kinh doanh');

    return this.prisma.business.create({
      data: {
        memberId: dto.memberId,
        businessName: dto.businessName.trim(),
        taxCode: dto.taxCode ? dto.taxCode.trim() : null,
        ownerIdCard: dto.ownerIdCard.trim(),
        address: dto.address.trim(),
        status: dto.status || BusinessStatus.VERIFIED,
      },
      include: {
        member: { include: { user: { select: { fullName: true, email: true, phone: true } } } },
        store: { select: { id: true, name: true, slug: true, status: true } },
      },
    });
  }

  async updateBusinessByAdmin(
    id: string,
    dto: {
      businessName?: string;
      taxCode?: string;
      ownerIdCard?: string;
      address?: string;
      status?: BusinessStatus;
    },
  ) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Hộ kinh doanh không tồn tại');

    return this.prisma.business.update({
      where: { id },
      data: {
        ...(dto.businessName ? { businessName: dto.businessName.trim() } : {}),
        ...(dto.taxCode !== undefined ? { taxCode: dto.taxCode ? dto.taxCode.trim() : null } : {}),
        ...(dto.ownerIdCard ? { ownerIdCard: dto.ownerIdCard.trim() } : {}),
        ...(dto.address ? { address: dto.address.trim() } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: {
        member: { include: { user: { select: { fullName: true, email: true, phone: true } } } },
        store: { select: { id: true, name: true, slug: true, status: true } },
      },
    });
  }

  async deleteBusinessByAdmin(id: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Hộ kinh doanh không tồn tại');

    return this.prisma.business.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: BusinessStatus.REJECTED,
      },
    });
  }

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
  async getUnattachedBusinesses() {
    return this.prisma.business.findMany({
      where: {
        status: BusinessStatus.VERIFIED,
        store: null,
      },
      include: {
        member: {
          include: {
            user: { select: { fullName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStoreByAdmin(dto: {
    businessId: string;
    name: string;
    slug?: string;
    description?: string;
    status?: StoreStatus;
  }) {
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
      include: { store: true },
    });

    if (!business) {
      throw new NotFoundException('Hộ kinh doanh không tồn tại');
    }
    if (business.store) {
      throw new ConflictException('Hộ kinh doanh này đã sở hữu một gian hàng khác');
    }

    let baseSlug = dto.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!baseSlug) baseSlug = 'store';

    let slug = baseSlug;
    const existingSlug = await this.prisma.store.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return this.prisma.store.create({
      data: {
        businessId: dto.businessId,
        name: dto.name,
        slug,
        description: dto.description || null,
        status: dto.status || StoreStatus.ACTIVE,
      },
      include: {
        business: { include: { member: { include: { user: { select: { fullName: true, email: true } } } } } },
        _count: { select: { products: true, orders: true } },
      },
    });
  }

  async updateStoreByAdmin(
    id: string,
    dto: {
      name?: string;
      slug?: string;
      description?: string;
      status?: StoreStatus;
    },
  ) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Gian hàng không tồn tại');

    // Mã / Slug gian hàng là cố định do hệ thống tự động phát sinh, không cho phép sửa
    return this.prisma.store.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: {
        business: { include: { member: { include: { user: { select: { fullName: true, email: true } } } } } },
        _count: { select: { products: true, orders: true } },
      },
    });
  }

  async deleteStoreByAdmin(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Gian hàng không tồn tại');

    return this.prisma.store.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: StoreStatus.INACTIVE,
      },
    });
  }

  async listStores(params: { status?: StoreStatus; search?: string; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: any = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { slug: { contains: params.search, mode: 'insensitive' } },
      ];
    }

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
  async createProductByAdmin(dto: {
    storeId: string;
    name: string;
    description?: string;
    basePrice: number;
    initialQuantity?: number;
    imageUrls?: string[];
  }) {
    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store) throw new NotFoundException('Gian hàng không tồn tại');

    let slug = dto.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existingSlug = await this.prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return this.prisma.product.create({
      data: {
        storeId: dto.storeId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        basePrice: dto.basePrice,
        slug,
        status: ProductStatus.ACTIVE,
        images: dto.imageUrls && dto.imageUrls.length > 0
          ? { create: dto.imageUrls.map((url, index) => ({ url, sortOrder: index })) }
          : undefined,
        inventory: { create: { quantityOnHand: dto.initialQuantity ?? 50 } },
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            business: { select: { id: true, businessName: true } },
          },
        },
        inventory: { select: { quantityOnHand: true, reservedQuantity: true } },
        images: { select: { url: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }

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
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              business: { select: { id: true, businessName: true } },
            },
          },
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

