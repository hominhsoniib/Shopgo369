import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReconciliationService } from './reconciliation.service';

/**
 * Cron đối soát thanh toán — chạy 00:00 hàng ngày, đối soát giao dịch của
 * NGÀY HÔM QUA (Mục 4.2 spec: "MỖI NGÀY (Cron 00:00)").
 */
@Injectable()
export class ReconciliationCron {
  private readonly logger = new Logger(ReconciliationCron.name);

  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyReconciliation() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const summary = await this.reconciliationService.runDailyReconciliation(yesterday);
    this.logger.log(`Cron đối soát thanh toán ${summary.date} hoàn tất`);
  }
}
