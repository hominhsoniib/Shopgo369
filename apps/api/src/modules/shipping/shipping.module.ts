import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { ShippingVouchersService } from './shipping-vouchers.service';

@Module({
  controllers: [ShippingController],
  providers: [ShippingService, ShippingVouchersService],
  exports: [ShippingService, ShippingVouchersService],
})
export class ShippingModule {}
