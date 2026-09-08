import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { NOTIFICATION_QUEUE } from './notification.constants';

export interface NotificationJobData {
  logId: string;
}

/**
 * NotificationQueueService — producer thuần, cùng pattern với
 * `queue/queue.service.ts` (Mục 3.1, 9.2 spec: BullMQ worker xử lý ngầm).
 * Worker thật nằm ở `processors/notification.processor.ts` TRONG CÙNG
 * module này (không cần tách ra module riêng như OrdersModule↔QueueModule
 * vì NotificationModule không có nguy cơ circular dependency — nó chỉ bị
 * các module khác import, không import ngược lại module nào).
 */
@Injectable()
export class NotificationQueueService implements OnModuleDestroy {
  private readonly queue: Queue<NotificationJobData>;

  constructor(private readonly config: ConfigService) {
    this.queue = new Queue<NotificationJobData>(NOTIFICATION_QUEUE, {
      connection: {
        url: this.config.get<string>('redis.url'),
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
      } as any,
    });
    this.queue.on('error', () => {
      // Bỏ qua khi Redis offline ở local dev — giống QueueService
    });
  }

  async enqueueSend(logId: string) {
    await this.queue.add(
      'send',
      { logId },
      {
        jobId: `notif-${logId}`, // idempotent — BullMQ 5.81+ cấm dấu ":" trong Custom Job ID
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 100, // giữ lại tối đa 100 job lỗi gần nhất để soi log
      },
    );
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
