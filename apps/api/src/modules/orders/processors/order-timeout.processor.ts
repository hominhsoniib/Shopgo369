import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { ORDER_TIMEOUT_QUEUE } from '../../queue/queue.service';
import { OrdersService } from '../orders.service';

/**
 * OrderTimeoutProcessor — Worker BullMQ tiêu thụ job "order-timeout".
 * Đặt trong OrdersModule (không phải QueueModule) để tránh circular
 * dependency, vì Worker cần gọi ngược lại OrdersService.
 *
 * Đây chính là "Queue Worker" trong sơ đồ kiến trúc (Mục 3.1 spec) — chạy
 * NGẦM, không chặn luồng request chính, xử lý việc "Timeout 15 phút không
 * thanh toán → job tự động huỷ đơn + release kho" (Mục 4.1 spec).
 */
@Injectable()
export class OrderTimeoutProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderTimeoutProcessor.name);
  private worker: Worker;

  constructor(
    private readonly ordersService: OrdersService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      ORDER_TIMEOUT_QUEUE,
      async (job: Job<{ orderId: string }>) => {
        this.logger.log(`Xử lý job huỷ đơn quá hạn: order ${job.data.orderId}`);
        await this.ordersService.cancelDueToTimeout(job.data.orderId);
      },
      { connection: { url: this.config.get<string>('redis.url') } as any },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job huỷ đơn ${job?.id} thất bại: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
