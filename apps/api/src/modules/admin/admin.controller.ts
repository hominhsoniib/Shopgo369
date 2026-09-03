import { Controller, Get, Param, Patch, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StoreStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';
import { AdminService } from './admin.service';
import { ReconciliationService } from '../payment/reconciliation.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@UseInterceptors(AuditLogInterceptor) // Mục 5.1/7.2 spec: thao tác admin (khoá/mở gian hàng...) là nhạy cảm
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

  // ── Quản lý gian hàng (Mục 5.4 spec) ──────────────────────────────
  @Get('stores')
  listStores(
    @Query('status') status?: StoreStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
  ) {
    return this.adminService.listStores({ status, search, page: page ? parseInt(page, 10) : undefined });
  }

  @Get('stores/:id')
  getStoreDetail(@Param('id') id: string) {
    return this.adminService.getStoreDetail(id);
  }

  @Patch('stores/:id/suspend')
  suspendStore(@Param('id') id: string) {
    return this.adminService.suspendStore(id);
  }

  @Patch('stores/:id/reactivate')
  reactivateStore(@Param('id') id: string) {
    return this.adminService.reactivateStore(id);
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
