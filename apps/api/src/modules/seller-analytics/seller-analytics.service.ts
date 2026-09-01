import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

// Các trạng thái được TÍNH LÀ DOANH THU — chỉ tính khi đơn chắc chắn không
// còn khả năng bị huỷ/hoàn (Mục 4.4 spec: nguyên tắc ghi nhận kế toán thận trọng)
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.CONFIRMED,
  OrderStatus.PACKED,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

@Injectable()
export class SellerAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnStoreId(userId: string): Promise<string> {
    const store = await this.prisma.store.findFirst({ where: { business: { member: { userId } } } });
    if (!store) throw new NotFoundException('Bạn chưa có gian hàng');
    return store.id;
  }

  /**
   * Dashboard tổng quan Seller Center (Mục 6 spec Phase 3: "Seller Dashboard").
   * Doanh thu THẬT ở đây chỉ là số liệu vận hành (operational) hiển thị nhanh
   * cho seller — số liệu KẾ TOÁN CHÍNH THỨC (đối soát, ghi sổ) thuộc về module
   * accounting sẽ làm ở Phase 4, không trộn lẫn 2 khái niệm này (Mục 4.4 spec).
   */
  async getOverview(userId: string, from?: Date, to?: Date) {
    const storeId = await this.getOwnStoreId(userId);
    const dateFilter = this.buildDateFilter(from, to);

    const [revenueAgg, orderCountsByStatus, totalOrders, pendingOrders] = await this.prisma.$transaction([
      this.prisma.order.aggregate({
        where: { storeId, status: { in: REVENUE_STATUSES }, deletedAt: null, ...dateFilter },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { storeId, deletedAt: null, ...dateFilter },
        orderBy: { status: 'asc' },
        _count: true,
      }),
      this.prisma.order.count({ where: { storeId, deletedAt: null, ...dateFilter } }),
      this.prisma.order.count({
        where: { storeId, deletedAt: null, status: { in: [OrderStatus.PENDING_CONFIRM, OrderStatus.PAID] } },
      }),
    ]);

    return {
      revenue: Number(revenueAgg._sum.totalAmount ?? 0),
      revenueOrderCount: revenueAgg._count,
      totalOrders,
      pendingOrders, // đơn cần seller xử lý ngay
      ordersByStatus: orderCountsByStatus.map((g) => ({ status: g.status, count: g._count })),
    };
  }

  /** Doanh thu theo thời gian — dùng vẽ biểu đồ trend trên Seller Dashboard */
  async getRevenueTimeSeries(userId: string, from: Date, to: Date, groupBy: 'day' | 'month' = 'day') {
    const storeId = await this.getOwnStoreId(userId);
    const truncUnit = groupBy === 'month' ? 'month' : 'day';

    // Dùng raw SQL cho group-by-date hiệu quả (Prisma groupBy không hỗ trợ
    // truncate theo ngày/tháng trực tiếp trên DateTime — Mục 7.1 spec: tối ưu
    // truy vấn báo cáo).
    return this.prisma.$queryRaw<Array<{ period: Date; revenue: string; order_count: bigint }>>`
      SELECT
        date_trunc(${truncUnit}, created_at) AS period,
        SUM(total_amount) AS revenue,
        COUNT(*) AS order_count
      FROM orders
      WHERE store_id = ${storeId}::uuid
        AND status = ANY(${REVENUE_STATUSES}::"OrderStatus"[])
        AND deleted_at IS NULL
        AND created_at BETWEEN ${from} AND ${to}
      GROUP BY period
      ORDER BY period ASC
    `;
  }

  /** Top sản phẩm bán chạy — dùng cho Seller Dashboard + gợi ý nhập hàng */
  async getTopProducts(userId: string, limit = 5) {
    const storeId = await this.getOwnStoreId(userId);

    const rows = await this.prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: { order: { storeId, status: { in: REVENUE_STATUSES }, deletedAt: null } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    return rows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      quantitySold: r._sum.quantity ?? 0,
      revenue: Number(r._sum.subtotal ?? 0),
    }));
  }

  /** Báo cáo tồn kho — cảnh báo sản phẩm sắp hết hàng (Mục 6 spec: "Kho hàng") */
  async getLowStockProducts(userId: string, threshold = 10) {
    const storeId = await this.getOwnStoreId(userId);
    const products = await this.prisma.product.findMany({
      where: { storeId, deletedAt: null, inventory: { quantityOnHand: { lte: threshold } } },
      include: { inventory: true },
    });
    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      quantityOnHand: p.inventory?.quantityOnHand ?? 0,
      reservedQuantity: p.inventory?.reservedQuantity ?? 0,
    }));
  }

  private buildDateFilter(from?: Date, to?: Date) {
    if (!from && !to) return {};
    return { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } };
  }
}
