import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CatalogService } from './catalog.service';

class CreateCategoryDto {
  @IsNotEmpty() name: string;
  @IsOptional() @IsString() parentId?: string;
}

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  list() {
    return this.catalogService.listCategories();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto.name, dto.parentId);
  }
}
