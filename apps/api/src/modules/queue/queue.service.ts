import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export const ORDER_TIMEOUT_QUEUE = 'order-timeout';

/**
 * QueueService — producer phía NestJS đưa job vào BullMQ (dùng chung Redis
 * làm broker — Mục 3.1, 9.2 spec: "Queue Worker: BullMQ... tính hoa hồng,
 * đối soát"). Phase 2 chỉ dùng cho 1 job: tự huỷ đơn quá hạn thanh toán.
 *
 * Lưu ý: đây là producer thuần — WORKER (nơi thực sự xử lý job) đặt trong
 * OrdersModule (order-timeout.processor.ts) để tránh circular dependency
 * giữa QueueModule ↔ OrdersModule.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly orderTimeoutQueue: Queue;

  constructor(private readonly config: ConfigService) {
    this.orderTimeoutQueue = new Queue(ORDER_TIMEOUT_QUEUE, {
      connection: {
        url: this.config.get<string>('redis.url'),
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
      } as any,
    });
    this.orderTimeoutQueue.on('error', () => {
      // Ignored when Redis is offline in local dev
    });
  }

  /** Lên lịch huỷ đơn sau `delayMs` nếu vẫn PENDING_PAYMENT (Mục 4.1 spec) */
  async scheduleOrderTimeout(orderId: string, delayMs: number) {
    await this.orderTimeoutQueue.add(
      'cancel-if-unpaid',
      { orderId },
      {
        delay: delayMs,
        jobId: `order-timeout:${orderId}`, // idempotent — tránh add trùng job cho cùng 1 order
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  async onModuleDestroy() {
    await this.orderTimeoutQueue.close();
  }
}
