import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommissionService } from './commission.service';

/** Cron duyệt hoa hồng đến hạn — chạy hàng ngày 01:00 (Mục 4.3 spec) */
@Injectable()
export class CommissionApprovalCron {
  private readonly logger = new Logger(CommissionApprovalCron.name);

  constructor(private readonly commissionService: CommissionService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleApproval() {
    const count = await this.commissionService.approveMaturedCommissions();
    if (count > 0) this.logger.log(`Cron duyệt hoa hồng: ${count} giao dịch đã duyệt`);
  }
}
