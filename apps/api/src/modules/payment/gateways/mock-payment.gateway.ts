import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import {
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

  constructor(private readonly config: ConfigService) {}

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

  /** Helper để MockController tự ký payload giả lập giống cổng thật gửi lên */
  sign(payload: Record<string, any>, secret: string): string {
    const raw = `${payload.orderId}|${payload.gatewayTransactionRef}|${payload.amount}|${payload.result}`;
    return createHmac('sha256', secret).update(raw).digest('hex');
  }
}
