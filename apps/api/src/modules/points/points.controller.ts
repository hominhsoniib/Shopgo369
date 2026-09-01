import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PointsService } from './points.service';

@ApiTags('points')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('member/points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get()
  getMine(@CurrentUser() user: { id: string }) {
    return this.pointsService.getMyPoints(user.id);
  }
}
