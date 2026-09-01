import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RedisService } from './redis.service';

/**
 * DistributedLockService — cơ chế khoá phân tán để chống OVERSELL khi nhiều
 * khách checkout cùng 1 sản phẩm đồng thời (Mục 3.1 nguyên tắc #3, Mục 4.1 spec).
 *
 * Thiết kế: SET key value NX PX ttl (atomic) để giành lock, và Lua script để
 * release AN TOÀN (chỉ xoá nếu đúng chủ sở hữu — token của chính lần acquire đó
 * — tránh trường hợp process A xoá nhầm lock mà process B đang giữ sau khi
 * lock của A đã hết hạn).
 *
 * ⚠️ Lưu ý khi scale thật: đây là lock trên 1 Redis instance — đủ dùng cho
 * quy mô Phase 2 (1 Redis). Nếu sau này dùng Redis Cluster nhiều node độc lập
 * cho HA, cần nâng cấp lên thuật toán Redlock đầy đủ (nhiều node) theo khuyến
 * nghị chính thức của Redis — spec Mục 3.6.3 đã ghi chú tương tự cho Read Replica.
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly defaultTtlMs: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly config: ConfigService,
  ) {
    this.defaultTtlMs = parseInt(this.config.get('INVENTORY_LOCK_TTL_MS') ?? '5000', 10);
  }

  /**
   * Giành lock cho 1 key (vd: `lock:inventory:{productId}`).
   * Trả về token nếu thành công, null nếu key đang bị giữ bởi tiến trình khác.
   */
  async acquire(key: string, ttlMs: number = this.defaultTtlMs): Promise<string | null> {
    const token = randomUUID();
    const result = await this.redisService.client.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK' ? token : null;
  }

  /** Release lock — chỉ xoá nếu token khớp (an toàn, tránh xoá nhầm lock của tiến trình khác) */
  async release(key: string, token: string): Promise<void> {
    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
    await this.redisService.client.eval(script, 1, key, token);
  }

  /**
   * Helper: chạy 1 hàm trong phạm vi lock, tự động acquire/release, retry
   * ngắn nếu lock đang bận (dùng cho luồng checkout — Mục 4.1 spec).
   */
  async runExclusive<T>(
    key: string,
    fn: () => Promise<T>,
    options?: { ttlMs?: number; retries?: number; retryDelayMs?: number },
  ): Promise<T> {
    const ttlMs = options?.ttlMs ?? this.defaultTtlMs;
    const retries = options?.retries ?? 5;
    const retryDelayMs = options?.retryDelayMs ?? 150;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const token = await this.acquire(key, ttlMs);
      if (token) {
        try {
          return await fn();
        } finally {
          await this.release(key, token);
        }
      }
      this.logger.debug(`Lock "${key}" đang bận, thử lại lần ${attempt + 1}/${retries}`);
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }

    throw new Error(`Không giành được lock "${key}" sau ${retries} lần thử — hệ thống đang quá tải`);
  }
}
