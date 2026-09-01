import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryCleanupCron } from './inventory-cleanup.cron';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryCleanupCron],
  exports: [InventoryService],
})
export class InventoryModule {}
