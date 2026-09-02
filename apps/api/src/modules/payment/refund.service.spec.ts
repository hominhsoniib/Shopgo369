import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RefundService } from './refund.service';
import { PaymentStatus, RoleName } from '@prisma/client';

function makeMockPrisma() {
  return {
    order: { findUnique: jest.fn() },
    refund: { findFirst: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn() },
    payment: { update: jest.fn() },
    $executeRaw: jest.fn(),
  } as any;
}

function makeMockOrders() {
  return { markRefunded: jest.fn() };
}
function makeMockAccounting() {
  return { recordRefund: jest.fn() };
}
function makeMockInventory() {
  return { restockFromRefund: jest.fn() };
}

const CUSTOMER_ID = 'user-1';
const SELLER_ID = 'seller-1';

function baseOrder(overrides: any = {}) {
  return {
    id: 'order-1',
    userId: CUSTOMER_ID,
    payment: { id: 'pay-1', status: PaymentStatus.SUCCESS, amount: 500_000 },
    store: { business: { member: { userId: SELLER_ID } } },
    ...overrides,
  };
}

describe('RefundService.createRefund — khách hàng yêu cầu hoàn tiền', () => {
  let prisma: ReturnType<typeof makeMockPrisma>;
  let service: RefundService;

  beforeEach(() => {
    prisma = makeMockPrisma();
    service = new RefundService(prisma, makeMockOrders() as any, makeMockAccounting() as any, makeMockInventory() as any);
  });

  it('throw BadRequestException nếu không nêu lý do', async () => {
    await expect(service.createRefund(CUSTOMER_ID, 'order-1', undefined, '')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
  });

  it('throw ForbiddenException nếu không phải chủ đơn', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder({ userId: 'nguoi-khac' }));
    await expect(
      service.createRefund(CUSTOMER_ID, 'order-1', undefined, 'không đúng mô tả'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throw BadRequestException nếu đơn chưa thanh toán online thành công (payment null hoặc status khác SUCCESS)', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder({ payment: null }));
    await expect(
      service.createRefund(CUSTOMER_ID, 'order-1', undefined, 'lý do'),
    ).rejects.toThrow(BadRequestException);

    prisma.order.findUnique.mockResolvedValue(
      baseOrder({ payment: { id: 'pay-1', status: PaymentStatus.PENDING, amount: 500_000 } }),
    );
    await expect(
      service.createRefund(CUSTOMER_ID, 'order-1', undefined, 'lý do'),
    ).rejects.toThrow(BadRequestException);
  });

  it('★ throw BadRequestException nếu đơn ĐÃ CÓ refund trước đó — chỉ cho phép 1 refund/đơn (khớp ràng buộc DB unique orderId+category)', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder());
    prisma.refund.findFirst.mockResolvedValue({ id: 'refund-cu', status: PaymentStatus.PENDING });

    await expect(
      service.createRefund(CUSTOMER_ID, 'order-1', undefined, 'lý do'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.refund.create).not.toHaveBeenCalled();
  });

  it('throw BadRequestException nếu số tiền yêu cầu vượt quá số tiền đã thanh toán', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder());
    prisma.refund.findFirst.mockResolvedValue(null);

    await expect(
      service.createRefund(CUSTOMER_ID, 'order-1', 999_999, 'lý do'),
    ).rejects.toThrow(BadRequestException);
  });

  it('không truyền amount => mặc định hoàn TOÀN PHẦN theo đúng số tiền đã thanh toán', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder());
    prisma.refund.findFirst.mockResolvedValue(null);

    await service.createRefund(CUSTOMER_ID, 'order-1', undefined, 'đổi ý không mua nữa');

    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: {
        paymentId: 'pay-1',
        amount: 500_000,
        reason: 'đổi ý không mua nữa',
        status: PaymentStatus.PENDING,
      },
    });
  });

  it('hoàn MỘT PHẦN hợp lệ (amount < payment.amount) được tạo bình thường', async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder());
    prisma.refund.findFirst.mockResolvedValue(null);

    await service.createRefund(CUSTOMER_ID, 'order-1', 100_000, 'thiếu 1 sản phẩm trong đơn');

    expect(prisma.refund.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 100_000 }) }),
    );
  });
});

