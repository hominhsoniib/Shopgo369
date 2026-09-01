import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { DistributedLockService } from './lock.service';

@Global()
@Module({
  providers: [RedisService, DistributedLockService],
  exports: [RedisService, DistributedLockService],
})
export class RedisModule {}
