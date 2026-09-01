import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MembersService } from './members.service';

class RegisterMemberDto {
  @IsOptional()
  @IsString()
  referralCode?: string;
}

@ApiTags('members')
@ApiBearerAuth()
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('register')
  registerMember(@CurrentUser() user: { id: string }, @Body() dto: RegisterMemberDto) {
    return this.membersService.registerMember(user.id, dto.referralCode);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@CurrentUser() user: { id: string }) {
    return this.membersService.findByUserId(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('pending')
  listPending() {
    return this.membersService.listPending();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.membersService.approve(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.membersService.reject(id);
  }
}
