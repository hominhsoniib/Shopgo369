import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — kết nối duy nhất tới PostgreSQL (Primary).
 * Đây là "nguồn sự thật" cho toàn bộ dữ liệu transactional (Mục 3.1, 3.6 spec).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
