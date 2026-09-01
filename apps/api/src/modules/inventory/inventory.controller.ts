import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';

class AdjustStockDto {
  @IsInt() @Min(0) quantityOnHand: number;
}

@ApiTags('seller-inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN')
@Controller('seller/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  listOwn(@CurrentUser() user: { id: string }) {
    return this.inventoryService.listOwnInventory(user.id);
  }

  @Patch(':productId')
  adjust(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(user.id, productId, dto.quantityOnHand);
  }
}