describe('RefundService.approveRefund — duyệt hoàn tiền, chống race condition', () => {
  let prisma: ReturnType<typeof makeMockPrisma>;
  let orders: ReturnType<typeof makeMockOrders>;
  let accounting: ReturnType<typeof makeMockAccounting>;
  let inventory: ReturnType<typeof makeMockInventory>;
  let service: RefundService;

  function mockRefundWithOrder(overrides: any = {}) {
    return {
      id: 'refund-1',
      amount: 500_000,
      reason: 'khách trả hàng',
      status: PaymentStatus.PENDING,
      payment: { id: 'pay-1', amount: 500_000, order: baseOrder() },
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = makeMockPrisma();
    orders = makeMockOrders();
    accounting = makeMockAccounting();
    inventory = makeMockInventory();
    service = new RefundService(prisma, orders as any, accounting as any, inventory as any);
  });

  it('throw ForbiddenException nếu actor không phải chủ store và không phải admin', async () => {
    prisma.refund.findUnique.mockResolvedValue(mockRefundWithOrder());
    prisma.order.findUnique.mockResolvedValue(baseOrder()); // dùng bởi assertCanProcess (query riêng, có include store)

    await expect(
      service.approveRefund('nguoi-la', [RoleName.CUSTOMER], 'refund-1'),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('cho phép ADMIN duyệt dù không phải chủ store (bỏ qua kiểm tra ownership, không cần query order riêng)', async () => {
    prisma.refund.findUnique.mockResolvedValue(mockRefundWithOrder());
    prisma.$executeRaw.mockResolvedValue(1);
    prisma.refund.findUniqueOrThrow.mockResolvedValue({ id: 'refund-1', status: PaymentStatus.SUCCESS });

    await service.approveRefund('admin-bat-ky', [RoleName.ADMIN], 'refund-1');
    expect(prisma.$executeRaw).toHaveBeenCalled();
    expect(prisma.order.findUnique).not.toHaveBeenCalled(); // admin không cần check ownership
  });

  it('★ throw BadRequestException nếu refund KHÔNG còn PENDING (affectedRows=0) — chống 2 admin duyệt trùng cùng lúc', async () => {
    prisma.refund.findUnique.mockResolvedValue(mockRefundWithOrder());
    prisma.$executeRaw.mockResolvedValue(0); // đã bị xử lý bởi request khác trước đó

    await expect(
      service.approveRefund('admin-x', [RoleName.ADMIN], 'refund-1'),
    ).rejects.toThrow(BadRequestException);

    // Không được ghi kế toán / hoàn kho / đổi trạng thái đơn khi thua race condition
    expect(accounting.recordRefund).not.toHaveBeenCalled();
    expect(orders.markRefunded).not.toHaveBeenCalled();
    expect(inventory.restockFromRefund).not.toHaveBeenCalled();
  });

  it('hoàn TOÀN PHẦN (amount = payment.amount): đổi payment sang REFUNDED, đơn sang REFUNDED, VÀ nhập lại kho', async () => {
    prisma.refund.findUnique.mockResolvedValue(mockRefundWithOrder({ amount: 500_000 }));
    prisma.order.findUnique.mockResolvedValue(baseOrder());
    prisma.$executeRaw.mockResolvedValue(1);
    prisma.refund.findUniqueOrThrow.mockResolvedValue({ id: 'refund-1', status: PaymentStatus.SUCCESS });

    await service.approveRefund(SELLER_ID, [RoleName.SELLER], 'refund-1');

    expect(accounting.recordRefund).toHaveBeenCalledWith('order-1', 500_000, 'khách trả hàng');
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: { status: PaymentStatus.REFUNDED },
    });
    expect(orders.markRefunded).toHaveBeenCalledWith('order-1', expect.stringContaining('toàn phần'));
    expect(inventory.restockFromRefund).toHaveBeenCalledWith('order-1');
  });

  it('★ hoàn MỘT PHẦN (amount < payment.amount): CHỈ ghi kế toán, KHÔNG đổi trạng thái đơn/payment, KHÔNG nhập lại kho', async () => {
    prisma.refund.findUnique.mockResolvedValue(mockRefundWithOrder({ amount: 100_000 }));
    prisma.order.findUnique.mockResolvedValue(baseOrder());
    prisma.$executeRaw.mockResolvedValue(1);
    prisma.refund.findUniqueOrThrow.mockResolvedValue({ id: 'refund-1', status: PaymentStatus.SUCCESS });

    await service.approveRefund(SELLER_ID, [RoleName.SELLER], 'refund-1');

    expect(accounting.recordRefund).toHaveBeenCalledWith('order-1', 100_000, 'khách trả hàng');
    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(orders.markRefunded).not.toHaveBeenCalled();
    expect(inventory.restockFromRefund).not.toHaveBeenCalled();
  });
});

describe('RefundService.rejectRefund', () => {
  let prisma: ReturnType<typeof makeMockPrisma>;
  let service: RefundService;

  beforeEach(() => {
    prisma = makeMockPrisma();
    service = new RefundService(prisma, makeMockOrders() as any, makeMockAccounting() as any, makeMockInventory() as any);
  });

  it('throw ForbiddenException nếu actor không có quyền', async () => {
    prisma.refund.findUnique.mockResolvedValue({
      id: 'refund-1',
      status: PaymentStatus.PENDING,
      payment: { id: 'pay-1', amount: 500_000, order: baseOrder() },
    });
    prisma.order.findUnique.mockResolvedValue(baseOrder());

    await expect(
      service.rejectRefund('nguoi-la', [RoleName.CUSTOMER], 'refund-1', 'không hợp lệ'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throw BadRequestException nếu refund không còn PENDING', async () => {
    prisma.refund.findUnique.mockResolvedValue({
      id: 'refund-1',
      status: PaymentStatus.SUCCESS,
      payment: { id: 'pay-1', amount: 500_000, order: baseOrder() },
    });
    prisma.order.findUnique.mockResolvedValue(baseOrder());
    prisma.$executeRaw.mockResolvedValue(0);

    await expect(
      service.rejectRefund(SELLER_ID, [RoleName.SELLER], 'refund-1', 'không hợp lệ'),
    ).rejects.toThrow(BadRequestException);
  });

  it('seller chủ store từ chối thành công', async () => {
    prisma.refund.findUnique.mockResolvedValue({
      id: 'refund-1',
      status: PaymentStatus.PENDING,
      payment: { id: 'pay-1', amount: 500_000, order: baseOrder() },
    });
    prisma.order.findUnique.mockResolvedValue(baseOrder());
    prisma.$executeRaw.mockResolvedValue(1);
    prisma.refund.findUniqueOrThrow.mockResolvedValue({ id: 'refund-1', status: PaymentStatus.FAILED });

    const result = await service.rejectRefund(SELLER_ID, [RoleName.SELLER], 'refund-1', 'ảnh chứng minh không hợp lệ');
    expect(result.status).toBe(PaymentStatus.FAILED);
  });
});
