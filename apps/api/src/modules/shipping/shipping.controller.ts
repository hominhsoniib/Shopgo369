import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ShippingStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ShippingService } from './shipping.service';

class UpdateTrackingDto {
  @IsEnum(ShippingStatus) status: ShippingStatus;
  @IsOptional() @IsString() note?: string;
}

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // Public — khách chọn phương thức vận chuyển lúc checkout
  @Get('methods')
  listMethods() {
    return this.shippingService.listMethods();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('orders/:orderId')
  getTracking(@Param('orderId') orderId: string) {
    return this.shippingService.getByOrderId(orderId);
  }

  // Seller cập nhật trạng thái giao hàng — chỉ seller sở hữu đơn mới được gọi (RolesGuard + ownership check trong service)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN')
  @Patch('orders/:orderId/tracking')
  updateTracking(
    @CurrentUser() user: { id: string },
    @Param('orderId') orderId: string,
    @Body() dto: UpdateTrackingDto,
  ) {
    return this.shippingService.updateTrackingStatus(orderId, user.id, dto.status, dto.note);
  }
}
