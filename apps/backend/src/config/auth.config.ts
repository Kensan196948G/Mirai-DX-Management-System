import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  auth0: {
    domain: process.env['AUTH0_DOMAIN'] ?? '',
    audience: process.env['AUTH0_AUDIENCE'] ?? '',
    clientId: process.env['AUTH0_CLIENT_ID'] ?? '',
    clientSecret: process.env['AUTH0_CLIENT_SECRET'] ?? '',
    issuerUrl: process.env['AUTH0_ISSUER_URL'] ?? '',
    managementApiAudience: process.env['AUTH0_MANAGEMENT_API_AUDIENCE'] ?? '',
  },
  jwt: {
    secret: process.env['JWT_SECRET'] ?? '',
    expiresIn: process.env['JWT_EXPIRES_IN'] ?? '1h',
    refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
  },
  session: {
    secret: process.env['SESSION_SECRET'] ?? '',
    maxAge: parseInt(process.env['SESSION_MAX_AGE'] ?? '86400000', 10), // 24 hours
  },
  mfa: {
    enabled: process.env['MFA_ENABLED'] === 'true',
    issuer: process.env['MFA_ISSUER'] ?? 'CDCP',
  },
}));
