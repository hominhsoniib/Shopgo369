import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ReservationStatus } from '@prisma/client';

/**
 * Test double cho $transaction: hỗ trợ cả 2 cách InventoryService dùng nó:
 *  - callback style: prisma.$transaction(async (tx) => {...})  → dùng trong reserveStock
 *  - array style:     prisma.$transaction([opA, opB])           → dùng trong commit/release
 */
function makeMockPrisma() {
  const tx = {
    productInventory: { findUnique: jest.fn(), update: jest.fn() },
    inventoryReservation: { create: jest.fn(), update: jest.fn() },
  };
  const prisma: any = {
    productInventory: { update: jest.fn(), upsert: jest.fn() },
    inventoryReservation: { findMany: jest.fn(), update: jest.fn() },
    product: { findUnique: jest.fn() },
    $transaction: jest.fn((arg: any) =>
      typeof arg === 'function' ? arg(tx) : Promise.all(arg),
    ),
  };
  return { prisma, tx };
}

// runExclusive thực thi callback ngay lập tức (bỏ qua cơ chế lock thật) nhưng
// ta vẫn spy để assert đúng lockKey được dùng — đây chính là điều đảm bảo
// chống oversell (mọi request cùng productId phải bị serialize qua đúng key).
function makeMockLockService() {
  return {
    runExclusive: jest.fn((_key: string, fn: () => Promise<any>) => fn()),
  };
}

describe('InventoryService — chống oversell (reserveStock)', () => {
  let prisma: ReturnType<typeof makeMockPrisma>['prisma'];
  let tx: ReturnType<typeof makeMockPrisma>['tx'];
  let lockService: ReturnType<typeof makeMockLockService>;
  let service: InventoryService;

  beforeEach(() => {
    ({ prisma, tx } = makeMockPrisma());
    lockService = makeMockLockService();
    service = new InventoryService(prisma, lockService as any);
  });

  it('giành lock đúng theo productId trước khi kiểm tra tồn kho', async () => {
    tx.productInventory.findUnique.mockResolvedValue({
      productId: 'p1',
      quantityOnHand: 10,
      reservedQuantity: 0,
    });

    await service.reserveStock('p1', 'order-1', 2);

    expect(lockService.runExclusive).toHaveBeenCalledWith(
      'lock:inventory:p1',
      expect.any(Function),
    );
  });

  it('throw BadRequestException nếu sản phẩm chưa có bản ghi tồn kho', async () => {
    tx.productInventory.findUnique.mockResolvedValue(null);

    await expect(service.reserveStock('p1', 'order-1', 1)).rejects.toThrow(
      BadRequestException,
    );
    expect(tx.productInventory.update).not.toHaveBeenCalled();
  });

  it('throw BadRequestException khi available (onHand - reserved) < quantity yêu cầu — CHẶN OVERSELL', async () => {
    tx.productInventory.findUnique.mockResolvedValue({
      productId: 'p1',
      quantityOnHand: 5,
      reservedQuantity: 4, // available = 1
    });

    await expect(service.reserveStock('p1', 'order-1', 2)).rejects.toThrow(
      BadRequestException,
    );
    // Không được tăng reservedQuantity khi từ chối — nếu không sẽ leak số đếm.
    expect(tx.productInventory.update).not.toHaveBeenCalled();
    expect(tx.inventoryReservation.create).not.toHaveBeenCalled();
  });

  it('cho phép giữ đúng bằng available (biên) và tăng reservedQuantity + tạo reservation TTL 15 phút', async () => {
    tx.productInventory.findUnique.mockResolvedValue({
      productId: 'p1',
      quantityOnHand: 10,
      reservedQuantity: 7, // available = 3
    });

    const before = Date.now();
    await service.reserveStock('p1', 'order-1', 3); // đúng bằng available
    const after = Date.now();

    expect(tx.productInventory.update).toHaveBeenCalledWith({
      where: { productId: 'p1' },
      data: { reservedQuantity: { increment: 3 } },
    });

    const createArg = tx.inventoryReservation.create.mock.calls[0][0];
    expect(createArg.data).toMatchObject({
      productId: 'p1',
      orderId: 'order-1',
      quantity: 3,
      status: ReservationStatus.ACTIVE,
    });
    const ttlMs = createArg.data.expiresAt.getTime() - before;
    expect(ttlMs).toBeGreaterThan(14 * 60 * 1000);
    expect(createArg.data.expiresAt.getTime()).toBeLessThanOrEqual(after + 15 * 60 * 1000);
  });

  it('2 request đồng thời cùng sản phẩm: request thứ 2 phải thấy tồn kho đã bị request 1 trừ đi (giả lập lock tuần tự)', async () => {
    // Giả lập DB thật: findUnique trả về state MỚI NHẤT sau khi request 1 đã update.
    let reserved = 0;
    tx.productInventory.findUnique.mockImplementation(async () => ({
      productId: 'p1',
      quantityOnHand: 5,
      reservedQuantity: reserved,
    }));
    tx.productInventory.update.mockImplementation(async ({ data }: any) => {
      reserved += data.reservedQuantity.increment;
    });

    // available = 5. Request 1 giữ 4 → còn 1. Request 2 xin 3 → phải bị từ chối.
    await service.reserveStock('p1', 'order-1', 4);
    await expect(service.reserveStock('p1', 'order-2', 3)).rejects.toThrow(
      BadRequestException,
    );
    expect(reserved).toBe(4); // request 2 không được cộng thêm
  });
});

