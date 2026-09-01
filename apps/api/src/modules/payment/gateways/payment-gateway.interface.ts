/**
 * PaymentGatewayAdapter — interface chung cho mọi cổng thanh toán
 * (Mục 11 spec: VNPay/Momo/ZaloPay). Phase 2 chỉ implement MockPaymentGateway
 * để dev/test local; khi tích hợp cổng thật, chỉ cần viết thêm 1 adapter mới
 * implement interface này — KHÔNG cần sửa PaymentService hay OrdersService.
 */
export interface InitPaymentParams {
  orderId: string;
  orderCode: string;
  amount: number;
  returnUrl: string;
}

export interface InitPaymentResult {
  redirectUrl: string;
  gatewayTransactionRef: string;
}

export interface WebhookVerifyResult {
  isValid: boolean;
  orderId?: string;
  gatewayTransactionId?: string;
  amount?: number;
  success?: boolean;
}

export interface PaymentGatewayAdapter {
  readonly providerName: string;
  initPayment(params: InitPaymentParams): Promise<InitPaymentResult>;
  verifyWebhook(payload: Record<string, any>, signature?: string): WebhookVerifyResult;
}
