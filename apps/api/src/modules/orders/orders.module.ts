import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderTimeoutProcessor } from './processors/order-timeout.processor';
import { InventoryModule } from '../inventory/inventory.module';
import { ShippingModule } from '../shipping/shipping.module';
import { CartModule } from '../cart/cart.module';
import { QueueModule } from '../queue/queue.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { AccountingModule } from '../accounting/accounting.module';
import { CommissionModule } from '../commission/commission.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [
    InventoryModule,
    ShippingModule,
    CartModule,
    QueueModule,
    PromotionsModule,
    AccountingModule,
    CommissionModule,
    PointsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderTimeoutProcessor],
  exports: [OrdersService],
})
export class OrdersModule {}
