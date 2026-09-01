import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * RedisService — kết nối Redis dùng chung cho: cache, distributed lock (chống
 * oversell — Mục 3.1, 4.1 spec), và làm broker cho BullMQ.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis(this.config.get<string>('redis.url') as string, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) return null; // Dừng retry nếu local chưa bật Redis
        return Math.min(times * 1000, 3000);
      },
    });

    this.client.on('error', (err) => {
      this.logger.warn(`⚠️ Redis Connection Warning: ${err.message}. (Tồn kho/Cache sẽ fallback nếu chưa bật Redis local)`);
    });
  }

  onModuleInit() {
    // ioredis tự kết nối lazy
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
