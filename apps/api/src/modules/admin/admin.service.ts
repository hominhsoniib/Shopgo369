import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessStatus, MemberStatus, StoreStatus } from '@prisma/client';

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

  // ── Quản lý gian hàng (Mục 5.4 spec: /admin/stores) ──────────────────
  // Admin là "nhà quản trị tổng thể" — cần toàn quyền xem/khoá/mở lại BẤT KỲ
  // gian hàng nào, không giới hạn theo business/member sở hữu (khác Seller
  // chỉ thấy được store của chính mình — Mục 7.2 spec).

  /** Danh sách toàn bộ gian hàng — lọc theo trạng thái/tìm kiếm, có phân trang */
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

  /** Chi tiết 1 gian hàng — đủ thông tin cho admin ra quyết định khoá/mở */
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

  /**
   * Khoá gian hàng — tự động ẩn toàn bộ sản phẩm khỏi trang công khai + chặn
   * thêm giỏ hàng + chặn checkout (đã enforce ở CatalogService, CartService,
   * OrdersService). KHÔNG huỷ đơn hàng đang xử lý — seller vẫn phải hoàn tất
   * nghĩa vụ giao hàng cho đơn đã đặt trước khi bị khoá.
   */
  async suspendStore(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Gian hàng không tồn tại');
    return this.prisma.store.update({ where: { id }, data: { status: StoreStatus.SUSPENDED } });
  }

  /** Mở lại gian hàng đã bị khoá */
  async reactivateStore(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Gian hàng không tồn tại');
    return this.prisma.store.update({ where: { id }, data: { status: StoreStatus.ACTIVE } });
  }
}
