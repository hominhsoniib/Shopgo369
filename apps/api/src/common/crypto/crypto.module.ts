import { Global, Module } from '@nestjs/common';
import { FieldEncryptionService } from './field-encryption.service';

/** CryptoModule — @Global() giống PrismaModule, vì FieldEncryptionService cần
 * dùng ở nhiều module không liên quan nhau (businesses, admin, và có thể mở
 * rộng cho các PII khác sau này) — tránh phải import lặp lại từng nơi. */
@Global()
@Module({
  providers: [FieldEncryptionService],
  exports: [FieldEncryptionService],
})
export class CryptoModule {}
