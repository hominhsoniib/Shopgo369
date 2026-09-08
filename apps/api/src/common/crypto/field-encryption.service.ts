import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // khuyến nghị chuẩn cho GCM (không dùng 16 như CBC)
const CIPHER_PREFIX = 'enc:v1:'; // đánh dấu định dạng — phân biệt với dữ liệu plaintext hợp pháp cũ

/**
 * FieldEncryptionService — mã hoá đối xứng AES-256-GCM cho các field nhạy cảm
 * lưu trong Postgres (CCCD, và bất kỳ PII nào khác sau này) — đáp ứng yêu cầu
 * "mã hoá dữ liệu nhạy cảm tại rest" (spec mục 7.2, Nghị định 13/2023/NĐ-CP).
 *
 * Dùng module `crypto` built-in của Node — KHÔNG thêm dependency ngoài.
 *
 * CẤU HÌNH: biến môi trường FIELD_ENCRYPTION_KEY — chuỗi hex 64 ký tự
 * (32 byte). Sinh 1 lần bằng: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
 * — TUYỆT ĐỐI không đổi key sau khi đã có dữ liệu mã hoá bằng key cũ (sẽ
 * không giải mã lại được — cần chạy lại migration re-encrypt nếu đổi key).
 *
 * decrypt() được thiết kế "tương thích ngược": nếu chuỗi truyền vào KHÔNG có
 * prefix `enc:v1:` (tức là dữ liệu plaintext cũ từ trước khi bật mã hoá),
 * trả về nguyên văn thay vì throw — tránh sập ứng dụng khi còn dữ liệu cũ
 * chưa chạy migration. Chạy `scripts/migrate-encrypt-owner-id-card.ts` một
 * lần để mã hoá toàn bộ dữ liệu cũ.
 */
@Injectable()
export class FieldEncryptionService implements OnModuleInit {
  private readonly logger = new Logger(FieldEncryptionService.name);
  private key: Buffer | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const hex = this.config.get<string>('FIELD_ENCRYPTION_KEY');
    if (!hex) {
      if (this.config.get('env') === 'production') {
        throw new Error(
          'FIELD_ENCRYPTION_KEY chưa được cấu hình — BẮT BUỘC ở production để mã hoá dữ liệu nhạy cảm (CCCD...).',
        );
      }
      this.logger.warn(
        'FIELD_ENCRYPTION_KEY chưa cấu hình — encrypt()/decrypt() sẽ hoạt động ở chế độ KHÔNG MÃ HOÁ (dev only). ' +
          'Sinh key bằng: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      );
      return;
    }
    const buf = Buffer.from(hex, 'hex');
    if (buf.length !== 32) {
      throw new Error(`FIELD_ENCRYPTION_KEY phải là chuỗi hex 64 ký tự (32 byte), hiện tại: ${buf.length} byte`);
    }
    this.key = buf;
  }

  /** Mã hoá 1 chuỗi — trả về `enc:v1:<iv>:<authTag>:<ciphertext>` (hex, nối bằng ":") */
  encrypt(plainText: string): string {
    if (!this.key) return plainText; // dev fallback — xem cảnh báo ở onModuleInit
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf-8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${CIPHER_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /** Giải mã — tương thích ngược, xem docstring class */
  decrypt(value: string | null | undefined): string {
    if (!value) return '';
    if (!value.startsWith(CIPHER_PREFIX)) return value; // dữ liệu cũ chưa migrate, hoặc dev fallback
    if (!this.key) {
      this.logger.error('Gặp dữ liệu đã mã hoá nhưng FIELD_ENCRYPTION_KEY chưa cấu hình — không thể giải mã.');
      return '[Không thể giải mã — thiếu FIELD_ENCRYPTION_KEY]';
    }
    try {
      const [, , ivHex, authTagHex, cipherHex] = value.split(':'); // ['enc','v1', iv, authTag, cipher]
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const cipherBuf = Buffer.from(cipherHex, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(cipherBuf), decipher.final()]);
      return decrypted.toString('utf-8');
    } catch (err) {
      this.logger.error(`Giải mã thất bại: ${(err as Error).message}`);
      return '[Lỗi giải mã]';
    }
  }

  /** SHA-256 hex, chuẩn hoá input (trim + loại khoảng trắng) — dùng làm blind index tra cứu chính xác */
  hashForLookup(plainText: string): string {
    const normalized = plainText.trim().replace(/\s+/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
}
