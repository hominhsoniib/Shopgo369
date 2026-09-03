import { Body, Controller, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditLogInterceptor) // Mục 5.1/7.2 spec: orders là entity nhạy cảm, bắt buộc audit log
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  checkout(@CurrentUser() user: { id: string }, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(user.id, dto);
  }

  @Get()
  listMyOrders(@CurrentUser() user: { id: string }) {
    return this.ordersService.listMyOrders(user.id);
  }

  @Get(':id')
  getById(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ordersService.getById(id, user.id);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ordersService.cancelByCustomer(user.id, id);
  }

  @Patch(':id/confirm-received')
  confirmReceived(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ordersService.confirmReceived(user.id, id);
  }

  // ── Seller endpoints ──────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles('SELLER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN')
  @Get('seller/mine')
  listStoreOrders(@CurrentUser() user: { id: string }) {
    return this.ordersService.listStoreOrders(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles('SELLER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN')
  @Patch(':id/confirm')
  confirmOrder(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ordersService.confirmOrder(user.id, id);
  }

  @UseGuards(RolesGuard)
  @Roles('SELLER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN')
  @Patch(':id/pack')
  markPacked(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ordersService.markPacked(user.id, id);
  }

  @UseGuards(RolesGuard)
  @Roles('SELLER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN')
  @Patch(':id/ship')
  markShipping(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ordersService.markShipping(user.id, id);
  }
}
