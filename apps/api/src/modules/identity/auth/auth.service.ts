import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { RoleName } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';

/** Vai trò BẮT BUỘC dùng 2FA khi đã bật (spec mục 7.2: 2FA bắt buộc cho Admin/Super Admin) */
const TWO_FACTOR_REQUIRED_ROLES: RoleName[] = [RoleName.ADMIN, RoleName.SUPER_ADMIN];
const TWO_FACTOR_TOKEN_PURPOSE = '2fa_pending';
const TWO_FACTOR_TOKEN_TTL = '5m';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Đăng ký — mặc định gán role CUSTOMER (Mục 3.2 spec: mọi user đều bắt đầu
   * là customer, sau đó có thể "nâng cấp" thành seller/member qua luồng
   * xác thực hộ kinh doanh ở module businesses — không tạo role riêng ngay lúc đăng ký).
   */
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email này đã được đăng ký');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.usersService.createWithRole({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      fullName: dto.fullName,
      role: RoleName.CUSTOMER,
    });

    return this.buildAuthResponse(user);
  }

  /**
   * Đăng nhập — nếu tài khoản thuộc role bắt buộc 2FA (ADMIN/SUPER_ADMIN) VÀ
   * đã bật 2FA, KHÔNG trả access/refresh token ngay. Thay vào đó trả về
   * `requiresTwoFactor: true` + `tempToken` (JWT sống 5 phút, purpose riêng,
   * KHÔNG dùng được cho bất kỳ endpoint nào khác) — client phải gọi tiếp
   * `POST /auth/2fa/verify-login` với mã 6 số từ app authenticator mới nhận
   * được token thật.
   */
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const roles = this.usersService.extractRoleNames(user as any);
    const needsTwoFactor = user.twoFactorEnabled && roles.some((r) => TWO_FACTOR_REQUIRED_ROLES.includes(r));

    if (needsTwoFactor) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, purpose: TWO_FACTOR_TOKEN_PURPOSE },
        { secret: this.twoFactorTempSecret(), expiresIn: TWO_FACTOR_TOKEN_TTL },
      );
      return { requiresTwoFactor: true, tempToken };
    }

    return this.buildAuthResponse(user);
  }

  /** Bước 2 của đăng nhập khi tài khoản đã bật 2FA — đổi tempToken + mã OTP hợp lệ lấy token thật */
  async verifyTwoFactorLogin(tempToken: string, code: string) {
    let payload: { sub: string; purpose: string };
    try {
      payload = this.jwtService.verify(tempToken, { secret: this.twoFactorTempSecret() });
    } catch {
      throw new UnauthorizedException('Phiên xác thực 2FA đã hết hạn hoặc không hợp lệ — vui lòng đăng nhập lại');
    }
    if (payload.purpose !== TWO_FACTOR_TOKEN_PURPOSE) {
      throw new UnauthorizedException('Token không hợp lệ cho bước xác thực này');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('Tài khoản không ở trạng thái chờ xác thực 2FA');
    }

    const valid = authenticator.check(code, user.twoFactorSecret);
    if (!valid) {
      throw new UnauthorizedException('Mã xác thực không đúng');
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Bước 1 của việc BẬT 2FA — sinh secret mới, lưu tạm vào DB nhưng CHƯA bật
   * (`twoFactorEnabled` vẫn false) tới khi user xác nhận đúng 1 mã ở bước
   * `enableTwoFactor()` — tránh trường hợp quét QR lỗi/scan nhầm app rồi tự
   * khoá luôn tài khoản của chính mình.
   */
  async setupTwoFactor(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Người dùng không tồn tại');

    const secret = authenticator.generateSecret();
    await this.usersService.setTwoFactorSecret(userId, secret);

    const otpauthUrl = authenticator.keyuri(user.email, '369 Platform', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  /** Bước 2 — xác nhận đúng 1 mã sinh từ secret vừa setup thì mới thực sự bật 2FA */
  async enableTwoFactor(userId: string, dto: Verify2faDto) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('Bạn cần gọi /auth/2fa/setup trước khi bật 2FA');
    }
    const valid = authenticator.check(dto.code, user.twoFactorSecret);
    if (!valid) {
      throw new BadRequestException('Mã xác thực không đúng — kiểm tra lại app authenticator hoặc đồng bộ giờ thiết bị');
    }
    await this.usersService.setTwoFactorEnabled(userId, true);
    return { message: 'Đã bật xác thực 2 lớp (2FA) thành công' };
  }

  /** Tắt 2FA — yêu cầu CẢ mật khẩu hiện tại LẪN mã OTP hợp lệ (chống chiếm phiên tự ý tắt bảo vệ) */
  async disableTwoFactor(userId: string, dto: Disable2faDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Người dùng không tồn tại');

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Tài khoản chưa bật 2FA');
    }
    const codeValid = authenticator.check(dto.code, user.twoFactorSecret);
    if (!codeValid) {
      throw new UnauthorizedException('Mã xác thực không đúng');
    }

    await this.usersService.clearTwoFactor(userId);
    return { message: 'Đã tắt xác thực 2 lớp (2FA)' };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('jwt.refreshSecret'),
      });
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException('Người dùng không tồn tại');
      return this.buildAuthResponse(user);
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  /**
   * Đổi mật khẩu — yêu cầu xác nhận đúng mật khẩu hiện tại trước khi đổi
   * (chống trường hợp ai đó chiếm được phiên đăng nhập nhưng không biết mật khẩu gốc).
   * Không revoke các refresh token cũ đang tồn tại — hệ thống hiện chưa lưu
   * refresh token phía server (stateless JWT) nên không có gì để thu hồi;
   * access token cũ (tối đa 15p) vẫn dùng được tới khi hết hạn tự nhiên.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);
    await this.usersService.updatePassword(userId, newPasswordHash);

    return { message: 'Đổi mật khẩu thành công' };
  }

  private twoFactorTempSecret(): string {
    return this.config.get<string>('TWO_FACTOR_TEMP_SECRET') || (this.config.get('jwt.accessSecret') as string);
  }

  /** Sinh cặp access/refresh token (Mục 7.2 spec: access 15m, refresh 7d) */
  private buildAuthResponse(user: {
    id: string;
    email: string;
    fullName: string;
    roles: { role: { name: RoleName } }[];
  }) {
    const roles = this.usersService.extractRoleNames(user as any);
    const payload = { sub: user.id, email: user.email, roles };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('jwt.accessSecret'),
      expiresIn: this.config.get('jwt.accessExpiresIn'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('jwt.refreshSecret'),
      expiresIn: this.config.get('jwt.refreshExpiresIn'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles,
      },
    };
  }
}