describe('InventoryService — commitReservation / releaseReservation', () => {
  let prisma: ReturnType<typeof makeMockPrisma>['prisma'];
  let lockService: ReturnType<typeof makeMockLockService>;
  let service: InventoryService;

  beforeEach(() => {
    ({ prisma } = makeMockPrisma());
    lockService = makeMockLockService();
    service = new InventoryService(prisma, lockService as any);
  });

  it('commitReservation: trừ vĩnh viễn quantityOnHand + xoá reservedQuantity + đánh dấu COMMITTED', async () => {
    prisma.inventoryReservation.findMany.mockResolvedValue([
      { id: 'r1', productId: 'p1', quantity: 3, status: ReservationStatus.ACTIVE },
    ]);

    await service.commitReservation('order-1');

    expect(prisma.productInventory.update).toHaveBeenCalledWith({
      where: { productId: 'p1' },
      data: { quantityOnHand: { decrement: 3 }, reservedQuantity: { decrement: 3 } },
    });
    expect(prisma.inventoryReservation.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { status: ReservationStatus.COMMITTED },
    });
  });

  it('releaseReservation: CHỈ nhả reservedQuantity (không đụng quantityOnHand) + đánh dấu RELEASED', async () => {
    prisma.inventoryReservation.findMany.mockResolvedValue([
      { id: 'r1', productId: 'p1', quantity: 3, status: ReservationStatus.ACTIVE },
    ]);

    await service.releaseReservation('order-1');

    expect(prisma.productInventory.update).toHaveBeenCalledWith({
      where: { productId: 'p1' },
      data: { reservedQuantity: { decrement: 3 } },
    });
    expect(prisma.inventoryReservation.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { status: ReservationStatus.RELEASED },
    });
  });
});

describe('InventoryService — adjustStock (seller điều chỉnh kho)', () => {
  let prisma: ReturnType<typeof makeMockPrisma>['prisma'];
  let lockService: ReturnType<typeof makeMockLockService>;
  let service: InventoryService;

  beforeEach(() => {
    ({ prisma } = makeMockPrisma());
    lockService = makeMockLockService();
    service = new InventoryService(prisma, lockService as any);
  });

  it('throw ForbiddenException nếu không phải chủ sản phẩm', async () => {
    prisma.product.findUnique.mockResolvedValue({
      store: { business: { member: { userId: 'owner-1' } } },
      inventory: { reservedQuantity: 0 },
    });

    await expect(
      service.adjustStock('attacker-2', 'p1', 100),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throw NotFoundException nếu sản phẩm không tồn tại', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.adjustStock('u1', 'p1', 10)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throw BadRequestException nếu đặt tồn kho mới thấp hơn số đang giữ chỗ cho đơn chưa xử lý', async () => {
    prisma.product.findUnique.mockResolvedValue({
      store: { business: { member: { userId: 'owner-1' } } },
      inventory: { reservedQuantity: 5 },
    });

    await expect(service.adjustStock('owner-1', 'p1', 3)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.productInventory.upsert).not.toHaveBeenCalled();
  });
});
