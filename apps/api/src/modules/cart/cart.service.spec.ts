import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';
import { ProductStatus } from '@prisma/client';

function makeMockPrisma() {
  const tx = {
    cartItem: { upsert: jest.fn() },
    cart: { delete: jest.fn() },
  };
  return {
    cart: { upsert: jest.fn(), findUnique: jest.fn() },
    cartItem: { findMany: jest.fn(), upsert: jest.fn(), update: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
    product: { findUnique: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(tx)),
    __tx: tx,
  } as any;
}

describe('CartService — định danh giỏ hàng (user đăng nhập vs guest)', () => {
  let prisma: ReturnType<typeof makeMockPrisma>;
  let service: CartService;

  beforeEach(() => {
    prisma = makeMockPrisma();
    service = new CartService(prisma);
  });

  it('throw BadRequestException nếu KHÔNG có cả userId lẫn sessionId', async () => {
    await expect(service.getCart({})).rejects.toThrow(BadRequestException);
  });

  it('có userId: tạo/lấy cart theo userId, KHÔNG dùng sessionId', async () => {
    prisma.cart.upsert.mockResolvedValue({ id: 'cart-1' });
    prisma.cartItem.findMany.mockResolvedValue([]);

    const result = await service.getCart({ userId: 'user-1' });

    expect(prisma.cart.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: {},
      create: { userId: 'user-1' },
    });
    expect(result.isGuest).toBe(false);
  });

  it('chỉ có sessionId (guest): tạo/lấy cart theo sessionId', async () => {
    prisma.cart.upsert.mockResolvedValue({ id: 'cart-guest-1' });
    prisma.cartItem.findMany.mockResolvedValue([]);

    const result = await service.getCart({ sessionId: 'guest-uuid-1' });

    expect(prisma.cart.upsert).toHaveBeenCalledWith({
      where: { sessionId: 'guest-uuid-1' },
      update: {},
      create: { sessionId: 'guest-uuid-1' },
    });
    expect(result.isGuest).toBe(true);
  });

  it('guest vẫn thêm được sản phẩm vào giỏ (addItem) như user thường', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'p1', status: ProductStatus.ACTIVE });
    prisma.cart.upsert.mockResolvedValue({ id: 'cart-guest-1' });

    await service.addItem({ sessionId: 'guest-uuid-1' }, 'p1', 2);

    expect(prisma.cartItem.upsert).toHaveBeenCalledWith({
      where: { cartId_productId: { cartId: 'cart-guest-1', productId: 'p1' } },
      update: { quantity: { increment: 2 } },
      create: { cartId: 'cart-guest-1', productId: 'p1', quantity: 2 },
    });
  });

  it('throw NotFoundException nếu sản phẩm ngừng bán, kể cả với guest', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'p1', status: ProductStatus.DRAFT });

    await expect(service.addItem({ sessionId: 'guest-uuid-1' }, 'p1', 1)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('CartService.mergeGuestCartIntoUser — gộp giỏ hàng khi đăng nhập', () => {
  let prisma: ReturnType<typeof makeMockPrisma>;
  let service: CartService;

  beforeEach(() => {
    prisma = makeMockPrisma();
    service = new CartService(prisma);
  });

  it('guest cart không tồn tại hoặc rỗng: không làm gì, trả về merged=0', async () => {
    prisma.cart.findUnique.mockResolvedValue(null);

    const result = await service.mergeGuestCartIntoUser('user-1', 'guest-uuid-x');

    expect(result).toEqual({ merged: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('★ merge đúng: CỘNG DỒN số lượng sản phẩm trùng, giữ nguyên sản phẩm không trùng, rồi XOÁ guest cart', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'guest-cart-1',
      items: [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 1 },
      ],
    });
    prisma.cart.upsert.mockResolvedValue({ id: 'user-cart-1' }); // getOrCreateCart({userId}) bên trong merge

    const result = await service.mergeGuestCartIntoUser('user-1', 'guest-uuid-1');

    expect(prisma.__tx.cartItem.upsert).toHaveBeenCalledWith({
      where: { cartId_productId: { cartId: 'user-cart-1', productId: 'p1' } },
      update: { quantity: { increment: 2 } },
      create: { cartId: 'user-cart-1', productId: 'p1', quantity: 2 },
    });
    expect(prisma.__tx.cartItem.upsert).toHaveBeenCalledWith({
      where: { cartId_productId: { cartId: 'user-cart-1', productId: 'p2' } },
      update: { quantity: { increment: 1 } },
      create: { cartId: 'user-cart-1', productId: 'p2', quantity: 1 },
    });
    expect(prisma.__tx.cart.delete).toHaveBeenCalledWith({ where: { id: 'guest-cart-1' } });
    expect(result).toEqual({ merged: 2 });
  });

  it('merge chạy trong 1 DB transaction duy nhất (không phải nhiều lệnh rời rạc)', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'guest-cart-1',
      items: [{ productId: 'p1', quantity: 1 }],
    });
    prisma.cart.upsert.mockResolvedValue({ id: 'user-cart-1' });

    await service.mergeGuestCartIntoUser('user-1', 'guest-uuid-1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
