import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy hoặc tạo giỏ hàng cho user (mỗi user 1 cart duy nhất — Phase 2: chỉ hỗ trợ user đã đăng nhập) */
  private async getOrCreateCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: { include: { images: true, inventory: true, store: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.product.basePrice) * item.quantity,
      0,
    );

    return { cartId: cart.id, items, subtotal };
  }

  async addItem(userId: string, productId: string, quantity: number) {
    if (quantity <= 0) throw new BadRequestException('Số lượng phải lớn hơn 0');

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true },
    });
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc đã ngừng bán');
    }

    const cart = await this.getOrCreateCart(userId);

    return this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      update: { quantity: { increment: quantity } },
      create: { cartId: cart.id, productId, quantity },
    });
  }

  async updateItemQuantity(userId: string, productId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }
    return this.prisma.cartItem.update({
      where: { cartId_productId: { cartId: cart.id, productId } },
      data: { quantity },
    });
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getOrCreateCart(userId);
    return this.prisma.cartItem.delete({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
  }

  /** Xoá sạch giỏ hàng sau khi checkout thành công (gọi từ OrdersService) */
  async clearCart(userId: string, productIds?: string[]) {
    const cart = await this.getOrCreateCart(userId);
    return this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, ...(productIds ? { productId: { in: productIds } } : {}) },
    });
  }
}
