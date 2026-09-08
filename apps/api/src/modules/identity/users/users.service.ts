import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleName } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
  }

  async createWithRole(data: {
    email: string;
    phone?: string;
    passwordHash: string;
    fullName: string;
    role: RoleName;
  }) {
    // Bảo đảm role tồn tại sẵn (đã seed) rồi gán cho user mới — mặc định CUSTOMER
    const role = await this.prisma.role.findUnique({ where: { name: data.role } });
    if (!role) {
      throw new Error(`Role ${data.role} chưa được seed trong hệ thống`);
    }

    return this.prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        roles: {
          create: { roleId: role.id },
        },
      },
      include: { roles: { include: { role: true } } },
    });
  }

  /** Cập nhật passwordHash — dùng cho luồng đổi mật khẩu (đã verify mật khẩu cũ ở AuthService) */
  updatePassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  // ── 2FA (TOTP) ─────────────────────────────────────────────────────
  /** Lưu secret TẠM (chưa bật 2FA) — bước 1 của flow setup */
  setTwoFactorSecret(userId: string, secret: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });
  }

  /** Bật/tắt cờ 2FA — dùng sau khi đã xác nhận đúng mã OTP ở bước enable */
  setTwoFactorEnabled(userId: string, enabled: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enabled },
    });
  }

  /** Xoá hoàn toàn secret + tắt cờ — dùng khi user chủ động tắt 2FA */
  clearTwoFactor(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: null, twoFactorEnabled: false },
    });
  }

  /** Helper: chuẩn hoá danh sách role name từ quan hệ user_roles */
  extractRoleNames(user: { roles: { role: { name: RoleName } }[] }): RoleName[] {
    return user.roles.map((r) => r.role.name);
  }
}
