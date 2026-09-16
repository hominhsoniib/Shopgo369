import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../auth-cookie.util';

/** Đọc access token từ cookie httpOnly (web) — trả null nếu không có, để
 * extractor kế tiếp (Bearer header, dùng cho Mobile) được thử tiếp theo. */
function cookieExtractor(req: Request): string | null {
  return req?.cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
}

/**
 * JwtStrategy — verify access token, gắn payload (id, email, roles) vào
 * request.user để RolesGuard và @CurrentUser() sử dụng.
 *
 * Chấp nhận CẢ 2 nguồn token: cookie httpOnly (Web, sau khi chuyển từ
 * localStorage) LẪN Authorization: Bearer header (Mobile, vẫn giữ nguyên
 * như cũ) — dùng chung 1 guard, không cần phân biệt client ở tầng route.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.accessSecret') as string,
    });
  }

  async validate(payload: { sub: string; email: string; roles: string[] }) {
    return { id: payload.sub, email: payload.email, roles: payload.roles };
  }
}
