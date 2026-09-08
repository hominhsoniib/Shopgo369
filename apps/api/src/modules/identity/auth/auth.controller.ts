import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // finding #4 (P0): chống brute-force đăng ký spam + dò mật khẩu — siết chặt hơn mức default toàn hệ thống
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới (mặc định role CUSTOMER)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập — trả token thật, HOẶC { requiresTwoFactor:true, tempToken } nếu tài khoản Admin/Super Admin đã bật 2FA',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Chung mức throttle với login — đây vẫn là bề mặt có thể bị dò mã OTP
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('2fa/verify-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bước 2 đăng nhập khi tài khoản đã bật 2FA — đổi tempToken + mã OTP lấy token thật' })
  verifyTwoFactorLogin(@Body() body: { tempToken: string; code: string }) {
    return this.authService.verifyTwoFactorLogin(body.tempToken, body.code);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token bằng refresh token' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
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
