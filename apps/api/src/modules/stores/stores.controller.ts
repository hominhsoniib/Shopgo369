import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StoresService } from './stores.service';

class CreateStoreDto {
  @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
}

@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateStoreDto) {
    return this.storesService.createStore(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getOwn(@CurrentUser() user: { id: string }) {
    return this.storesService.getOwnStore(user.id);
  }

  // Public — khách xem gian hàng, KHÔNG cần đăng nhập (Mục 5.4 spec: /s/{store-slug})
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.storesService.findBySlug(slug);
  }
}
