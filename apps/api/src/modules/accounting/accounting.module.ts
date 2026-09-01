import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';

@Module({
  imports: [HttpModule],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
