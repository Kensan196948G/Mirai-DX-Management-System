import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Roles Decorator
 *
 * Specifies required roles for accessing a route.
 * Used with RbacGuard.
 *
 * @param roles - Required roles (UserRole enum)
 *
 * @example
 * ```typescript
 * @Roles('system_admin', 'branch_admin')
 * @Get('admin/users')
 * getAdminUsers() {
 *   // Only system_admin and branch_admin can access
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
