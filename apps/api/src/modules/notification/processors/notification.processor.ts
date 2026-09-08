import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NOTIFICATION_QUEUE, PUSH_PROVIDER } from '../notification.constants';
import { NotificationJobData } from '../notification-queue.service';
import { PushProviderAdapter } from '../providers/push-provider.interface';

/**
 * NotificationProcessor — Worker BullMQ tiêu thụ job "send" (cùng pattern
 * `orders/processors/order-timeout.processor.ts`). Chạy NGẦM, không chặn
 * request path đã tạo ra NotificationLog.
 *
 * Luồng: đọc log PENDING → lấy toàn bộ device token còn hiệu lực của user →
 * gọi PushProviderAdapter.send() → cập nhật log SENT/FAILED → xoá token
 * KHÔNG CÒN HỢP LỆ khỏi DB (invalidTokens) để không gửi lặp vào token chết.
 */
@Injectable()
export class NotificationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationProcessor.name);
  private worker: Worker<NotificationJobData>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(PUSH_PROVIDER) private readonly pushProvider: PushProviderAdapter,
  ) {}

  onModuleInit() {
    this.worker = new Worker<NotificationJobData>(
      NOTIFICATION_QUEUE,
      async (job: Job<NotificationJobData>) => this.handleJob(job.data),
      { connection: { url: this.config.get<string>('redis.url') } as any },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job gửi thông báo ${job?.id} thất bại: ${err.message}`);
    });
  }

  private async handleJob(data: NotificationJobData) {
    const log = await this.prisma.notificationLog.findUnique({ where: { id: data.logId } });
    if (!log) return; // log đã bị xoá — bỏ qua, không phải lỗi

    if (log.channel !== 'PUSH') {
      // EMAIL/kênh khác chưa implement ở P4 này — đánh dấu FAILED có lý do rõ ràng
      // thay vì để mãi ở PENDING, để không gây nhầm lẫn khi soi log sau này.
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', errorMessage: `Kênh ${log.channel} chưa được implement (P4 chỉ có PUSH)` },
      });
      return;
    }

    const devices = await this.prisma.deviceToken.findMany({ where: { userId: log.userId } });
    if (devices.length === 0) {
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'SKIPPED', errorMessage: 'User không có device token nào' },
      });
      return;
    }

    const tokens = devices.map((d) => d.token);
    const result = await this.pushProvider.send(tokens, log.title, log.body, {
      templateCode: log.templateCode,
      logId: log.id,
      ...(log.data as Record<string, string> | null),
    });

    if (result.invalidTokens.length > 0) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: result.invalidTokens } } });
      this.logger.log(`Xoá ${result.invalidTokens.length} device token không còn hợp lệ`);
    }

    const status = result.skipped
      ? 'SKIPPED'
      : result.successTokens.length > 0
        ? 'SENT'
        : 'FAILED';

    await this.prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status,
        sentAt: status === 'SENT' ? new Date() : undefined,
        errorMessage: result.errorMessage,
      },
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
