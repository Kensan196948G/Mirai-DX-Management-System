import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Permissions Decorator
 *
 * Specifies required permissions for accessing a route.
 * Used with RbacGuard.
 *
 * Permissions are defined in Auth0 and included in the JWT token.
 *
 * @param permissions - Required permissions (strings from Auth0)
 *
 * @example
 * ```typescript
 * @Permissions('read:projects', 'write:projects')
 * @Post('projects')
 * createProject() {
 *   // Only users with both permissions can access
 * }
 * ```
 */
export const Permissions = (...permissions: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(PERMISSIONS_KEY, permissions);
