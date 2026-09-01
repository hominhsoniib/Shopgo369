import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccountingService } from './accounting.service';

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN')
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // Sổ thu-chi cơ bản (Mục 5.6 spec: GET /accounting/revenue, /expenses — gộp
  // thành 1 endpoint /ledger cho gọn ở Phase 4; báo cáo P&L nâng cao xem
  // Mục 3.6 — Python Accounting Service, endpoint riêng khi Python service sẵn sàng)
  @Get('ledger')
  getLedger(@CurrentUser() user: { id: string }, @Query('from') from: string, @Query('to') to: string) {
    return this.accountingService.getLedger(user.id, new Date(from), new Date(to));
  }

  // ── Cầu nối Python Accounting Service (Mục 3.6.2 spec) ──────────────
  @Get('reports')
  getStoredReports(
    @CurrentUser() user: { id: string },
    @Query('periodType') periodType: 'DAILY' | 'MONTHLY' = 'DAILY',
  ) {
    return this.accountingService.getStoredReports(user.id, periodType);
  }

  @Get('reports/forecast')
  getForecast(@CurrentUser() user: { id: string }) {
    return this.accountingService.getStoredForecasts(user.id);
  }

  @Get('reports/tax-estimation')
  getTaxEstimation(@CurrentUser() user: { id: string }) {
    return this.accountingService.getStoredTaxEstimations(user.id);
  }

  @Get('reports/generate-now')
  generateNow(@CurrentUser() user: { id: string }, @Query('from') from: string, @Query('to') to: string) {
    return this.accountingService.generateReportNow(user.id, new Date(from), new Date(to));
  }
}
