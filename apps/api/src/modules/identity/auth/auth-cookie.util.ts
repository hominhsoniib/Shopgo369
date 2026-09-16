import { Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Chuyển chuỗi thời hạn kiểu "15m"/"7d" (định dạng JWT_ACCESS_EXPIRES_IN /
 * JWT_REFRESH_EXPIRES_IN dùng chung với @nestjs/jwt) sang mili-giây cho
 * cookie maxAge. Chỉ hỗ trợ đúng các đơn vị dự án đang dùng (s/m/h/d) —
 * không kéo thêm package `ms` chỉ để làm 1 việc nhỏ này.
 */
export function parseDurationMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value?.trim() ?? '');
  if (!match) return fallbackMs;
  const amount = parseInt(match[1], 10);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]] as number;
  return amount * unitMs;
}

/**
 * Đặt cookie httpOnly cho access/refresh token (thay localStorage phía web
 * — audit finding: token nhạy cảm lưu localStorage dễ bị đánh cắp qua XSS).
 * sameSite:'none' bắt buộc vì web (apps/web) và api chạy khác domain/port —
 * đi kèm secure:true khi production (SameSite=None yêu cầu Secure, trình
 * duyệt sẽ tự chặn cookie nếu thiếu). Ở dev (http, khác port cùng localhost)
 * dùng 'lax' + secure:false vẫn hoạt động vì cùng "site" theo định nghĩa
 * trình duyệt (bỏ qua port).
 */
export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  isProduction: boolean,
  accessExpiresIn: string,
  refreshExpiresIn: string,
) {
  const common = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  };
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...common,
    maxAge: parseDurationMs(accessExpiresIn, 15 * 60_000),
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...common,
    maxAge: parseDurationMs(refreshExpiresIn, 7 * 86_400_000),
  });
}

export function clearAuthCookies(res: Response, isProduction: boolean) {
  const common = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  };
  res.clearCookie(ACCESS_TOKEN_COOKIE, common);
  res.clearCookie(REFRESH_TOKEN_COOKIE, common);
}
