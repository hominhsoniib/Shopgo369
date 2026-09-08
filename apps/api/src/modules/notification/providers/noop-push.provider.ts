import { Injectable, Logger } from '@nestjs/common';
import { PushProviderAdapter, PushSendResult } from './push-provider.interface';

/**
 * NoopPushProvider — fallback AN TOÀN khi CHƯA cấu hình Firebase (biến môi
 * trường FIREBASE_SERVICE_ACCOUNT_JSON rỗng). Không throw, không chặn luồng
 * nghiệp vụ chính — chỉ ghi log và trả về `skipped: true` để NotificationLog
 * lưu đúng trạng thái SKIPPED thay vì báo sai là đã gửi.
 *
 * Đây là lựa chọn có chủ đích: dự án CHƯA có Firebase project (P4 dừng ở
 * đây từ đầu vì lý do này) — module vẫn build/deploy được ngay, ghi đầy đủ
 * lịch sử "lẽ ra đã gửi gì" trong notification_logs, và khi có Firebase
 * credentials thật chỉ cần set env — KHÔNG cần sửa code (giống MockPaymentGateway).
 */
@Injectable()
export class NoopPushProvider implements PushProviderAdapter {
  readonly providerName = 'noop';
  private readonly logger = new Logger(NoopPushProvider.name);
  private warned = false;

  async send(tokens: string[], title: string, _body: string): Promise<PushSendResult> {
    if (!this.warned) {
      this.logger.warn(
        'Push provider = noop (chưa cấu hình FIREBASE_SERVICE_ACCOUNT_JSON) — ' +
          'thông báo chỉ được GHI VÀO notification_logs, KHÔNG thực sự gửi tới thiết bị.',
      );
      this.warned = true;
    }
    this.logger.debug(`[noop-push] "${title}" → ${tokens.length} token (bỏ qua, chưa cấu hình FCM)`);
    return { successTokens: [], failedTokens: [], invalidTokens: [], skipped: true };
  }
}
