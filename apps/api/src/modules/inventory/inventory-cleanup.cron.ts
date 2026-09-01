import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryService } from './inventory.service';

/**
 * Lớp bảo vệ thứ 2 (an toàn 2 lớp) — ngoài job BullMQ huỷ đơn theo đúng
 * 15 phút, cron này quét định kỳ mọi reservation ACTIVE đã hết hạn nhưng vì
 * lý do nào đó (worker restart, job bị mất...) chưa được release, đảm bảo
 * kho không bao giờ bị "giữ chỗ" vĩnh viễn oan (Mục 4.1 spec).
 */
@Injectable()
export class InventoryCleanupCron {
  private readonly logger = new Logger(InventoryCleanupCron.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredReservations() {
    const count = await this.inventoryService.releaseExpiredReservations();
    if (count > 0) {
      this.logger.log(`Cron dọn dẹp: đã release ${count} reservation hết hạn`);
    }
  }
}
