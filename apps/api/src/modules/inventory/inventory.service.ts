import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DistributedLockService } from '../redis/lock.service';
import { ReservationStatus } from '@prisma/client';

const RESERVATION_TTL_MINUTES = 15; // Mục 4.1 spec: giữ kho 15 phút chờ thanh toán

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: DistributedLockService,
  ) {}

  /**
   * Giữ kho (reserve) cho 1 sản phẩm khi checkout — ĐÂY LÀ ĐIỂM CHỐNG OVERSELL
   * CỐT LÕI (Mục 3.1 nguyên tắc #3, Mục 4.1 spec):
   *
   * 1. Giành Redis lock theo productId (serialize mọi request cùng sản phẩm)
   * 2. Trong lock: kiểm tra tồn kho khả dụng = quantityOnHand - reservedQuantity
   * 3. Nếu đủ: tăng reservedQuantity + tạo bản ghi InventoryReservation (TTL 15')
   * 4. Release lock
   *
   * Toàn bộ bước 2-3 chạy trong 1 DB transaction để đảm bảo tính nhất quán.
   */
  async reserveStock(productId: string, orderId: string, quantity: number): Promise<void> {
    const lockKey = `lock:inventory:${productId}`;

    await this.lockService.runExclusive(lockKey, async () => {
      await this.prisma.$transaction(async (tx) => {
        const inventory = await tx.productInventory.findUnique({ where: { productId } });
        if (!inventory) {
          throw new BadRequestException('Sản phẩm chưa được thiết lập kho');
        }

        const available = inventory.quantityOnHand - inventory.reservedQuantity;
        if (available < quantity) {
          throw new BadRequestException(
            `Sản phẩm không đủ hàng (còn ${available}, yêu cầu ${quantity})`,
          );
        }

        await tx.productInventory.update({
          where: { productId },
          data: { reservedQuantity: { increment: quantity } },
        });

        await tx.inventoryReservation.create({
          data: {
            productId,
            orderId,
            quantity,
            status: ReservationStatus.ACTIVE,
            expiresAt: new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000),
          },
        });
      });
    });
  }

  /**
   * Chốt trừ kho VĨNH VIỄN khi đơn được xác nhận thanh toán/COD confirmed
   * (Mục 3.4 spec — event order.paid → "chốt trừ kho vĩnh viễn, release lock").
   */
  async commitReservation(orderId: string): Promise<void> {
    const reservations = await this.prisma.inventoryReservation.findMany({
      where: { orderId, status: ReservationStatus.ACTIVE },
    });

    for (const reservation of reservations) {
      const lockKey = `lock:inventory:${reservation.productId}`;
      await this.lockService.runExclusive(lockKey, async () => {
        await this.prisma.$transaction([
          this.prisma.productInventory.update({
            where: { productId: reservation.productId },
            data: {
              quantityOnHand: { decrement: reservation.quantity }, // trừ vĩnh viễn
              reservedQuantity: { decrement: reservation.quantity }, // bỏ giữ chỗ
            },
          }),
          this.prisma.inventoryReservation.update({
            where: { id: reservation.id },
            data: { status: ReservationStatus.COMMITTED },
          }),
        ]);
      });
    }
  }

  /**
   * Giải phóng kho đã giữ (khi huỷ đơn / thanh toán thất bại / hết hạn 15 phút)
   * — Mục 4.1 spec: "Timeout 15 phút không thanh toán → job tự động huỷ đơn +
   * release kho".
   */
  async releaseReservation(orderId: string): Promise<void> {
    const reservations = await this.prisma.inventoryReservation.findMany({
      where: { orderId, status: ReservationStatus.ACTIVE },
    });

    for (const reservation of reservations) {
      const lockKey = `lock:inventory:${reservation.productId}`;
      await this.lockService.runExclusive(lockKey, async () => {
        await this.prisma.$transaction([
          this.prisma.productInventory.update({
            where: { productId: reservation.productId },
            data: { reservedQuantity: { decrement: reservation.quantity } },
          }),
          this.prisma.inventoryReservation.update({
            where: { id: reservation.id },
            data: { status: ReservationStatus.RELEASED },
          }),
        ]);
      });
    }
  }

  /**
   * Nhập lại kho khi đơn hàng được HOÀN TIỀN TOÀN PHẦN (Refund API — bổ sung
   * sau Phase 2). Đơn đã ở trạng thái COMMITTED (đã trừ vĩnh viễn quantityOnHand
   * lúc thanh toán thành công), nên hoàn tiền toàn phần đồng nghĩa hàng được
   * trả lại kho. Dùng cùng cơ chế Redis lock theo productId như các thao tác
   * kho khác — tránh race condition nếu vừa lúc có request khác đang giữ/trừ
   * kho đúng sản phẩm này.
   *
   * KHÔNG dùng cho hoàn tiền MỘT PHẦN (partial refund) — trường hợp đó không
   * chắc chắn khách đã trả lại hàng vật lý, nên KHÔNG tự động nhập kho; seller
   * cần tự điều chỉnh qua adjustStock() nếu thực tế có nhận lại hàng.
   */
  async restockFromRefund(orderId: string): Promise<void> {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId },
      select: { productId: true, quantity: true },
    });

    for (const item of items) {
      const lockKey = `lock:inventory:${item.productId}`;
      await this.lockService.runExclusive(lockKey, async () => {
        await this.prisma.productInventory.upsert({
          where: { productId: item.productId },
          update: { quantityOnHand: { increment: item.quantity } },
          create: { productId: item.productId, quantityOnHand: item.quantity, reservedQuantity: 0 },
        });
      });
    }

    if (items.length > 0) {
      this.logger.log(`Đã nhập lại kho cho ${items.length} sản phẩm của đơn hoàn tiền toàn phần ${orderId}`);
    }
  }

  /** Dùng cho cron/queue dọn các reservation đã hết hạn nhưng chưa được release (an toàn 2 lớp) */
  async releaseExpiredReservations(): Promise<number> {
    const expired = await this.prisma.inventoryReservation.findMany({
      where: { status: ReservationStatus.ACTIVE, expiresAt: { lt: new Date() } },
    });

    for (const reservation of expired) {
      await this.releaseReservation(reservation.orderId);
    }

    if (expired.length > 0) {
      this.logger.log(`Đã giải phóng ${expired.length} reservation hết hạn`);
    }
    return expired.length;
  }

  /**
   * Seller điều chỉnh tồn kho thủ công (nhập thêm hàng / kiểm kê lại) —
   * Mục 6 spec Phase 3: "Kho hàng" trong Seller Center. Vẫn phải qua Redis
   * lock vì có thể xảy ra đồng thời với 1 khách đang checkout sản phẩm này.
   */
  async adjustStock(userId: string, productId: string, newQuantityOnHand: number) {
    if (newQuantityOnHand < 0) {
      throw new BadRequestException('Số lượng tồn kho không được âm');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: { include: { business: { include: { member: true } } } }, inventory: true },
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    if (product.store.business.member.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa kho của sản phẩm này');
    }

    const lockKey = `lock:inventory:${productId}`;
    return this.lockService.runExclusive(lockKey, async () => {
      const reserved = product.inventory?.reservedQuantity ?? 0;
      if (newQuantityOnHand < reserved) {
        throw new BadRequestException(
          `Không thể đặt tồn kho thấp hơn số lượng đang giữ chỗ cho đơn chưa xử lý (${reserved})`,
        );
      }
      return this.prisma.productInventory.upsert({
        where: { productId },
        update: { quantityOnHand: newQuantityOnHand },
        create: { productId, quantityOnHand: newQuantityOnHand },
      });
    });
  }

  /** Danh sách tồn kho toàn bộ sản phẩm của seller — Mục 6 spec */
  async listOwnInventory(userId: string) {
    return this.prisma.product.findMany({
      where: { store: { business: { member: { userId } } }, deletedAt: null },
      select: { id: true, name: true, slug: true, inventory: true },
      orderBy: { name: 'asc' },
    });
  }
}
