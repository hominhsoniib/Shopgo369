import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { AccountingService } from '../accounting/accounting.service';
import { InventoryService } from '../inventory/inventory.service';

/**
 * Refund API (bổ sung sau Phase 2) — cho phép khách hàng yêu cầu hoàn tiền
 * cho đơn ĐÃ THANH TOÁN ONLINE THÀNH CÔNG, seller/admin duyệt hoặc từ chối.
 *
 * PHẠM VI CÓ CHỦ ĐÍCH — CHỈ 1 REFUND / ĐƠN HÀNG:
 * `ExpenseTransaction` (bảng kế toán) có ràng buộc DB `@@unique([orderId,
 * category])`, nghĩa là chỉ ghi được 1 bút toán REFUND cho mỗi đơn. Thay vì
 * sửa schema bảng kế toán đã triển khai (rủi ro cao, ảnh hưởng dữ liệu cũ),
 * Refund API giới hạn: mỗi đơn hàng chỉ có TỐI ĐA 1 refund (seller có thể
 * duyệt refund TOÀN PHẦN hoặc MỘT PHẦN tuỳ số tiền khách yêu cầu, nhưng
 * không được tạo refund thứ 2 cho cùng đơn). Đây là giới hạn hợp lý cho MVP;
 * nếu sau này cần hỗ trợ nhiều lượt hoàn tiền/đơn, cần migration riêng thêm
 * cột `refundId` vào ExpenseTransaction và đổi lại unique constraint.
 *
 * TÁI SỬ DỤNG PaymentStatus cho Refund.status (đã định nghĩa sẵn trong schema
 * gốc, không phải do bổ sung này tạo ra):
 *   PENDING  → khách vừa yêu cầu, chờ seller/admin xử lý
 *   SUCCESS  → đã duyệt, tiền đã hoàn (qua mock gateway ở Phase này)
 *   FAILED   → bị TỪ CHỐI bởi seller/admin (không phải lỗi kỹ thuật)
 */
