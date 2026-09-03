import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { ReconciliationService } from '../payment/reconciliation.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  @Get('dashboard/overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  /**
   * Xem log đối soát thanh toán của 1 ngày (Mục 5.6 spec).
   * ?date=YYYY-MM-DD (mặc định hôm qua — cùng ngày cron đối soát chạy tự động).
   * ?run=true → chạy đối soát ngay lập tức cho ngày đó thay vì chỉ đọc log cũ
   * (hữu ích để test thủ công, không cần đợi tới 00:00).
   */
  @Get('reconciliation/daily')
  async getDailyReconciliation(@Query('date') date?: string, @Query('run') run?: string) {
    const targetDate = date ? new Date(date) : (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d;
    })();

    if (run === 'true') {
      await this.reconciliationService.runDailyReconciliation(targetDate);
    }
    return this.reconciliationService.getDailyLog(targetDate);
  }
}
