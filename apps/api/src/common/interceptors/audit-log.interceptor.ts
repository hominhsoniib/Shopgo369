import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * AuditLogInterceptor — ghi lại thao tác ghi/sửa/xoá trên các entity nhạy cảm
 * (Mục 5.1, 7.2 spec: bắt buộc cho orders/payments/accounting_entries...).
 *
 * Cách dùng: gắn @UseInterceptors(AuditLogInterceptor) trên các endpoint
 * PATCH/POST/DELETE của module tài chính, kèm metadata entityType qua Reflector
 * (đơn giản hoá ở Phase 1 — sẽ mở rộng đầy đủ ở Phase 4 khi có accounting_entries).
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const { method, url } = request;

    return next.handle().pipe(
      tap(async (result) => {
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
          await this.prisma.auditLog.create({
            data: {
              userId: user?.id ?? null,
              action: `${method} ${url}`,
              entityType: url.split('/')[3] ?? 'unknown',
              entityId: (result as any)?.id ?? 'n/a',
              afterData: result as any,
            },
          }).catch(() => {
            // Không để lỗi ghi audit log làm fail request chính
          });
        }
      }),
    );
  }
}
