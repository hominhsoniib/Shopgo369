import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CartService } from './cart.service';

class AddCartItemDto {
  @IsNotEmpty() productId: string;
  @IsInt() @Min(1) quantity: number;
}

class UpdateCartItemDto {
  @IsInt() @Min(0) quantity: number;
}

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: { id: string }) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  addItem(@CurrentUser() user: { id: string }, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.id, dto.productId, dto.quantity);
  }

  @Patch('items/:productId')
  updateItem(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(user.id, productId, dto.quantity);
  }

  @Delete('items/:productId')
  removeItem(@CurrentUser() user: { id: string }, @Param('productId') productId: string) {
    return this.cartService.removeItem(user.id, productId);
  }
}
