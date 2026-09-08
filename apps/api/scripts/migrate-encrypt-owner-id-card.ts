/**
 * scripts/migrate-encrypt-owner-id-card.ts
 *
 * Chạy 1 LẦN sau khi deploy code có FieldEncryptionService (P-security CCCD)
 * để mã hoá toàn bộ CCCD ĐANG LƯU PLAINTEXT trong bảng `businesses` và backfill
 * cột `owner_id_card_hash` (dùng cho tra cứu chính xác — xem admin.service.ts).
 *
 * AN TOÀN CHẠY LẠI NHIỀU LẦN (idempotent): dòng nào ownerIdCard đã có prefix
 * "enc:v1:" (đã mã hoá từ trước) sẽ tự động bị BỎ QUA, không mã hoá lại.
 *
 * Cách chạy (từ thư mục apps/api):
 *   npx ts-node scripts/migrate-encrypt-owner-id-card.ts
 * hoặc:
 *   pnpm migrate:encrypt-owner-id-card
 *
 * YÊU CẦU: biến môi trường FIELD_ENCRYPTION_KEY đã được set trong .env
 * (chuỗi hex 64 ký tự — xem hướng dẫn sinh key trong field-encryption.service.ts).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ── Nạp .env thủ công (không phụ thuộc gói `dotenv` — tránh vấn đề hoisting của pnpm) ──
function loadDotEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

const CIPHER_PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function encrypt(plainText: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${CIPHER_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function hashForLookup(plainText: string): string {
  const normalized = plainText.trim().replace(/\s+/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

async function main() {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex) {
    console.error('❌ FIELD_ENCRYPTION_KEY chưa được set trong apps/api/.env — dừng lại, không mã hoá gì cả.');
    console.error('   Sinh key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) {
    console.error(`❌ FIELD_ENCRYPTION_KEY phải là chuỗi hex 64 ký tự (32 byte), hiện tại: ${key.length} byte`);
    process.exit(1);
  }

  // Import PrismaClient sau khi .env đã nạp xong (để DATABASE_URL có sẵn)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const businesses = await prisma.business.findMany({
      select: { id: true, ownerIdCard: true, ownerIdCardHash: true },
    });

    let migrated = 0;
    let skippedAlreadyEncrypted = 0;
    let hashBackfilled = 0;

    for (const b of businesses) {
      const alreadyEncrypted = b.ownerIdCard.startsWith(CIPHER_PREFIX);

      if (alreadyEncrypted) {
        skippedAlreadyEncrypted++;
        // Vẫn backfill hash nếu thiếu (trường hợp mã hoá ở code cũ trước khi
        // có cột hash) — nhưng không thể tính hash từ ciphertext, nên bỏ qua
        // và chỉ cảnh báo — cần xử lý thủ công nếu gặp trường hợp này.
        if (!b.ownerIdCardHash) {
          console.warn(`⚠️  Business ${b.id}: đã mã hoá nhưng thiếu hash — cần backfill thủ công (hiếm gặp).`);
        }
        continue;
      }

      const plain = b.ownerIdCard;
      const encrypted = encrypt(plain, key);
      const hashVal = hashForLookup(plain);

      await prisma.business.update({
        where: { id: b.id },
        data: { ownerIdCard: encrypted, ownerIdCardHash: hashVal },
      });
      migrated++;
      if (!b.ownerIdCardHash) hashBackfilled++;
    }

    console.log(`✅ Hoàn tất migration mã hoá CCCD:`);
    console.log(`   - Đã mã hoá mới: ${migrated} bản ghi`);
    console.log(`   - Đã mã hoá từ trước (bỏ qua): ${skippedAlreadyEncrypted} bản ghi`);
    console.log(`   - Tổng: ${businesses.length} bản ghi`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Migration thất bại:', err);
  process.exit(1);
});
