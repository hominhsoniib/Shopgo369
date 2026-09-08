/**
 * PushProviderAdapter — interface chung cho mọi nhà cung cấp push notification
 * (Mục 11 spec đặc tả tương lai: FCM là lựa chọn duy nhất thực tế cho cả
 * Android/iOS/Web nên hiện chỉ có 1 adapter thật, nhưng vẫn theo pattern
 * Adapter giống PaymentGatewayAdapter để không khoá cứng vào 1 nhà cung cấp).
 */
export interface PushSendResult {
  /** Token gửi thành công */
  successTokens: string[];
  /** Token gửi thất bại nhưng có thể thử lại sau (lỗi tạm thời phía FCM) */
  failedTokens: string[];
  /** Token KHÔNG còn hợp lệ (app đã gỡ/token hết hạn) — cần xoá khỏi DB ngay */
  invalidTokens: string[];
  /** true nếu adapter không thực sự gửi được gì (vd: chưa cấu hình credentials) */
  skipped?: boolean;
  errorMessage?: string;
}

export interface PushProviderAdapter {
  readonly providerName: string;
  send(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<PushSendResult>;
}
