import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OptionalJwtAuthGuard — dùng cho endpoint hỗ trợ CẢ khách vãng lai LẪN
 * người đã đăng nhập (vd: giỏ hàng guest). Khác với JwtAuthGuard thường:
 * nếu không có token hoặc token không hợp lệ, KHÔNG throw 401 — chỉ đơn
 * giản để `request.user` là undefined, controller tự quyết định fallback
 * sang định danh khác (vd: header X-Guest-Cart-Id).
 *
 * Dùng: @UseGuards(OptionalJwtAuthGuard)
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest(err: unknown, user: unknown) {
    // Ghi đè hành vi mặc định của passport-jwt (vốn throw UnauthorizedException
    // khi verify thất bại) — luôn trả về user (có thể là undefined), không bao giờ throw.
    return (user as any) || undefined;
  }
}
