import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';
import { RefundService } from './refund.service';

class CreateRefundDto {
  @IsUUID() orderId: string;
  @IsOptional() @IsNumber() @IsPositive() amount?: number; // bỏ trống = hoàn toàn phần
  @IsNotEmpty() reason: string;
}

class RejectRefundDto {
  @IsNotEmpty() reason: string;
}

type AuthUser = { id: string; roles: RoleName[] };

@ApiTags('refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditLogInterceptor) // Mục 5.1/7.2 spec: refund/payment là entity nhạy cảm, bắt buộc audit log
@Controller('refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  /** Khách hàng yêu cầu hoàn tiền cho đơn của mình */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRefundDto) {
    return this.refundService.createRefund(user.id, dto.orderId, dto.amount, dto.reason);
  }

  /** Xem yêu cầu hoàn tiền của 1 đơn — chủ đơn hoặc seller/admin liên quan */
  @Get('order/:orderId')
  getForOrder(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.refundService.getForOrder(user.id, user.roles, orderId);
  }

  /** Seller (chủ store) hoặc Admin duyệt hoàn tiền */
  @Post(':id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('id') refundId: string) {
    return this.refundService.approveRefund(user.id, user.roles, refundId);
  }

  /** Seller (chủ store) hoặc Admin từ chối hoàn tiền */
  @Post(':id/reject')
  reject(@CurrentUser() user: AuthUser, @Param('id') refundId: string, @Body() dto: RejectRefundDto) {
    return this.refundService.rejectRefund(user.id, user.roles, refundId, dto.reason);
  }
}
