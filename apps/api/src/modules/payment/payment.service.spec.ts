import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentStatus } from '@prisma/client';

function makeMockPrisma() {
  const tx = {
    paymentTransaction: { findUnique: jest.fn(), update: jest.fn() },
    payment: { update: jest.fn() },
  };
  const prisma: any = {
    $transaction: jest.fn((cb: any) => cb(tx)),
  };
  return { prisma, tx };
}

function makeMockGateway() {
  return { verifyWebhook: jest.fn() };
}

function makeMockOrdersService() {
  return { markAsPaid: jest.fn(), markPaymentFailed: jest.fn() };
}

function makeMockConfig() {
  return { get: jest.fn() };
}

describe('PaymentService.handleWebhook — idempotency chống xử lý trùng', () => {
  let prisma: ReturnType<typeof makeMockPrisma>['prisma'];
  let tx: ReturnType<typeof makeMockPrisma>['tx'];
  let gateway: ReturnType<typeof makeMockGateway>;
  let ordersService: ReturnType<typeof makeMockOrdersService>;
  let service: PaymentService;

  beforeEach(() => {
    ({ prisma, tx } = makeMockPrisma());
    gateway = makeMockGateway();
    ordersService = makeMockOrdersService();
    service = new PaymentService(
      prisma,
      ordersService as any,
      gateway as any,
      makeMockConfig() as any,
    );
  });

  it('từ chối ngay nếu chữ ký webhook không hợp lệ — KHÔNG động vào DB', async () => {
    gateway.verifyWebhook.mockReturnValue({ isValid: false });

    await expect(service.handleWebhook({ signature: 'bad' })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throw NotFoundException nếu không tìm thấy transaction tương ứng gatewayTransactionId', async () => {
    gateway.verifyWebhook.mockReturnValue({
      isValid: true,
      orderId: 'o1',
      gatewayTransactionId: 'TX-1',
      success: true,
    });
    tx.paymentTransaction.findUnique.mockResolvedValue(null);

    await expect(service.handleWebhook({})).rejects.toThrow(NotFoundException);
  });

  it('webhook gọi LẦN ĐẦU (status=PENDING, success=true): cập nhật SUCCESS + gọi ordersService.markAsPaid', async () => {
    gateway.verifyWebhook.mockReturnValue({
      isValid: true,
      orderId: 'o1',
      gatewayTransactionId: 'TX-1',
      success: true,
    });
    tx.paymentTransaction.findUnique.mockResolvedValue({
      id: 'pt1',
      paymentId: 'pay1',
      status: PaymentStatus.PENDING,
    });

    const result = await service.handleWebhook({ orderId: 'o1' });

    expect(result).toEqual({ alreadyProcessed: false, orderId: 'o1', success: true });
    expect(tx.paymentTransaction.update).toHaveBeenCalledWith({
      where: { id: 'pt1' },
      data: expect.objectContaining({ status: PaymentStatus.SUCCESS }),
    });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay1' },
      data: { status: PaymentStatus.SUCCESS },
    });
    expect(ordersService.markAsPaid).toHaveBeenCalledWith('o1');
    expect(ordersService.markPaymentFailed).not.toHaveBeenCalled();
  });

  it('webhook gọi LẦN ĐẦU với success=false: cập nhật FAILED + gọi markPaymentFailed (không phải markAsPaid)', async () => {
    gateway.verifyWebhook.mockReturnValue({
      isValid: true,
      orderId: 'o1',
      gatewayTransactionId: 'TX-1',
      success: false,
    });
    tx.paymentTransaction.findUnique.mockResolvedValue({
      id: 'pt1',
      paymentId: 'pay1',
      status: PaymentStatus.PENDING,
    });

    await service.handleWebhook({ orderId: 'o1' });

    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay1' },
      data: { status: PaymentStatus.FAILED },
    });
    expect(ordersService.markPaymentFailed).toHaveBeenCalledWith('o1');
    expect(ordersService.markAsPaid).not.toHaveBeenCalled();
  });

  it('★ webhook TRÙNG LẶP (gateway retry / replay) khi transaction đã ở trạng thái final: bỏ qua hoàn toàn — KHÔNG update lại, KHÔNG cộng tiền/gọi markAsPaid lần 2', async () => {
    gateway.verifyWebhook.mockReturnValue({
      isValid: true,
      orderId: 'o1',
      gatewayTransactionId: 'TX-1',
      success: true,
    });
    // Transaction đã được webhook lần đầu xử lý xong → status không còn PENDING
    tx.paymentTransaction.findUnique.mockResolvedValue({
      id: 'pt1',
      paymentId: 'pay1',
      status: PaymentStatus.SUCCESS,
    });

    const result = await service.handleWebhook({ orderId: 'o1' });

    expect(result).toEqual({ alreadyProcessed: true });
    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(ordersService.markAsPaid).not.toHaveBeenCalled();
    expect(ordersService.markPaymentFailed).not.toHaveBeenCalled();
  });

  it('★ webhook trùng lặp với status=FAILED (đã final) cũng phải bỏ qua, kể cả nếu payload lần này báo success=true', async () => {
    gateway.verifyWebhook.mockReturnValue({
      isValid: true,
      orderId: 'o1',
      gatewayTransactionId: 'TX-1',
      success: true, // kẻ tấn công / gateway gửi lại nhưng đổi kết quả — vẫn phải bị chặn
    });
    tx.paymentTransaction.findUnique.mockResolvedValue({
      id: 'pt1',
      paymentId: 'pay1',
      status: PaymentStatus.FAILED,
    });

    const result = await service.handleWebhook({ orderId: 'o1' });

    expect(result).toEqual({ alreadyProcessed: true });
    expect(ordersService.markAsPaid).not.toHaveBeenCalled();
  });

  it('gọi ordersService.markAsPaid SAU KHI transaction Prisma đã commit (không lồng trong transaction thanh toán)', async () => {
    let transactionResolved = false;
    prisma.$transaction.mockImplementation(async (cb: any) => {
      const result = await cb(tx);
      transactionResolved = true;
      return result;
    });
    gateway.verifyWebhook.mockReturnValue({
      isValid: true,
      orderId: 'o1',
      gatewayTransactionId: 'TX-1',
      success: true,
    });
    tx.paymentTransaction.findUnique.mockResolvedValue({
      id: 'pt1',
      paymentId: 'pay1',
      status: PaymentStatus.PENDING,
    });
    ordersService.markAsPaid.mockImplementation(async () => {
      expect(transactionResolved).toBe(true); // transaction Payment phải đã commit trước
    });

    await service.handleWebhook({ orderId: 'o1' });
    expect(ordersService.markAsPaid).toHaveBeenCalled();
  });
});
