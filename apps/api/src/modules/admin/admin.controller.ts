import { Body, Controller, Get, Param, Patch, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessStatus, ProductStatus, StoreStatus, PayoutStatus } from '@prisma/client';
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

  // ── Quản lý Hộ Kinh Doanh (Business KYC) ──────────────────────────────
  @Get('businesses')
  listBusinesses(
    @Query('status') status?: BusinessStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
  ) {
    return this.adminService.listBusinesses({ status, search, page: page ? parseInt(page, 10) : undefined });
  }

  @Patch('businesses/:id/verify')
  verifyBusiness(@Param('id') id: string) {
    return this.adminService.verifyBusiness(id);
  }

  @Patch('businesses/:id/reject')
  rejectBusiness(@Param('id') id: string) {
    return this.adminService.rejectBusiness(id);
  }

  // ── Quản lý Gian Hàng (Store Management) ───────────────────────────
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

  // ── Kiểm Duyệt Sản Phẩm (Product Moderation) ────────────────────────
  @Get('products')
  listProducts(
    @Query('status') status?: ProductStatus,
    @Query('storeId') storeId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
  ) {
    return this.adminService.listProducts({ status, storeId, search, page: page ? parseInt(page, 10) : undefined });
  }

  @Patch('products/:id/status')
  updateProductStatus(
    @Param('id') id: string,
    @Body('status') status: ProductStatus,
  ) {
    return this.adminService.updateProductStatus(id, status);
  }

  // ── Phê Duyệt Chi Trả Hoa Hồng (Commission Payouts) ─────────────────
  @Get('payouts')
  listPayouts(
    @Query('status') status?: PayoutStatus,
    @Query('page') page?: string,
  ) {
    return this.adminService.listPayouts({ status, page: page ? parseInt(page, 10) : undefined });
  }

  @Patch('payouts/:id/confirm-paid')
  confirmPayoutPaid(@Param('id') id: string) {
    return this.adminService.confirmPayoutPaid(id);
  }

  // ── Nhật Ký Thao Tác Hệ Thống (Audit Logs) ─────────────────────────
  @Get('audit-logs')
  listAuditLogs(@Query('page') page?: string) {
    return this.adminService.listAuditLogs({ page: page ? parseInt(page, 10) : undefined });
  }

  // ── Đối Soát Thanh Toán Hàng Ngày ──────────────────────────────────
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

