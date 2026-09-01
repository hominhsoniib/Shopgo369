import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator @Roles(...) — dùng trên controller/handler để khai báo
 * role nào được phép gọi endpoint. Kết hợp với RolesGuard.
 *
 * Ví dụ: @Roles('ADMIN', 'SUPER_ADMIN')
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
