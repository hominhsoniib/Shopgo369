import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ShippingStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ShippingService } from './shipping.service';
import { ShippingVouchersService } from './shipping-vouchers.service';

class UpdateTrackingDto {
  @IsEnum(ShippingStatus) status: ShippingStatus;
  @IsOptional() @IsString() note?: string;
}

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly shippingVouchersService: ShippingVouchersService,
  ) {}

  // Public — khách chọn phương thức vận chuyển lúc checkout
  @Get('methods')
  listMethods() {
    return this.shippingService.listMethods();
  }

  // Public — thay cho mảng FREESHIP_VOUCHERS hardcode trong checkout/page.tsx (xem
  // shipping-vouchers.service.ts). FE cần đổi sang gọi endpoint này thay vì hardcode.
  @Get('vouchers')
  listVouchers() {
    return this.shippingVouchersService.listActive();
  }

  // finding #6 (P1/IDOR): trước đây chỉ cần đăng nhập là xem được tracking của BẤT KỲ đơn nào
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('orders/:orderId')
  getTracking(@CurrentUser() user: { id: string; roles: string[] }, @Param('orderId') orderId: string) {
    return this.shippingService.getByOrderId(orderId, user.id, user.roles);
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
