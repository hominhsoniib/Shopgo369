import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
import {
  GatewayTransactionRecord,
  InitPaymentParams,
  InitPaymentResult,
  PaymentGatewayAdapter,
  WebhookVerifyResult,
} from './payment-gateway.interface';

/**
 * MockPaymentGateway — giả lập cổng thanh toán để dev/test luồng end-to-end
 * KHÔNG cần tài khoản VNPay/Momo thật. Ký (sign) request bằng HMAC-SHA256
 * giống cách các cổng thật xác thực webhook, để khi thay bằng adapter thật
 * ở Phase 3+, phần verify signature trong PaymentService không cần đổi logic.
 *
 * Cách test local: gọi POST /api/v1/payments/mock/simulate với
 * { gatewayTransactionRef, result: "success" | "fail" } để giả lập callback
 * từ cổng thanh toán (xem payment.controller.ts).
 */
@Injectable()
export class MockPaymentGateway implements PaymentGatewayAdapter {
  readonly providerName = 'mock';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async initPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
    const gatewayTransactionRef = `MOCK-${Date.now()}-${randomUUID().slice(0, 8)}`;
    // Trong thực tế đây sẽ là URL redirect sang trang thanh toán VNPay/Momo.
    // Mock: trả về URL nội bộ để FE hiển thị màn hình giả lập thanh toán.
    const redirectUrl = `${params.returnUrl}?orderId=${params.orderId}&ref=${gatewayTransactionRef}&mock=1`;
    return { redirectUrl, gatewayTransactionRef };
  }

  verifyWebhook(payload: Record<string, any>): WebhookVerifyResult {
    const secret = this.config.get<string>('PAYMENT_MOCK_SECRET') ?? '';
    const expectedSignature = this.sign(payload, secret);

    if (payload.signature !== expectedSignature) {
      return { isValid: false };
    }

    return {
      isValid: true,
      orderId: payload.orderId,
      gatewayTransactionId: payload.gatewayTransactionRef,
      amount: payload.amount,
      success: payload.result === 'success',
    };
  }

  /**
   * ⚠️ GIỚI HẠN QUAN TRỌNG: Mock gateway không có sổ giao dịch độc lập thật sự
   * (không giống VNPay/Momo có hệ thống riêng để đối soát) — nó CHÍNH LÀ nơi
   * ghi nhận `payment_transactions` của hệ thống ngay từ đầu (qua webhook giả
   * lập). Vì vậy hàm này chỉ echo lại đúng dữ liệu hệ thống đã có, nên đối
   * soát với Mock sẽ LUÔN khớp 100% — đây là hạn chế cố hữu của việc dùng Mock,
   * không phải lỗi logic đối soát.
   *
   * Giá trị thật của luồng đối soát (bắt giao dịch treo/thất thoát) chỉ phát
   * huy tác dụng khi cắm 1 adapter gateway THẬT (VNPay/Momo) implement đúng
   * interface này bằng cách gọi API đối soát chính thức của họ — quyết định
   * tích hợp gateway thật đã được để lại có chủ đích cho giai đoạn sau.
   */
  async fetchDailyTransactions(date: Date): Promise<GatewayTransactionRecord[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        payment: { gatewayProvider: this.providerName },
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: { in: [PaymentStatus.SUCCESS, PaymentStatus.FAILED] },
        gatewayTransactionId: { not: null },
      },
      select: { gatewayTransactionId: true, amount: true, status: true },
    });

    return transactions.map((t) => ({
      gatewayTransactionId: t.gatewayTransactionId!,
      amount: Number(t.amount),
      status: t.status === PaymentStatus.SUCCESS ? 'success' : 'fail',
    }));
  }

  /** Helper để MockController tự ký payload giả lập giống cổng thật gửi lên */
  sign(payload: Record<string, any>, secret: string): string {
    const raw = `${payload.orderId}|${payload.gatewayTransactionRef}|${payload.amount}|${payload.result}`;
    return createHmac('sha256', secret).update(raw).digest('hex');
  }
}
