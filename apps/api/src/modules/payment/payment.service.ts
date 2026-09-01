import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { MockPaymentGateway } from './gateways/mock-payment.gateway';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly mockGateway: MockPaymentGateway, // Phase 2: chỉ có Mock — xem Mục 11 spec để thêm VNPay/Momo
    private readonly config: ConfigService,
  ) {}

  /** Khởi tạo giao dịch thanh toán — trả về URL redirect (Mục 5.6 spec: POST /payments/{orderId}/init) */
  async initPayment(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.userId !== userId) throw new ForbiddenException('Bạn không có quyền thanh toán đơn hàng này');
    if (order.paymentMethod !== PaymentMethod.ONLINE) {
      throw new BadRequestException('Đơn hàng này không dùng thanh toán online');
    }

    const returnUrl = this.config.get<string>('PAYMENT_RETURN_URL') ?? 'http://localhost:3000/orders';
    const result = await this.mockGateway.initPayment({
      orderId: order.id,
      orderCode: order.orderCode,
      amount: Number(order.totalAmount),
      returnUrl,
    });

    // Tạo/refresh bản ghi Payment ở trạng thái PENDING (idempotent theo orderId — unique constraint)
    const payment = await this.prisma.payment.upsert({
      where: { orderId: order.id },
      update: { status: PaymentStatus.PENDING, gatewayProvider: this.mockGateway.providerName },
      create: {
        orderId: order.id,
        method: PaymentMethod.ONLINE,
        amount: order.totalAmount,
        status: PaymentStatus.PENDING,
        gatewayProvider: this.mockGateway.providerName,
      },
    });

    await this.prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        gatewayTransactionId: result.gatewayTransactionRef,
        amount: order.totalAmount,
        status: PaymentStatus.PENDING,
      },
    });

    return { redirectUrl: result.redirectUrl, gatewayTransactionRef: result.gatewayTransactionRef };
  }

  /**
   * Xử lý webhook từ cổng thanh toán — ĐÂY LÀ ĐIỂM BẮT BUỘC PHẢI IDEMPOTENT
   * (Mục 3.4, 7.2 spec: "mọi endpoint ghi tiền đều idempotent, dùng idempotency
   * key"). Cơ chế: unique constraint trên `payment_transactions.gatewayTransactionId`
   * — nếu webhook gọi lại (retry từ gateway, hoặc bị tấn công replay), lần xử lý
   * thứ 2 sẽ phát hiện transaction đã ở trạng thái final và bỏ qua, KHÔNG cộng
   * tiền / trừ kho 2 lần.
   */
  async handleWebhook(payload: Record<string, any>) {
    const verification = this.mockGateway.verifyWebhook(payload);
    if (!verification.isValid) {
      this.logger.warn('Webhook thanh toán có chữ ký không hợp lệ — có thể là giả mạo, từ chối xử lý');
      throw new BadRequestException('Chữ ký webhook không hợp lệ');
    }

    const { orderId, gatewayTransactionId, success } = verification;

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.findUnique({
        where: { gatewayTransactionId },
        include: { payment: true },
      });
      if (!transaction) {
        throw new NotFoundException('Không tìm thấy giao dịch tương ứng — có thể webhook đã bị giả mạo');
      }

      // ★ Idempotency check: nếu đã xử lý xong (không còn PENDING) thì bỏ qua, KHÔNG xử lý lại
      if (transaction.status !== PaymentStatus.PENDING) {
        this.logger.log(`Webhook trùng lặp cho transaction ${gatewayTransactionId} — bỏ qua (idempotent)`);
        return { alreadyProcessed: true };
      }

      const newStatus = success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;

      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: newStatus, rawPayload: payload },
      });
      await tx.payment.update({
        where: { id: transaction.paymentId },
        data: { status: newStatus },
      });

      return { alreadyProcessed: false, orderId, success };
    }).then(async (result) => {
      // Gọi sang OrdersService NGOÀI transaction Payment (order.paid trigger chuỗi
      // sự kiện riêng — Mục 3.4 spec) — tránh transaction quá dài giữ lock lâu.
      if (!result.alreadyProcessed && orderId) {
        if (result.success) {
          await this.ordersService.markAsPaid(orderId);
        } else {
          await this.ordersService.markPaymentFailed(orderId);
        }
      }
      return result;
    });
  }

  /** Helper cho MockController tự ký payload giả lập (chỉ dùng ở dev/test) */
  buildMockWebhookPayload(orderId: string, gatewayTransactionRef: string, amount: number, result: 'success' | 'fail') {
    const secret = this.config.get<string>('PAYMENT_MOCK_SECRET') ?? '';
    const payload = { orderId, gatewayTransactionRef, amount, result };
    const signature = this.mockGateway.sign(payload, secret);
    return { ...payload, signature };
  }

  getStatus(orderId: string) {
    return this.prisma.payment.findUnique({
      where: { orderId },
      include: { transactions: true },
    });
  }
}
