import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus, ReconciliationMatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MockPaymentGateway } from './gateways/mock-payment.gateway';
import { GatewayTransactionRecord, PaymentGatewayAdapter } from './gateways/payment-gateway.interface';

export interface ReconciliationSummary {
  date: string;
  matched: number;
  mismatchAmount: number;
  missingInGateway: number;
  missingInSystem: number;
}

/**
 * ReconciliationService — đối soát thanh toán hàng ngày (Mục 4.2 spec).
 *
 * QUYẾT ĐỊNH THIẾT KẾ: đây là lớp PHÁT HIỆN/CẢNH BÁO độc lập, KHÔNG chặn việc
 * ghi sổ kế toán real-time đã có sẵn (Mục 3.6.1 — accounting entries được ghi
 * ngay khi order.paid xảy ra, trong cùng transaction với đơn hàng). Spec Mục
 * 4.2 nói "chỉ ghi kế toán sau khi đối soát khớp" — nhưng điều này mâu thuẫn
 * với Mục 3.6.1 (ghi transactional NGAY để đảm bảo tính toàn vẹn cùng lúc với
 * trừ kho/tạo đơn). Giữ nguyên hành vi ghi real-time đã ổn định; đối soát ở
 * đây đóng vai trò bắt giao dịch treo/thất thoát để Admin xử lý thủ công,
 * đúng giá trị cốt lõi mà Mục 4.2 hướng tới.
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  // Hiện chỉ có Mock gateway — khi tích hợp VNPay/Momo thật, đăng ký thêm
  // adapter vào mảng này (mỗi provider tự implement fetchDailyTransactions).
  constructor(
    private readonly prisma: PrismaService,
    private readonly mockGateway: MockPaymentGateway,
  ) {}

  private get gateways(): PaymentGatewayAdapter[] {
    return [this.mockGateway];
  }

  /** Chạy đối soát cho 1 ngày cụ thể — idempotent (chạy lại sẽ ghi đè log cũ của ngày đó) */
  async runDailyReconciliation(date: Date): Promise<ReconciliationSummary> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    const startOfDay = new Date(dateOnly);
    const endOfDay = new Date(dateOnly);
    endOfDay.setHours(23, 59, 59, 999);

    // Xoá log cũ của ngày này trước khi chạy lại (tránh trùng lặp khi cron rerun)
    await this.prisma.paymentReconciliationLog.deleteMany({ where: { reconciliationDate: dateOnly } });

    const summary: ReconciliationSummary = {
      date: dateOnly.toISOString().slice(0, 10),
      matched: 0,
      mismatchAmount: 0,
      missingInGateway: 0,
      missingInSystem: 0,
    };

    for (const gateway of this.gateways) {
      const [systemTxs, gatewayTxs] = await Promise.all([
        this.prisma.paymentTransaction.findMany({
          where: {
            payment: { gatewayProvider: gateway.providerName },
            status: PaymentStatus.SUCCESS,
            createdAt: { gte: startOfDay, lte: endOfDay },
            gatewayTransactionId: { not: null },
          },
          select: { gatewayTransactionId: true, amount: true },
        }),
        gateway.fetchDailyTransactions(dateOnly),
      ]);

      const systemMap = new Map(systemTxs.map((t) => [t.gatewayTransactionId!, Number(t.amount)]));
      const gatewayMap = new Map(
        gatewayTxs.filter((t) => t.status === 'success').map((t) => [t.gatewayTransactionId, t.amount]),
      );

      const logs: Array<{
        reconciliationDate: Date;
        gatewayProvider: string;
        gatewayTransactionId: string;
        systemAmount: number | null;
        gatewayAmount: number | null;
        matchStatus: ReconciliationMatchStatus;
      }> = [];

      // Duyệt giao dịch phía hệ thống
      for (const [txId, systemAmount] of systemMap) {
        const gatewayAmount = gatewayMap.get(txId);
        if (gatewayAmount === undefined) {
          logs.push({
            reconciliationDate: dateOnly,
            gatewayProvider: gateway.providerName,
            gatewayTransactionId: txId,
            systemAmount,
            gatewayAmount: null,
            matchStatus: ReconciliationMatchStatus.MISSING_IN_GATEWAY,
          });
          summary.missingInGateway++;
        } else if (gatewayAmount !== systemAmount) {
          logs.push({
            reconciliationDate: dateOnly,
            gatewayProvider: gateway.providerName,
            gatewayTransactionId: txId,
            systemAmount,
            gatewayAmount,
            matchStatus: ReconciliationMatchStatus.MISMATCH_AMOUNT,
          });
          summary.mismatchAmount++;
        } else {
          logs.push({
            reconciliationDate: dateOnly,
            gatewayProvider: gateway.providerName,
            gatewayTransactionId: txId,
            systemAmount,
            gatewayAmount,
            matchStatus: ReconciliationMatchStatus.MATCHED,
          });
          summary.matched++;
        }
      }

      // Giao dịch chỉ có ở gateway, không có trong hệ thống — thất thoát doanh thu
      for (const [txId, gatewayAmount] of gatewayMap) {
        if (!systemMap.has(txId)) {
          logs.push({
            reconciliationDate: dateOnly,
            gatewayProvider: gateway.providerName,
            gatewayTransactionId: txId,
            systemAmount: null,
            gatewayAmount,
            matchStatus: ReconciliationMatchStatus.MISSING_IN_SYSTEM,
          });
          summary.missingInSystem++;
        }
      }

      if (logs.length > 0) {
        await this.prisma.paymentReconciliationLog.createMany({ data: logs });
      }
    }

    const hasIssue = summary.mismatchAmount + summary.missingInGateway + summary.missingInSystem > 0;
    if (hasIssue) {
      this.logger.warn(
        `Đối soát ${summary.date}: ${summary.matched} khớp, ${summary.mismatchAmount} lệch tiền, ` +
          `${summary.missingInGateway} treo (thiếu ở gateway), ${summary.missingInSystem} thất thoát (thiếu trong hệ thống)`,
      );
    } else {
      this.logger.log(`Đối soát ${summary.date}: ${summary.matched} giao dịch khớp 100%`);
    }

    return summary;
  }

  /** Lấy log đối soát của 1 ngày cho Admin xem chi tiết (Mục 5.6 spec: GET /admin/reconciliation/daily) */
  async getDailyLog(date: Date) {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const entries = await this.prisma.paymentReconciliationLog.findMany({
      where: { reconciliationDate: dateOnly },
      orderBy: [{ matchStatus: 'asc' }, { createdAt: 'asc' }],
    });

    const summary: ReconciliationSummary = {
      date: dateOnly.toISOString().slice(0, 10),
      matched: entries.filter((e) => e.matchStatus === ReconciliationMatchStatus.MATCHED).length,
      mismatchAmount: entries.filter((e) => e.matchStatus === ReconciliationMatchStatus.MISMATCH_AMOUNT).length,
      missingInGateway: entries.filter((e) => e.matchStatus === ReconciliationMatchStatus.MISSING_IN_GATEWAY).length,
      missingInSystem: entries.filter((e) => e.matchStatus === ReconciliationMatchStatus.MISSING_IN_SYSTEM).length,
    };

    return { summary, entries };
  }
}
