import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { WebhooksController } from './webhooks.controller';
import { RefundController } from './refund.controller';
import { PaymentService } from './payment.service';
import { RefundService } from './refund.service';
import { MockPaymentGateway } from './gateways/mock-payment.gateway';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationCron } from './reconciliation.cron';
import { OrdersModule } from '../orders/orders.module';
import { AccountingModule } from '../accounting/accounting.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [OrdersModule, AccountingModule, InventoryModule],
  controllers: [PaymentController, WebhooksController, RefundController],
  providers: [PaymentService, RefundService, MockPaymentGateway, ReconciliationService, ReconciliationCron],
  exports: [PaymentService, RefundService, ReconciliationService],
})
export class PaymentModule {}
