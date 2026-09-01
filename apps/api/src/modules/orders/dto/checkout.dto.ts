import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CheckoutAddressDto {
  @ApiProperty() @IsNotEmpty() receiver: string;
  @ApiProperty() @IsNotEmpty() phone: string;
  @ApiProperty() @IsNotEmpty() province: string;
  @ApiProperty() @IsNotEmpty() district: string;
  @ApiProperty() @IsNotEmpty() ward: string;
  @ApiProperty() @IsNotEmpty() addressLine: string;
}

export class CheckoutDto {
  @ApiProperty({ type: CheckoutAddressDto })
  address: CheckoutAddressDto;

  @ApiProperty({ description: 'ID của shipping_methods' })
  @IsNotEmpty()
  shippingMethodId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ required: false, description: 'Mã khuyến mãi (Phase 3) — áp dụng riêng theo từng gian hàng' })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
