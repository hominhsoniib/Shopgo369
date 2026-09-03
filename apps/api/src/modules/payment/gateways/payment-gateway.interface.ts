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

/** 1 bản ghi giao dịch "phía gateway" dùng để đối soát (Mục 4.2 spec) */
export interface GatewayTransactionRecord {
  gatewayTransactionId: string;
  amount: number;
  status: 'success' | 'fail';
}

export interface PaymentGatewayAdapter {
  readonly providerName: string;
  initPayment(params: InitPaymentParams): Promise<InitPaymentResult>;
  verifyWebhook(payload: Record<string, any>, signature?: string): WebhookVerifyResult;
  /**
   * Lấy danh sách giao dịch THÀNH CÔNG theo ngày từ phía gateway, để đối soát
   * với `payment_transactions` của hệ thống (Mục 4.2 spec: "So khớp với báo
   * cáo giao dịch từ Payment Gateway"). Cổng thật (VNPay/Momo) sẽ gọi API đối
   * soát chính thức của họ tại đây.
   */
  fetchDailyTransactions(date: Date): Promise<GatewayTransactionRecord[]>;
}
