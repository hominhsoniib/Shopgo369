import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';
import { PromotionType } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PromotionsService } from './promotions.service';

class CreatePromotionDto {
  @IsNotEmpty() code: string;
  @IsEnum(PromotionType) type: PromotionType;
  @IsNumber() @IsPositive() value: number;
  @IsOptional() @IsNumber() @Min(0) minOrderAmount?: number;
  @IsOptional() @IsNumber() @IsPositive() maxDiscountAmount?: number;
  @IsOptional() @IsNumber() @IsPositive() usageLimit?: number;
  @IsDateString() startsAt: string;
  @IsDateString() endsAt: string;
}

@ApiTags('promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN')
@Controller('seller/promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  listOwn(@CurrentUser() user: { id: string }) {
    return this.promotionsService.listOwn(user.id);
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(user.id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.promotionsService.deactivate(user.id, id);
  }
}
