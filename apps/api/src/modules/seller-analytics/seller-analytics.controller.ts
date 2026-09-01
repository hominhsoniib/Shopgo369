import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SellerAnalyticsService } from './seller-analytics.service';

@ApiTags('seller-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN')
@Controller('seller/dashboard')
export class SellerAnalyticsController {
  constructor(private readonly analyticsService: SellerAnalyticsService) {}

  @Get('overview')
  getOverview(
    @CurrentUser() user: { id: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getOverview(
      user.id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('revenue')
  getRevenue(
    @CurrentUser() user: { id: string },
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupBy') groupBy?: 'day' | 'month',
  ) {
    return this.analyticsService.getRevenueTimeSeries(user.id, new Date(from), new Date(to), groupBy);
  }

  @Get('top-products')
  getTopProducts(@CurrentUser() user: { id: string }, @Query('limit') limit?: string) {
    return this.analyticsService.getTopProducts(user.id, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('low-stock')
  getLowStock(@CurrentUser() user: { id: string }, @Query('threshold') threshold?: string) {
    return this.analyticsService.getLowStockProducts(user.id, threshold ? parseInt(threshold, 10) : undefined);
  }
}
