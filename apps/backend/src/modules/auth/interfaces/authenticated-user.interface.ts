/**
 * Authenticated User object attached to Request
 */
export interface AuthenticatedUser {
  /** Auth0 User ID */
  auth0UserId: string;

  /** Email address */
  email: string;

  /** Permissions from Auth0 RBAC */
  permissions: string[];

  /** OAuth scope */
  scope: string;

  /** Internal User ID (populated by UserService) */
  userId?: string;

  /** Organization ID (populated by UserService) */
  organizationId?: string;

  /** User roles (populated by UserService) */
  roles?: string[];
}
