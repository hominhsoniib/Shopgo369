import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';

/**
 * WebhooksController — endpoint THẬT mà cổng thanh toán (VNPay/Momo) sẽ gọi
 * tới khi có kết quả giao dịch. KHÔNG có JwtAuthGuard (gateway bên ngoài
 * không có JWT của hệ thống) — bảo mật dựa vào verify signature bên trong
 * PaymentService.handleWebhook (Mục 5.6, 7.2 spec).
 */
@ApiTags('webhooks')
@Controller('webhooks/payment')
export class WebhooksController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post(':provider')
  handle(@Param('provider') provider: string, @Body() payload: Record<string, any>) {
    // Phase 2: chỉ có "mock" provider. Khi thêm VNPay/Momo thật, dùng `provider`
    // để chọn đúng adapter (PaymentGatewayAdapter) tương ứng.
    return this.paymentService.handleWebhook(payload);
  }
}
