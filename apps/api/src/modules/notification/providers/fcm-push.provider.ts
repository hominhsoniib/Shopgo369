import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PushProviderAdapter, PushSendResult } from './push-provider.interface';

/**
 * FcmPushProvider — gửi push thật qua Firebase Cloud Messaging.
 *
 * CẤU HÌNH (tự bạn tạo project tại https://console.firebase.google.com,
 * bật Cloud Messaging, tạo Service Account key JSON — Project Settings →
 * Service Accounts → Generate new private key):
 *   FIREBASE_SERVICE_ACCOUNT_JSON = toàn bộ nội dung file JSON (1 dòng, hoặc
 *                                    base64-encode nếu deploy qua biến môi
 *                                    trường không hỗ trợ xuống dòng)
 *   — hoặc —
 *   FIREBASE_SERVICE_ACCOUNT_PATH = đường dẫn tới file JSON trên server
 *
 * `firebase-admin` được require() ĐỘNG (không import tĩnh ở đầu file) để
 * app KHÔNG crash khi package chưa cài (vd: patch này áp vào code nhưng
 * chưa chạy `pnpm install`) — NotificationModule sẽ tự rơi về NoopPushProvider
 * trong trường hợp đó (xem notification.module.ts).
 */
@Injectable()
export class FcmPushProvider implements PushProviderAdapter {
  readonly providerName = 'fcm';
  private readonly logger = new Logger(FcmPushProvider.name);
  private messaging: any;

  constructor(private readonly config: ConfigService) {
    this.messaging = this.initMessaging();
  }

  private initMessaging(): any {
    // Kiểm tra env TRƯỚC khi require('firebase-admin') — tránh log lỗi ồn ào
    // ở trạng thái "cố ý chưa cấu hình" (trường hợp mặc định hiện tại của dự
    // án, xem docstring đầu file). Chỉ khi ĐÃ set env mà vẫn lỗi mới log ERROR.
    const rawJson = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    const filePath = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    if (!rawJson && !filePath) return null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const admin = require('firebase-admin');

      let credentialJson: Record<string, any> | undefined;
      if (rawJson) {
        // Hỗ trợ cả JSON thô lẫn base64 (nhiều nền tảng hosting không cho
        // biến môi trường chứa dấu xuống dòng trong private_key).
        const looksLikeJson = rawJson.trim().startsWith('{');
        const decoded = looksLikeJson ? rawJson : Buffer.from(rawJson, 'base64').toString('utf-8');
        credentialJson = JSON.parse(decoded);
      } else if (filePath) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        credentialJson = require(filePath);
      }
      if (!credentialJson) return null;

      const app = admin.apps.length
        ? admin.app()
        : admin.initializeApp({ credential: admin.credential.cert(credentialJson) });
      return app.messaging();
    } catch (err) {
      this.logger.error(
        `Đã cấu hình FIREBASE_SERVICE_ACCOUNT_JSON/PATH nhưng khởi tạo Firebase Admin SDK thất bại ` +
          `(kiểm tra JSON hợp lệ, hoặc đã chạy \`pnpm install\` để có package \`firebase-admin\` chưa): ${(err as Error).message}`,
      );
      return null;
    }
  }

  async send(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<PushSendResult> {
    if (!this.messaging) {
      return { successTokens: [], failedTokens: [], invalidTokens: [], skipped: true, errorMessage: 'FCM chưa khởi tạo được' };
    }
    if (tokens.length === 0) {
      return { successTokens: [], failedTokens: [], invalidTokens: [] };
    }

    try {
      const response = await this.messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: data ?? {},
      });

      const successTokens: string[] = [];
      const failedTokens: string[] = [];
      const invalidTokens: string[] = [];

      response.responses.forEach((res: any, idx: number) => {
        const token = tokens[idx];
        if (res.success) {
          successTokens.push(token);
          return;
        }
        const code = res.error?.code as string | undefined;
        // Các mã lỗi cho biết token KHÔNG CÒN HỢP LỆ — cần xoá khỏi DB ngay,
        // tránh gửi lặp lại vào token chết ở lần thông báo sau.
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument'
        ) {
          invalidTokens.push(token);
        } else {
          failedTokens.push(token);
        }
      });

      return { successTokens, failedTokens, invalidTokens };
    } catch (err) {
      this.logger.error(`Gửi FCM thất bại: ${(err as Error).message}`);
      return { successTokens: [], failedTokens: tokens, invalidTokens: [], errorMessage: (err as Error).message };
    }
  }
}
