import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CatalogService } from './catalog.service';

class CreateProductDto {
  @IsNotEmpty() @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @IsPositive() basePrice: number;
  @IsOptional() @IsArray() categoryIds?: string[];
  @IsOptional() @IsInt() @Min(0) initialQuantity?: number;
  @IsOptional() @IsArray() imageUrls?: string[];
}

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly catalogService: CatalogService) {}

  // Public — trang Shop (Mục 3.3, 5.6 spec)
  @Get()
  list(@Query('category') category?: string, @Query('search') search?: string, @Query('page') page?: string) {
    return this.catalogService.listProducts({
      categorySlug: category,
      search,
      page: page ? parseInt(page, 10) : undefined,
    });
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.catalogService.getBySlug(slug);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN')
  @Get('seller/mine')
  listOwn(@CurrentUser() user: { id: string }) {
    return this.catalogService.listOwnProducts(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/publish')
  publish(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.catalogService.publish(user.id, id);
  }
}
