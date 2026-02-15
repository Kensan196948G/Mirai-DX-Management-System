/**
 * JWT Payload from Auth0
 */
export interface JwtPayload {
  /** Subject (Auth0 User ID) */
  sub: string;

  /** Email address */
  email?: string;

  /** Email verified status */
  email_verified?: boolean;

  /** Full name */
  name?: string;

  /** Nickname */
  nickname?: string;

  /** Profile picture URL */
  picture?: string;

  /** Issued at timestamp */
  iat: number;

  /** Expiration timestamp */
  exp: number;

  /** Audience */
  aud: string | string[];

  /** Issuer */
  iss: string;

  /** Authorized party (client ID) */
  azp?: string;

  /** Scope */
  scope?: string;

  /** Custom permissions (from Auth0 RBAC) */
  permissions: string[];

  /** Organization ID (from Auth0 Organizations) */
  org_id?: string;

  /** Organization name */
  org_name?: string;

  /** Custom metadata */
  [key: string]: unknown;
}
