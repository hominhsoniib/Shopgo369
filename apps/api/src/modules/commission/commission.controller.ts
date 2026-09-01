import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CommissionService } from './commission.service';

class CreatePayoutBatchDto {
  @IsNotEmpty() periodLabel: string;
}

@ApiTags('commission')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('member/commission')
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Get()
  getMine(@CurrentUser() user: { id: string }) {
    return this.commissionService.getMyCommissions(user.id);
  }

  // Admin kích hoạt thủ công 1 kỳ chi trả (Mục 4.3 spec: "chi trả định kỳ 2 lần/tháng")
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('payout-batch')
  createPayoutBatch(@Body() dto: CreatePayoutBatchDto) {
    return this.commissionService.createPayoutBatch(dto.periodLabel);
  }
}
