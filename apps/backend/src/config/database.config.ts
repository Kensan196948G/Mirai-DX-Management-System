import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env['DATABASE_URL'] ?? '',
  testUrl: process.env['DATABASE_TEST_URL'] ?? '',
}));
