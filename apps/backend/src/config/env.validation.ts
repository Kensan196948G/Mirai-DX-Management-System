import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

const REQUIRED_IN_PRODUCTION = ['AUTH0_DOMAIN', 'AUTH0_AUDIENCE', 'DATABASE_URL'] as const;
const WARN_IF_PLACEHOLDER = ['AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET'] as const;

/**
 * 起動時の環境変数バリデーション
 * - 本番環境: 必須変数が未設定の場合はエラーで停止
 * - 開発環境: プレースホルダーの場合は警告ログのみ（Auth0なしでも起動可能）
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const env = (config['NODE_ENV'] as string) ?? 'development';
  const isDev = env === 'development' || env === 'test';

  if (!isDev) {
    // 本番環境: 必須変数チェック
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !config[key]);
    if (missing.length > 0) {
      throw new Error(`[EnvValidation] 本番環境に必須の環境変数が未設定です: ${missing.join(', ')}`);
    }
  } else {
    // 開発環境: プレースホルダー警告
    for (const key of WARN_IF_PLACEHOLDER) {
      const val = config[key] as string | undefined;
      if (!val || val.startsWith('your_') || val === '') {
        logger.warn(
          `⚠️  ${key} が未設定/プレースホルダーです。Auth0 認証は動作しません。` +
            ` apps/frontend/.env.development を設定してください。`,
        );
      }
    }

    if (!config['DATABASE_URL']) {
      logger.warn('⚠️  DATABASE_URL が未設定です。DB接続が失敗します。');
    }
  }

  return config;
}
