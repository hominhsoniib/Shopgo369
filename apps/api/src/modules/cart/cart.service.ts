import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus, StoreStatus } from '@prisma/client';

/**
 * Định danh chủ sở hữu giỏ hàng — CHÍNH XÁC 1 trong 2 trường được điền:
 * - userId: khách đã đăng nhập
 * - sessionId: khách vãng lai (guest), do FE tự sinh UUID và lưu localStorage/cookie
 *   (Mục bổ sung Phase 2: Guest cart — cho phép thêm giỏ hàng trước khi đăng nhập,
 *   giống hành vi chuẩn của các sàn TMĐT, giảm tỷ lệ rời trang ở bước đầu phễu mua hàng).
 */
export interface CartIdentity {
  userId?: string;
  sessionId?: string;
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private assertIdentity(identity: CartIdentity) {
    if (!identity.userId && !identity.sessionId) {
      throw new BadRequestException(
        'Thiếu định danh giỏ hàng — cần đăng nhập hoặc gửi kèm header X-Guest-Cart-Id',
      );
    }
  }

  /** Lấy hoặc tạo giỏ hàng theo userId (đã đăng nhập) HOẶC sessionId (guest) */
  private async getOrCreateCart(identity: CartIdentity) {
    this.assertIdentity(identity);

    if (identity.userId) {
      return this.prisma.cart.upsert({
        where: { userId: identity.userId },
        update: {},
        create: { userId: identity.userId },
      });
    }

    return this.prisma.cart.upsert({
      where: { sessionId: identity.sessionId },
      update: {},
      create: { sessionId: identity.sessionId },
    });
  }

  async getCart(identity: CartIdentity) {
    const cart = await this.getOrCreateCart(identity);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: {
          include: {
            images: true,
            inventory: true,
            store: {
              include: {
                business: { select: { id: true, businessName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.product.basePrice) * item.quantity,
      0,
    );

    return { cartId: cart.id, isGuest: !identity.userId, items, subtotal };
  }

  async addItem(identity: CartIdentity, productId: string, quantity: number) {
    if (quantity <= 0) throw new BadRequestException('Số lượng phải lớn hơn 0');

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true, store: true },
    });
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc đã ngừng bán');
    }
    // Chặn thêm sản phẩm của gian hàng đã bị admin khoá/tạm ngưng — an toàn
    // thứ 2 phòng trường hợp gọi thẳng API bỏ qua trang danh sách đã lọc.
    if (product.store.status !== StoreStatus.ACTIVE) {
      throw new BadRequestException('Gian hàng của sản phẩm này hiện không hoạt động');
    }

    const cart = await this.getOrCreateCart(identity);

    return this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      update: { quantity: { increment: quantity } },
      create: { cartId: cart.id, productId, quantity },
    });
  }

  async updateItemQuantity(identity: CartIdentity, productId: string, quantity: number) {
    const cart = await this.getOrCreateCart(identity);
    if (quantity <= 0) {
      return this.removeItem(identity, productId);
    }
    return this.prisma.cartItem.update({
      where: { cartId_productId: { cartId: cart.id, productId } },
      data: { quantity },
    });
  }

  async removeItem(identity: CartIdentity, productId: string) {
    const cart = await this.getOrCreateCart(identity);
    return this.prisma.cartItem.delete({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
  }

  /** Xoá sạch giỏ hàng sau khi checkout thành công (gọi từ OrdersService) */
  async clearCart(identity: CartIdentity, productIds?: string[]) {
    const cart = await this.getOrCreateCart(identity);
    return this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, ...(productIds ? { productId: { in: productIds } } : {}) },
    });
  }

  /**
   * Merge giỏ hàng GUEST vào giỏ hàng USER khi đăng nhập — gọi từ FE ngay sau
   * khi login thành công, kèm sessionId guest đã lưu trước đó. Sản phẩm trùng
   * giữa 2 giỏ được CỘNG DỒN số lượng (không ghi đè), giống hành vi merge cart
   * chuẩn của các sàn TMĐT. Idempotent: nếu gọi lại lần 2 với cùng sessionId
   * (đã merge/xoá trước đó), sẽ không tìm thấy guest cart và trả về không làm gì.
   */
  async mergeGuestCartIntoUser(userId: string, sessionId: string) {
    const guestCart = await this.prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });
    if (!guestCart || guestCart.items.length === 0) {
      return { merged: 0 };
    }

    const userCart = await this.getOrCreateCart({ userId });

    await this.prisma.$transaction(async (tx) => {
      for (const item of guestCart.items) {
        await tx.cartItem.upsert({
          where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
          update: { quantity: { increment: item.quantity } },
          create: { cartId: userCart.id, productId: item.productId, quantity: item.quantity },
        });
      }
      // Xoá giỏ hàng guest sau khi merge xong — cascade xoá luôn CartItem của nó.
      await tx.cart.delete({ where: { id: guestCart.id } });
    });

    return { merged: guestCart.items.length };
  }
}
