import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — bảo vệ endpoint yêu cầu đăng nhập.
 * Dùng: @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
