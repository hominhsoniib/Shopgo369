import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BusinessesService } from './businesses.service';

class RegisterBusinessDto {
  @IsNotEmpty() businessName: string;
  @IsOptional() @IsString() taxCode?: string;
  @IsNotEmpty() ownerIdCard: string;
  @IsNotEmpty() address: string;
}

@ApiTags('businesses')
@ApiBearerAuth()
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  register(@CurrentUser() user: { id: string }, @Body() dto: RegisterBusinessDto) {
    return this.businessesService.register(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('pending')
  listPending() {
    return this.businessesService.listPendingVerification();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/verify')
  verify(@Param('id') id: string) {
    return this.businessesService.verify(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.businessesService.reject(id);
  }
}
