import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CartService, CartIdentity } from './cart.service';

class AddCartItemDto {
  @IsNotEmpty() productId: string;
  @IsInt() @Min(1) quantity: number;
}

class UpdateCartItemDto {
  @IsInt() @Min(0) quantity: number;
}

class MergeGuestCartDto {
  @IsUUID() sessionId: string;
}

/**
 * Giỏ hàng hỗ trợ CẢ khách vãng lai (guest) LẪN người đã đăng nhập:
 * - Đã đăng nhập: định danh theo userId (JWT), giống hành vi cũ.
 * - Chưa đăng nhập (guest): FE tự sinh 1 UUID, lưu localStorage, gửi kèm
 *   MỌI request tới /cart qua header `X-Guest-Cart-Id`.
 * - Khi user đăng nhập, FE gọi POST /cart/merge kèm sessionId guest cũ để
 *   gộp giỏ hàng guest vào giỏ hàng user (cộng dồn số lượng trùng sản phẩm).
 */
@ApiTags('cart')
@ApiHeader({
  name: 'X-Guest-Cart-Id',
  required: false,
  description: 'UUID giỏ hàng khách vãng lai — bắt buộc nếu chưa đăng nhập (Bearer token)',
})
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private buildIdentity(user: { id: string } | undefined, guestCartId?: string): CartIdentity {
    return user ? { userId: user.id } : { sessionId: guestCartId };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  getCart(
    @CurrentUser() user: { id: string } | undefined,
    @Headers('x-guest-cart-id') guestCartId?: string,
  ) {
    return this.cartService.getCart(this.buildIdentity(user, guestCartId));
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('items')
  addItem(
    @CurrentUser() user: { id: string } | undefined,
    @Body() dto: AddCartItemDto,
    @Headers('x-guest-cart-id') guestCartId?: string,
  ) {
    return this.cartService.addItem(this.buildIdentity(user, guestCartId), dto.productId, dto.quantity);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Patch('items/:productId')
  updateItem(
    @CurrentUser() user: { id: string } | undefined,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
    @Headers('x-guest-cart-id') guestCartId?: string,
  ) {
    return this.cartService.updateItemQuantity(this.buildIdentity(user, guestCartId), productId, dto.quantity);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Delete('items/:productId')
  removeItem(
    @CurrentUser() user: { id: string } | undefined,
    @Param('productId') productId: string,
    @Headers('x-guest-cart-id') guestCartId?: string,
  ) {
    return this.cartService.removeItem(this.buildIdentity(user, guestCartId), productId);
  }

  /** Chỉ dùng khi ĐÃ đăng nhập thật — gộp giỏ hàng guest cũ vào giỏ hàng user */
  @UseGuards(JwtAuthGuard)
  @Post('merge')
  mergeGuestCart(@CurrentUser() user: { id: string }, @Body() dto: MergeGuestCartDto) {
    return this.cartService.mergeGuestCartIntoUser(user.id, dto.sessionId);
  }
}
