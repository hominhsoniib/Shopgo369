import { Body, Controller, Post, HttpCode, HttpStatus, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { REFRESH_TOKEN_COOKIE, clearAuthCookies, setAuthCookies } from './auth-cookie.util';

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: unknown;
}

function hasTokens(data: AuthResult | { requiresTwoFactor: boolean; tempToken: string }): data is AuthResult {
  return 'accessToken' in data;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Đặt cookie httpOnly access/refresh token cho response — Web (apps/web)
   * đọc phiên qua cookie này thay vì localStorage; body JSON vẫn giữ nguyên
   * 2 token như cũ để Mobile (Bearer header, không dùng cookie) không bị vỡ.
   */
  private applyAuthCookies(res: Response, data: AuthResult) {
    setAuthCookies(
      res,
      data,
      this.config.get('env') === 'production',
      this.config.get<string>('jwt.accessExpiresIn') ?? '15m',
      this.config.get<string>('jwt.refreshExpiresIn') ?? '7d',
    );
  }

  // finding #4 (P0): chống brute-force đăng ký spam + dò mật khẩu — siết chặt hơn mức default toàn hệ thống
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới (mặc định role CUSTOMER)' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.register(dto);
    this.applyAuthCookies(res, data);
    return data;
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập — trả token thật, HOẶC { requiresTwoFactor:true, tempToken } nếu tài khoản Admin/Super Admin đã bật 2FA',
  })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.login(dto);
    if (hasTokens(data)) this.applyAuthCookies(res, data);
    return data;
  }

  // Chung mức throttle với login — đây vẫn là bề mặt có thể bị dò mã OTP
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('2fa/verify-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bước 2 đăng nhập khi tài khoản đã bật 2FA — đổi tempToken + mã OTP lấy token thật' })
  async verifyTwoFactorLogin(
    @Body() body: { tempToken: string; code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.verifyTwoFactorLogin(body.tempToken, body.code);
    this.applyAuthCookies(res, data);
    return data;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token — đọc refresh token từ cookie httpOnly (Web) hoặc body (Mobile)' })
  async refresh(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = dto.refreshToken || req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('Thiếu refresh token');
    }
    const data = await this.authService.refresh(refreshToken);
    this.applyAuthCookies(res, data);
    return data;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất — xoá cookie httpOnly access/refresh token phía Web' })
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res, this.config.get('env') === 'production');
    return { message: 'Đã đăng xuất' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Đổi mật khẩu (yêu cầu đã đăng nhập, xác nhận mật khẩu hiện tại)' })
  changePassword(@CurrentUser() user: { id: string }, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  // ── 2FA (TOTP) — bắt buộc bảo mật cho Admin/Super Admin, tự nguyện cho vai trò khác ──

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Bước 1: sinh secret + QR code — CHƯA bật 2FA cho tới khi gọi /2fa/enable với mã đúng' })
  setupTwoFactor(@CurrentUser() user: { id: string }) {
    return this.authService.setupTwoFactor(user.id);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Bước 2: xác nhận đúng 1 mã OTP để chính thức bật 2FA' })
  enableTwoFactor(@CurrentUser() user: { id: string }, @Body() dto: Verify2faDto) {
    return this.authService.enableTwoFactor(user.id, dto);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tắt 2FA — yêu cầu cả mật khẩu hiện tại lẫn mã OTP hợp lệ' })
  disableTwoFactor(@CurrentUser() user: { id: string }, @Body() dto: Disable2faDto) {
    return this.authService.disableTwoFactor(user.id, dto);
  }
}
