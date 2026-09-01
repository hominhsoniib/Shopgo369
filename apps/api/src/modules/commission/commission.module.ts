import { Module } from '@nestjs/common';
import { CommissionController } from './commission.controller';
import { CommissionService } from './commission.service';
import { CommissionApprovalCron } from './commission-approval.cron';

@Module({
  controllers: [CommissionController],
  providers: [CommissionService, CommissionApprovalCron],
  exports: [CommissionService],
})
export class CommissionModule {}
