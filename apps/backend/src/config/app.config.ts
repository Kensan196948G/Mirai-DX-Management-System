import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  env: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['API_PORT'] ?? '3000', 10),
  prefix: process.env['API_PREFIX'] ?? '/api',
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3001',
  rateLimitTtl: parseInt(process.env['API_RATE_LIMIT_TTL'] ?? '60000', 10),
  rateLimitMax: parseInt(process.env['API_RATE_LIMIT_MAX'] ?? '60', 10),
}));
