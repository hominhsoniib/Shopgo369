import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { RoleName } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    return this.buildAuthResponse(user);
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
