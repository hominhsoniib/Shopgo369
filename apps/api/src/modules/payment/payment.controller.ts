import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentService } from './payment.service';

class SimulateMockPaymentDto {
  @IsNotEmpty() orderId: string;
  @IsNotEmpty() gatewayTransactionRef: string;
  @IsNumber() amount: number;
  @IsEnum(['success', 'fail']) result: 'success' | 'fail';
}

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post(':orderId/init')
  init(@CurrentUser() user: { id: string }, @Param('orderId') orderId: string) {
    return this.paymentService.initPayment(user.id, orderId);
  }

  @Get(':orderId/status')
  getStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getStatus(orderId);
  }

  /**
   * ⚠️ CHỈ DÙNG DEV/TEST LOCAL — giả lập cổng thanh toán gọi webhook thành
   * công/thất bại, để test luồng checkout end-to-end mà không cần tài khoản
   * VNPay/Momo thật. KHÔNG deploy endpoint này lên production (Mục 7.2 spec:
   * webhook thật phải verify signature + whitelist IP từ gateway, không được
   * tự gọi từ FE).
   */
  @Post('mock/simulate')
  simulateMockPayment(@Body() dto: SimulateMockPaymentDto) {
    const payload = this.paymentService.buildMockWebhookPayload(
      dto.orderId,
      dto.gatewayTransactionRef,
      dto.amount,
      dto.result,
    );
    return this.paymentService.handleWebhook(payload);
  }
}
