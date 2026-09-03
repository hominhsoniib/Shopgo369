import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
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
  // ValidationPipe toàn cục bật whitelist:true + forbidNonWhitelisted:true
  // (main.ts) — field object lồng nhau BẮT BUỘC phải có @ValidateNested()
  // + @Type(), nếu không class-validator coi field đó là "lạ" và từ chối
  // với lỗi "property address should not exist" (bug thật đã gặp khi test).
  @ApiProperty({ type: CheckoutAddressDto })
  @ValidateNested()
  @Type(() => CheckoutAddressDto)
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
