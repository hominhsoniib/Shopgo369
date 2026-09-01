import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard — enforce RBAC ở API layer (Mục 7.2 spec: "RBAC enforce ở
 * CẢ API layer LẪN query layer"). Dùng SAU JwtAuthGuard.
 *
 * Lưu ý: guard này chỉ kiểm tra "có role phù hợp không".
 * Việc kiểm tra "seller chỉ thấy dữ liệu store của MÌNH" phải làm
 * thêm ở tầng service/query (WHERE storeId = currentUser.storeId).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // không khai báo @Roles() => endpoint chỉ cần đăng nhập
    }

    const { user } = context.switchToHttp().getRequest();
    const userRoles: RoleName[] = user?.roles ?? [];

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(
        `Bạn không có quyền truy cập chức năng này. Yêu cầu role: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
