import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { ShippingService } from '../shipping/shipping.service';
import { CartService } from '../cart/cart.service';
import { QueueService } from '../queue/queue.service';
import { PromotionsService } from '../promotions/promotions.service';
import { AccountingService } from '../accounting/accounting.service';
import { CommissionService } from '../commission/commission.service';
import { PointsService } from '../points/points.service';
import { CheckoutDto } from './dto/checkout.dto';

const ORDER_PAYMENT_TIMEOUT_MINUTES = parseInt(
  process.env.ORDER_PAYMENT_TIMEOUT_MINUTES ?? '15',
  10,
);

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly shippingService: ShippingService,
    private readonly cartService: CartService,
    private readonly queueService: QueueService,
    private readonly promotionsService: PromotionsService,
    private readonly accountingService: AccountingService,
    private readonly commissionService: CommissionService,
    private readonly pointsService: PointsService,
  ) {}

  /**
   * CHECKOUT — luồng trung tâm của Phase 2 (Mục 4.1 spec).
   *
   * Vì giỏ hàng có thể chứa sản phẩm từ NHIỀU gian hàng khác nhau, checkout
   * TÁCH thành nhiều Order riêng biệt — mỗi Order thuộc đúng 1 Store (giống
   * cách Shopee tách đơn theo shop khi thanh toán).
   *
   * Với mỗi Order con:
   *  1. Tạo Order + OrderItems (snapshot giá tại thời điểm đặt hàng)
   *  2. Gọi InventoryService.reserveStock cho từng item (Redis lock chống oversell)
   *     → nếu bất kỳ item nào hết hàng: rollback (huỷ order vừa tạo, release
   *       các reservation đã giữ được của order đó) rồi báo lỗi rõ ràng
   *  3. Tạo OrderAddress (snapshot địa chỉ), ShippingOrder
   *  4. COD: chốt trừ kho ngay (không có bước thanh toán online để chờ)
   *     ONLINE: giữ nguyên trạng thái RESERVE, lên lịch job tự huỷ sau 15 phút
   *     nếu không thanh toán (Mục 4.1 spec)
   */
  async checkout(userId: string, dto: CheckoutDto) {
    const cart = await this.cartService.getCart({ userId });
    if (cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng đang trống');
    }

    const shippingFeePerOrder = await this.shippingService.calculateFee(dto.shippingMethodId);

    // Tách item theo storeId
    const itemsByStore = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const storeId = item.product.storeId;
      if (!itemsByStore.has(storeId)) itemsByStore.set(storeId, []);
      itemsByStore.get(storeId)!.push(item);
    }

    const createdOrders = [];
    for (const [, storeItems] of itemsByStore) {
      const order = await this.createOrderForStore(userId, storeItems, dto, shippingFeePerOrder);
      createdOrders.push(order);
    }

    // Xoá các sản phẩm đã đặt khỏi giỏ hàng (Mục 4.1 spec)
    const orderedProductIds = cart.items.map((i) => i.productId);
    await this.cartService.clearCart({ userId }, orderedProductIds);

    return createdOrders;
  }

  private async createOrderForStore(
    userId: string,
    items: Array<{ productId: string; quantity: number; product: { basePrice: any; name: string } }>,
    dto: CheckoutDto,
    shippingFee: number,
  ) {
    const storeId = (items[0] as any).product.storeId;
    const subtotal = items.reduce((sum, i) => sum + Number(i.product.basePrice) * i.quantity, 0);

    // ── Phase 3: áp mã khuyến mãi (nếu có) ──────────────────────────────
    let discountAmount = 0;
    let promotionId: string | undefined;
    if (dto.promoCode) {
      const { promotion, discountAmount: computed } = await this.promotionsService.validatePromotion(
        storeId,
        dto.promoCode,
        subtotal,
      );
      discountAmount = computed;
      promotionId = promotion.id;
    }

    const totalAmount = subtotal + shippingFee - discountAmount;
    const orderCode = await this.generateOrderCode();

    const initialStatus =
      dto.paymentMethod === PaymentMethod.COD ? OrderStatus.PENDING_CONFIRM : OrderStatus.PENDING_PAYMENT;
    const paymentDueAt =
      dto.paymentMethod === PaymentMethod.ONLINE
        ? new Date(Date.now() + ORDER_PAYMENT_TIMEOUT_MINUTES * 60 * 1000)
        : null;

    // Bước 1: tạo Order + OrderItems + OrderAddress + status history (1 DB transaction)
    // ĐỒNG THỜI tăng usedCount của promotion ATOMIC trong CÙNG transaction —
    // nếu mã vừa hết lượt (race condition), toàn bộ transaction rollback tự động.
    const order = await this.prisma.$transaction(async (tx) => {
      if (promotionId) {
        const ok = await this.promotionsService.incrementUsageAtomic(tx, promotionId);
        if (!ok) {
          throw new BadRequestException('Mã khuyến mãi vừa hết lượt sử dụng, vui lòng thử lại không dùng mã');
        }
      }

      const created = await tx.order.create({
        data: {
          orderCode,
          userId,
          storeId,
          status: initialStatus,
          paymentMethod: dto.paymentMethod,
          subtotal,
          shippingFee,
          discountAmount,
          promotionId,
          totalAmount,
          note: dto.note,
          paymentDueAt,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              productName: i.product.name,
              unitPrice: i.product.basePrice,
              quantity: i.quantity,
              subtotal: Number(i.product.basePrice) * i.quantity,
            })),
          },
          address: { create: dto.address },
        },
      });

      if (promotionId) {
        await tx.promotionUsage.create({
          data: { promotionId, orderId: created.id, userId, discountAmount },
        });
      }

      await tx.orderStatusHistory.create({
        data: { orderId: created.id, toStatus: initialStatus, createdBy: userId, note: 'Đơn hàng được tạo' },
      });

      return created;
    });

    // Bước 2: reserve kho cho từng item — NGOÀI transaction ở trên vì cần Redis
    // lock riêng theo từng productId (Mục 3.1, 4.1 spec). Nếu lỗi -> compensate.
    try {
      for (const item of items) {
        await this.inventoryService.reserveStock(item.productId, order.id, item.quantity);
      }
    } catch (err) {
      this.logger.warn(`Checkout thất bại do hết hàng — huỷ order ${order.orderCode}: ${(err as Error).message}`);
      await this.inventoryService.releaseReservation(order.id); // release phần đã lỡ giữ được (nếu có)
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: initialStatus,
          toStatus: OrderStatus.CANCELLED,
          note: `Tự động huỷ: ${(err as Error).message}`,
        },
      });
      throw err;
    }

    // Bước 3: tạo shipping order
    await this.shippingService.createShippingOrder(order.id, dto.shippingMethodId);

    // Bước 4a: COD — không có bước chờ thanh toán online, chốt trừ kho ngay
    if (dto.paymentMethod === PaymentMethod.COD) {
      await this.inventoryService.commitReservation(order.id);
      await this.prisma.payment.create({
        data: { orderId: order.id, method: PaymentMethod.COD, amount: totalAmount, status: PaymentStatus.PENDING },
      });
      // COD không có webhook "order.paid" từ payment gateway — ghi kế toán
      // ngay tại thời điểm chốt kho (Mục 4.4 spec: event chain order.paid).
      await this.accountingService.recordOrderPaid(order.id);
      await this.commissionService.recordCommissionForOrder(order.id); // Mục 4.3 spec
    } else {
      // Bước 4b: ONLINE — lên lịch job tự huỷ sau 15 phút nếu chưa thanh toán (Mục 4.1 spec)
      await this.queueService.scheduleOrderTimeout(order.id, ORDER_PAYMENT_TIMEOUT_MINUTES * 60 * 1000);
    }

    return this.getById(order.id, userId);
  }

  async getById(orderId: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        address: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payment: true,
        shippingOrder: { include: { tracking: true } },
        store: true,
      },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (userId && order.userId !== userId) {
      // Cho phép seller của store xem — kiểm tra thêm ở seller endpoint riêng
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
    }
    return order;
  }

  listMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId, deletedAt: null },
      include: { items: true, store: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Seller xem đơn của gian hàng mình — enforce ownership ở query layer (Mục 7.2 spec) */
  async listStoreOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { store: { business: { member: { userId } } }, deletedAt: null },
      include: { items: true, address: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Seller xác nhận xử lý đơn COD hoặc đơn đã PAID */
  async confirmOrder(userId: string, orderId: string) {
    const order = await this.assertSellerOwnership(userId, orderId);
    if (!([OrderStatus.PENDING_CONFIRM, OrderStatus.PAID] as OrderStatus[]).includes(order.status)) {
      throw new BadRequestException(`Không thể xác nhận đơn ở trạng thái ${order.status}`);
    }
    return this.transitionStatus(order.id, OrderStatus.CONFIRMED, userId, 'Seller xác nhận xử lý đơn');
  }

  async markPacked(userId: string, orderId: string) {
    const order = await this.assertSellerOwnership(userId, orderId);
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Đơn phải ở trạng thái CONFIRMED trước khi đóng gói');
    }
    return this.transitionStatus(order.id, OrderStatus.PACKED, userId, 'Đã đóng gói');
  }

  async markShipping(userId: string, orderId: string) {
    const order = await this.assertSellerOwnership(userId, orderId);
    if (order.status !== OrderStatus.PACKED) {
      throw new BadRequestException('Đơn phải ở trạng thái PACKED trước khi giao vận chuyển');
    }
    await this.shippingService.updateTrackingStatus(orderId, userId, 'PICKED_UP', 'Đã bàn giao vận chuyển');
    return this.transitionStatus(order.id, OrderStatus.SHIPPING, userId, 'Đang giao hàng');
  }

  /** Khách xác nhận đã nhận hàng — mở đường cho đánh giá/điểm ở Phase 5 (Mục 4.1 spec) */
  async confirmReceived(userId: string, orderId: string) {
    const order = await this.getById(orderId, userId);
    if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException(`Không thể xác nhận nhận hàng ở trạng thái ${order.status}`);
    }
    const result = await this.transitionStatus(order.id, OrderStatus.COMPLETED, userId, 'Khách xác nhận đã nhận hàng');
    await this.pointsService.awardPointsForOrder(order.id); // Mục 4.1 spec: "HOÀN TẤT → cộng điểm tích lũy"
    return result;
  }

  /** Khách huỷ đơn — chỉ cho phép khi CHƯA xử lý (Mục 4.1 spec) */
  async cancelByCustomer(userId: string, orderId: string) {
    const order = await this.getById(orderId, userId);
    if (!([OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING_CONFIRM] as OrderStatus[]).includes(order.status)) {
      throw new BadRequestException('Đơn đã được xử lý, không thể tự huỷ — vui lòng liên hệ người bán');
    }
    await this.inventoryService.releaseReservation(order.id);
    return this.transitionStatus(order.id, OrderStatus.CANCELLED, userId, 'Khách huỷ đơn');
  }

  /**
   * Dùng bởi QueueProcessor khi job timeout 15 phút kích hoạt — nếu đơn vẫn
   * PENDING_PAYMENT thì tự động huỷ + release kho (Mục 4.1 spec).
   */
  async cancelDueToTimeout(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== OrderStatus.PENDING_PAYMENT) {
      return; // đã thanh toán hoặc đã xử lý — không làm gì
    }
    await this.inventoryService.releaseReservation(orderId);
    await this.transitionStatus(orderId, OrderStatus.CANCELLED, undefined, 'Tự động huỷ do quá hạn thanh toán 15 phút');
    this.logger.log(`Order ${order.orderCode} tự động huỷ do timeout thanh toán`);
  }

  /**
   * Dùng bởi PaymentService khi webhook báo thanh toán thành công
   * (Mục 3.4 spec: event order.paid → chốt kho + cập nhật trạng thái + ghi kế toán).
   */
  async markAsPaid(orderId: string) {
    await this.inventoryService.commitReservation(orderId);
    await this.transitionStatus(orderId, OrderStatus.PAID, undefined, 'Thanh toán online thành công');
    await this.accountingService.recordOrderPaid(orderId); // Mục 4.4 spec — ghi kế toán tự động
    await this.commissionService.recordCommissionForOrder(orderId); // Mục 4.3 spec — ghi hoa hồng
  }

  /**
   * Dùng bởi RefundService khi refund toàn phần được duyệt — chuyển đơn sang
   * REFUNDED (Mục OrderStatus đã định nghĩa sẵn trạng thái này). Chỉ gọi cho
   * hoàn tiền TOÀN PHẦN; hoàn tiền một phần không đổi trạng thái tổng của đơn.
   */
  async markRefunded(orderId: string, note: string) {
    await this.transitionStatus(orderId, OrderStatus.REFUNDED, undefined, note);
  }

  async markPaymentFailed(orderId: string) {
    await this.inventoryService.releaseReservation(orderId);
    await this.transitionStatus(orderId, OrderStatus.PAYMENT_FAILED, undefined, 'Thanh toán thất bại');
  }

  private async transitionStatus(orderId: string, toStatus: OrderStatus, userId: string | undefined, note: string) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id: orderId }, data: { status: toStatus } });
      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: order.status, toStatus, createdBy: userId, note },
      });
      return updated;
    });
  }

  private async assertSellerOwnership(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { include: { business: { include: { member: true } } } } },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.store.business.member.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xử lý đơn hàng này');
    }
    return order;
  }

  private async generateOrderCode(): Promise<string> {
    const count = await this.prisma.order.count();
    return `ORD-${String(count + 1).padStart(6, '0')}`;
  }
}
