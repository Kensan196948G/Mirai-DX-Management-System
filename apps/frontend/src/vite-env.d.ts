/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Auth0
  readonly VITE_AUTH0_DOMAIN: string;
  readonly VITE_AUTH0_CLIENT_ID: string;
  readonly VITE_AUTH0_AUDIENCE: string;

  // API
  readonly VITE_API_URL: string;

  // App
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_VERSION: string;

  // Feature Flags
  readonly VITE_ENABLE_MAP: string;
  readonly VITE_ENABLE_PWA_OFFLINE: string;

  // Node
  readonly MODE: 'development' | 'production' | 'test';
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
