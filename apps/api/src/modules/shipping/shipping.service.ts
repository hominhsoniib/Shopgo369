import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingStatus } from '@prisma/client';

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  listMethods() {
    return this.prisma.shippingMethod.findMany({ where: { isActive: true } });
  }

  /**
   * Tính phí vận chuyển — Phase 2: dùng baseFee tĩnh theo phương thức (đơn giản hoá).
   * TODO (Phase 3+): gọi API thật của GHN/GHTK/Viettel Post để tính theo khoảng
   * cách + khối lượng (Mục 4.1 spec: "gọi API đối tác tính phí real-time").
   */
  async calculateFee(shippingMethodId: string): Promise<number> {
    const method = await this.prisma.shippingMethod.findUnique({ where: { id: shippingMethodId } });
    if (!method) throw new NotFoundException('Phương thức vận chuyển không tồn tại');
    return Number(method.baseFee);
  }

  /** Tạo shipping order khi Order được tạo (Mục 5.3 spec: shipping_orders) */
  async createShippingOrder(orderId: string, shippingMethodId: string) {
    const method = await this.prisma.shippingMethod.findUniqueOrThrow({ where: { id: shippingMethodId } });
    return this.prisma.shippingOrder.create({
      data: {
        orderId,
        carrierName: method.name, // Phase 2: dùng luôn tên phương thức làm carrier giả lập
        status: ShippingStatus.PENDING,
      },
    });
  }

  /** Seller cập nhật trạng thái giao hàng — ghi vào shipping_tracking (Mục 4.1 spec)
   *  Enforce ownership: chỉ seller sở hữu store của đơn hàng mới được cập nhật (Mục 7.2 spec) */
  async updateTrackingStatus(orderId: string, userId: string, status: ShippingStatus, note?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { include: { business: { include: { member: true } } } } },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.store.business.member.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật đơn hàng này');
    }

    const shippingOrder = await this.prisma.shippingOrder.findUnique({ where: { orderId } });
    if (!shippingOrder) throw new NotFoundException('Đơn hàng chưa có thông tin vận chuyển');

    return this.prisma.$transaction([
      this.prisma.shippingOrder.update({
        where: { id: shippingOrder.id },
        data: { status, trackingCode: shippingOrder.trackingCode ?? this.generateTrackingCode() },
      }),
      this.prisma.shippingTracking.create({
        data: { shippingOrderId: shippingOrder.id, status, note },
      }),
    ]);
  }

  getByOrderId(orderId: string) {
    return this.prisma.shippingOrder.findUnique({
      where: { orderId },
      include: { tracking: { orderBy: { createdAt: 'asc' } } },
    });
  }

  private generateTrackingCode(): string {
    return `369SHIP${Date.now().toString().slice(-8)}`;
  }
}
