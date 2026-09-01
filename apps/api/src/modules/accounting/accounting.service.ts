import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ExpenseCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);
  private readonly platformFeeRate: number; // vd: 0.02 = 2% (Mục 13 spec: mô hình kinh doanh)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.platformFeeRate = parseFloat(this.config.get('PLATFORM_FEE_RATE') ?? '0.02');
  }

  /**
   * Ghi bút toán gốc khi đơn hàng được xác nhận thanh toán (order.paid) —
   * gọi trực tiếp từ OrdersService, KHÔNG qua queue, để đảm bảo tính nhất
   * quán với trạng thái đơn hàng (Mục 3.6.1, 3.6.6 spec: "bút toán gốc bắt
   * buộc nằm trong luồng xử lý order.paid, đảm bảo transactional integrity").
   *
   * Idempotent: IncomeTransaction.orderId là UNIQUE — nếu hàm này vô tình
   * được gọi 2 lần cho cùng 1 đơn (bug, retry...), lần thứ 2 sẽ bắt lỗi unique
   * constraint và bị bỏ qua an toàn (catch bên dưới).
   */
  async recordOrderPaid(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const existing = await this.prisma.incomeTransaction.findUnique({ where: { orderId } });
    if (existing) {
      this.logger.log(`Đơn ${order.orderCode} đã được ghi kế toán trước đó — bỏ qua (idempotent)`);
      return;
    }

    const revenue = Number(order.subtotal) - Number(order.discountAmount);
    const platformFee = Math.round(revenue * this.platformFeeRate);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.incomeTransaction.create({
        data: {
          storeId: order.storeId,
          orderId: order.id,
          amount: revenue,
          description: `Doanh thu bán hàng — đơn ${order.orderCode}`,
          occurredAt: now,
        },
      });

      await tx.expenseTransaction.create({
        data: {
          storeId: order.storeId,
          orderId: order.id,
          category: ExpenseCategory.PLATFORM_FEE,
          amount: platformFee,
          description: `Phí sàn ${(this.platformFeeRate * 100).toFixed(1)}% — đơn ${order.orderCode}`,
          occurredAt: now,
        },
      });

      // Ghi chi phí hoa hồng giới thiệu ở đây khi Phase 5 hoàn thiện
      // CommissionService — để nguyên comment làm điểm nối rõ ràng giữa 2 phase.
    });

    this.logger.log(`Đã ghi kế toán cho đơn ${order.orderCode}: +${revenue}đ doanh thu, -${platformFee}đ phí sàn`);
  }

  /**
   * Ghi bút toán đảo khi đơn bị hoàn/huỷ SAU khi đã ghi nhận doanh thu
   * (Mục 4.4 spec: "order.refunded → accounting_entries đảo bút toán tương ứng").
   */
  async reverseOrderIncome(orderId: string, reason: string): Promise<void> {
    const income = await this.prisma.incomeTransaction.findUnique({ where: { orderId } });
    if (!income) return; // chưa từng ghi nhận doanh thu — không có gì để đảo

    await this.prisma.expenseTransaction.create({
      data: {
        storeId: income.storeId,
        orderId,
        category: ExpenseCategory.REFUND,
        amount: income.amount,
        description: `Hoàn tiền/đảo doanh thu — ${reason}`,
        occurredAt: new Date(),
      },
    });
  }

  /**
   * Sổ Thu-Chi cơ bản cho seller (Mục 3.6.1 spec: "API CRUD cơ bản: xem sổ
   * thu-chi theo ngày/tháng — query đơn giản, KHÔNG phải báo cáo nặng").
   * Báo cáo P&L đầy đủ + dự báo sẽ do Python Accounting Service đảm nhiệm
   * (Phase 4 — Mục 3.6.3: tách tải sang Read Replica).
   */
  async getLedger(userId: string, from: Date, to: Date) {
    const store = await this.prisma.store.findFirst({ where: { business: { member: { userId } } } });
    if (!store) throw new NotFoundException('Bạn chưa có gian hàng');

    const [incomes, expenses] = await this.prisma.$transaction([
      this.prisma.incomeTransaction.findMany({
        where: { storeId: store.id, occurredAt: { gte: from, lte: to } },
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.expenseTransaction.findMany({
        where: { storeId: store.id, occurredAt: { gte: from, lte: to } },
        orderBy: { occurredAt: 'desc' },
      }),
    ]);

    const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
    const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);

    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      incomes,
      expenses,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Cầu nối sang Python Accounting Service (Mục 3.6.2 sơ đồ kiến trúc):
  // "NestJS expose GET /api/v1/accounting/reports/* (đọc từ accounting_reports
  // — FE gọi qua NestJS, KHÔNG gọi thẳng Python service từ frontend)"
  // ═══════════════════════════════════════════════════════════════════════

  /** Đọc báo cáo P&L đã được Python tính sẵn theo lịch (Celery Beat) — query đơn giản, KHÔNG gọi Python */
  async getStoredReports(userId: string, periodType: 'DAILY' | 'MONTHLY', limit = 30) {
    const store = await this.prisma.store.findFirst({ where: { business: { member: { userId } } } });
    if (!store) throw new NotFoundException('Bạn chưa có gian hàng');

    return this.prisma.accountingReport.findMany({
      where: { storeId: store.id, periodType },
      orderBy: { periodStart: 'desc' },
      take: limit,
    });
  }

  /** Đọc dự báo doanh thu đã lưu (do Celery Beat chạy hàng tuần) */
  async getStoredForecasts(userId: string) {
    const store = await this.prisma.store.findFirst({ where: { business: { member: { userId } } } });
    if (!store) throw new NotFoundException('Bạn chưa có gian hàng');

    return this.prisma.revenueForecast.findMany({
      where: { storeId: store.id, forecastDate: { gte: new Date() } },
      orderBy: { forecastDate: 'asc' },
    });
  }

  /** Đọc số liệu đề xuất kê khai thuế theo quý đã lưu */
  async getStoredTaxEstimations(userId: string) {
    const store = await this.prisma.store.findFirst({ where: { business: { member: { userId } } } });
    if (!store) throw new NotFoundException('Bạn chưa có gian hàng');

    return this.prisma.taxEstimationSnapshot.findMany({
      where: { storeId: store.id },
      orderBy: { generatedAt: 'desc' },
      take: 8, // 2 năm gần nhất
    });
  }

  /**
   * Gọi Python service TÍNH NGAY (on-demand, đồng bộ) khi seller cần số liệu
   * tức thời thay vì chờ job định kỳ — Mục 3.6.3 spec kịch bản "Yêu cầu tính
   * báo cáo ngay → REST API nội bộ".
   */
  async generateReportNow(userId: string, from: Date, to: Date) {
    const store = await this.prisma.store.findFirst({ where: { business: { member: { userId } } } });
    if (!store) throw new NotFoundException('Bạn chưa có gian hàng');

    const baseUrl = this.config.get<string>('ACCOUNTING_SERVICE_URL') ?? 'http://localhost:8000';
    const apiKey = this.config.get<string>('INTERNAL_API_KEY') ?? '';

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/internal/reports/generate`,
          { store_id: store.id, period_start: from.toISOString(), period_end: to.toISOString() },
          { headers: { 'X-Internal-Api-Key': apiKey }, timeout: 10000 },
        ),
      );
      return response.data;
    } catch (err) {
      this.logger.error(`Gọi Python Accounting Service thất bại: ${(err as Error).message}`);
      // Fallback graceful: Python service có thể đang down/deploy — không làm
      // sập trải nghiệm seller, trả về ledger cơ bản từ chính NestJS thay thế
      // (Mục 3.6.6 spec: "nếu Python service crash, dữ liệu tài chính gốc vẫn
      // an toàn 100%, chỉ báo cáo bị chậm cập nhật — chấp nhận được").
      const fallback = await this.getLedger(userId, from, to);
      return { success: false, fallback: true, data: fallback };
    }
  }
}
