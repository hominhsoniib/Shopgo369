import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';

import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { IdentityModule } from './modules/identity/identity.module';
import { MembersModule } from './modules/members/members.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { StoresModule } from './modules/stores/stores.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { AdminModule } from './modules/admin/admin.module';

// Phase 2 — Bán hàng
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { QueueModule } from './modules/queue/queue.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentModule } from './modules/payment/payment.module';

// Phase 3 — Seller Center
import { PromotionsModule } from './modules/promotions/promotions.module';
import { SellerAnalyticsModule } from './modules/seller-analytics/seller-analytics.module';

// Phase 4 — Kế toán
import { AccountingModule } from './modules/accounting/accounting.module';

// Phase 5 — Hệ sinh thái 369
import { CommissionModule } from './modules/commission/commission.module';
import { PointsModule } from './modules/points/points.module';
import { LearningModule } from './modules/learning/learning.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(), // kích hoạt @Cron (Mục 4.1 spec: dọn reservation hết hạn)
    PrismaModule,
    RedisModule,
    IdentityModule,
    MembersModule,
    BusinessesModule,
    StoresModule,
    CatalogModule,
    AdminModule,
    // Phase 2
    InventoryModule,
    CartModule,
    ShippingModule,
    QueueModule,
    OrdersModule,
    PaymentModule,
    // Phase 3
    PromotionsModule,
    SellerAnalyticsModule,
    // Phase 4
    AccountingModule,
    // Phase 5
    CommissionModule,
    PointsModule,
    LearningModule,
  ],
})
export class AppModule {}