@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly accountingService: AccountingService,
    private readonly inventoryService: InventoryService,
  ) {}

  /** Khách hàng yêu cầu hoàn tiền cho đơn của chính mình */
  async createRefund(userId: string, orderId: string, amount: number | undefined, reason: string) {
    if (!reason?.trim()) {
      throw new BadRequestException('Vui lòng nêu lý do hoàn tiền');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền yêu cầu hoàn tiền cho đơn hàng này');
    }
    if (!order.payment || order.payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(
        'Chỉ có thể yêu cầu hoàn tiền cho đơn đã thanh toán online thành công',
      );
    }

    const existing = await this.prisma.refund.findFirst({ where: { paymentId: order.payment.id } });
    if (existing) {
      throw new BadRequestException(
        `Đơn hàng này đã có yêu cầu hoàn tiền (trạng thái: ${existing.status}) — mỗi đơn chỉ được yêu cầu 1 lần`,
      );
    }

    const refundAmount = amount ?? Number(order.payment.amount);
    if (refundAmount <= 0) {
      throw new BadRequestException('Số tiền hoàn phải lớn hơn 0');
    }
    if (refundAmount > Number(order.payment.amount)) {
      throw new BadRequestException('Số tiền hoàn không được vượt quá số tiền đã thanh toán');
    }

    return this.prisma.refund.create({
      data: {
        paymentId: order.payment.id,
        amount: refundAmount,
        reason,
        status: PaymentStatus.PENDING,
      },
    });
  }

  /** Kiểm tra actor có quyền xử lý refund của đơn này không (chủ store hoặc admin) */
  private async assertCanProcess(actorUserId: string, actorRoles: RoleName[], orderId: string) {
    const isAdmin = actorRoles.some((r) => r === RoleName.ADMIN || r === RoleName.SUPER_ADMIN);
    if (isAdmin) return;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { include: { business: { include: { member: true } } } } },
    });
    if (!order || order.store.business.member.userId !== actorUserId) {
      throw new ForbiddenException('Bạn không có quyền xử lý yêu cầu hoàn tiền này');
    }
  }

  private async getRefundWithOrder(refundId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: { include: { order: true } } },
    });
    if (!refund) throw new NotFoundException('Yêu cầu hoàn tiền không tồn tại');
    return refund;
  }

  /**
   * Duyệt hoàn tiền — dùng $executeRaw với điều kiện WHERE status = 'PENDING'
   * trong CÙNG 1 câu UPDATE (giống pattern PromotionsService.incrementUsageAtomic
   * trong codebase này) để chống race condition nếu 2 admin cùng duyệt 1 refund
   * đồng thời — chỉ đúng 1 request thắng, request kia nhận affectedRows=0.
   */
  async approveRefund(actorUserId: string, actorRoles: RoleName[], refundId: string) {
    const refund = await this.getRefundWithOrder(refundId);
    const order = refund.payment.order;

    await this.assertCanProcess(actorUserId, actorRoles, order.id);

    const affectedRows = await this.prisma.$executeRaw`
      UPDATE refunds SET status = 'SUCCESS' WHERE id = ${refundId}::uuid AND status = 'PENDING'
    `;
    if (affectedRows === 0) {
      throw new BadRequestException(
        'Yêu cầu hoàn tiền không còn ở trạng thái PENDING (đã được xử lý trước đó)',
      );
    }

    const isFullRefund = Number(refund.amount) >= Number(refund.payment.amount);

    await this.accountingService.recordRefund(order.id, Number(refund.amount), refund.reason ?? 'Hoàn tiền');

    if (isFullRefund) {
      await this.prisma.payment.update({
        where: { id: refund.payment.id },
        data: { status: PaymentStatus.REFUNDED },
      });
      await this.ordersService.markRefunded(order.id, `Hoàn tiền toàn phần — ${refund.reason ?? ''}`.trim());
      await this.inventoryService.restockFromRefund(order.id);
    }

    return this.prisma.refund.findUniqueOrThrow({ where: { id: refundId } });
  }

  /**
   * Từ chối yêu cầu hoàn tiền (dùng lại PaymentStatus.FAILED để biểu thị
   * "bị từ chối"). GIỚI HẠN ĐÃ BIẾT: model Refund hiện KHÔNG có cột riêng để
   * lưu lý do từ chối của seller/admin (chỉ có `reason` — lý do gốc của
   * khách khi yêu cầu) — tránh phải thêm cột/migration cho model đã tồn tại
   * sẵn trong schema. `rejectReason` hiện chỉ dùng để validate bắt buộc phải
   * nhập lý do (UX), CHƯA được lưu vào DB. Nếu cần lưu vĩnh viễn, thêm cột
   * `rejectReason String?` vào model Refund + migration riêng.
   */
  async rejectRefund(actorUserId: string, actorRoles: RoleName[], refundId: string, rejectReason: string) {
    const refund = await this.getRefundWithOrder(refundId);
    const order = refund.payment.order;

    await this.assertCanProcess(actorUserId, actorRoles, order.id);

    const affectedRows = await this.prisma.$executeRaw`
      UPDATE refunds SET status = 'FAILED' WHERE id = ${refundId}::uuid AND status = 'PENDING'
    `;
    if (affectedRows === 0) {
      throw new BadRequestException(
        'Yêu cầu hoàn tiền không còn ở trạng thái PENDING (đã được xử lý trước đó)',
      );
    }

    return this.prisma.refund.findUniqueOrThrow({ where: { id: refundId } });
  }

  /** Xem refund của 1 đơn — khách hàng chủ đơn hoặc seller/admin đều xem được */
  async getForOrder(actorUserId: string, actorRoles: RoleName[], orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, store: { include: { business: { include: { member: true } } } } },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const isOwner = order.userId === actorUserId;
    const isAdmin = actorRoles.some((r) => r === RoleName.ADMIN || r === RoleName.SUPER_ADMIN);
    const isStoreOwner = order.store.business.member.userId === actorUserId;
    if (!isOwner && !isAdmin && !isStoreOwner) {
      throw new ForbiddenException('Bạn không có quyền xem yêu cầu hoàn tiền của đơn hàng này');
    }

    if (!order.payment) return null;
    return this.prisma.refund.findFirst({ where: { paymentId: order.payment.id } });
  }
}
