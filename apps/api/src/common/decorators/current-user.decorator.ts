import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator @CurrentUser() — lấy user đã xác thực từ request
 * (được gắn vào request bởi JwtStrategy sau khi verify token).
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
