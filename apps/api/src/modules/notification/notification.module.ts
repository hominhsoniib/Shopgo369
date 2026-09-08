import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationProcessor } from './processors/notification.processor';
import { FcmPushProvider } from './providers/fcm-push.provider';
import { NoopPushProvider } from './providers/noop-push.provider';
import { PUSH_PROVIDER } from './notification.constants';

/**
 * NotificationModule (P4) — dựng module notification từ đầu, đúng roadmap
 * đã ghi trong README: "P4 — Push Notification: chờ — backend chưa có module
 * notification, cần dựng từ đầu".
 *
 * Chọn provider theo pattern Adapter (giống PaymentModule/MockPaymentGateway):
 * CHỈ dùng FcmPushProvider khi đã cấu hình FIREBASE_SERVICE_ACCOUNT_JSON hoặc
 * FIREBASE_SERVICE_ACCOUNT_PATH — nếu chưa, fallback NoopPushProvider để app
 * vẫn chạy/deploy bình thường (không throw khi thiếu credentials Firebase
 * mà bạn chưa tạo). Khi có Firebase project thật, chỉ cần set env, KHÔNG
 * cần sửa code hay đổi module nào import NotificationModule.
 */
@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationQueueService,
    NotificationProcessor,
    FcmPushProvider,
    NoopPushProvider,
    {
      provide: PUSH_PROVIDER,
      useFactory: (config: ConfigService, fcm: FcmPushProvider, noop: NoopPushProvider) => {
        const hasFirebaseConfig =
          !!config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON') || !!config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
        return hasFirebaseConfig ? fcm : noop;
      },
      inject: [ConfigService, FcmPushProvider, NoopPushProvider],
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
