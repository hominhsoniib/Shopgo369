import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { WebhooksController } from './webhooks.controller';
import { PaymentService } from './payment.service';
import { MockPaymentGateway } from './gateways/mock-payment.gateway';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentController, WebhooksController],
  providers: [PaymentService, MockPaymentGateway],
  exports: [PaymentService],
})
export class PaymentModule {}
