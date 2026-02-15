# React PWA アーキテクチャ設計書

## 1. 概要

本ドキュメントでは、CDCP プロジェクト Phase1 における React PWA フロントエンドの詳細アーキテクチャを定義する。

### 1.1 技術スタック

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| フレームワーク | React | 18.3.x | UI構築 |
| ビルドツール | Vite | 5.x | 高速ビルド |
| 言語 | TypeScript | 5.4.x | 型安全性 |
| PWA | Workbox | 7.x | Service Worker管理 |
| ルーティング | React Router | 6.x | SPA ルーティング |
| 状態管理 (サーバー) | React Query | 5.x | サーバー状態同期 |
| 状態管理 (クライアント) | Zustand | 4.x | グローバル状態 |
| ローカルDB | Dexie.js | 4.x | IndexedDB ラッパー |
| UI コンポーネント | shadcn/ui | latest | アクセシブルなコンポーネント |
| スタイリング | Tailwind CSS | 3.x | ユーティリティファースト CSS |
| フォーム管理 | React Hook Form | 7.x | フォームバリデーション |
| スキーマ検証 | Zod | 3.x | 型安全なバリデーション |
| 地図表示 | Leaflet + React-Leaflet | 4.x / 2.x | GPS位置表示 |
| 画像最適化 | sharp (build時) | latest | 画像圧縮 |
| HTTP クライアント | Axios | 1.x | API 通信 |

---

## 2. アプリケーション全体構造

### 2.1 ディレクトリ構造

```
apps/web/
├── public/
│   ├── manifest.json              # PWA マニフェスト
│   ├── sw.js                      # Service Worker (ビルド生成)
│   ├── icons/                     # PWA アイコン (512x512, 192x192, etc.)
│   └── offline.html               # オフライン時フォールバックページ
├── src/
│   ├── main.tsx                   # エントリポイント
│   ├── App.tsx                    # ルートコンポーネント
│   ├── vite-env.d.ts              # Vite 型定義
│   ├── components/                # 共通コンポーネント
│   │   ├── ui/                    # shadcn/ui コンポーネント
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── layout/                # レイアウトコンポーネント
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── form/                  # フォーム関連
│   │   │   ├── FormField.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   └── DatePicker.tsx
│   │   └── common/                # 汎用コンポーネント
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── OfflineIndicator.tsx
│   │       └── SyncStatus.tsx
│   ├── features/                  # 機能ベースモジュール
│   │   ├── auth/                  # 認証
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── usePermissions.ts
│   │   │   ├── stores/
│   │   │   │   └── authStore.ts    # Zustand store
│   │   │   ├── api/
│   │   │   │   └── authApi.ts      # React Query hooks
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   ├── photos/                # Phase1: 写真管理 (コア機能)
│   │   │   ├── components/
│   │   │   │   ├── PhotoList.tsx
│   │   │   │   ├── PhotoCard.tsx
│   │   │   │   ├── PhotoUploader.tsx
│   │   │   │   ├── PhotoViewer.tsx
│   │   │   │   ├── CameraCapture.tsx
│   │   │   │   ├── LocationPicker.tsx
│   │   │   │   └── PhotoMap.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── usePhotos.ts
│   │   │   │   ├── usePhotoUpload.ts
│   │   │   │   ├── useCamera.ts
│   │   │   │   ├── useGeolocation.ts
│   │   │   │   └── useOfflineSync.ts
│   │   │   ├── stores/
│   │   │   │   ├── photoStore.ts   # オフライン状態管理
│   │   │   │   └── uploadQueueStore.ts
│   │   │   ├── api/
│   │   │   │   ├── photosApi.ts    # React Query mutations/queries
│   │   │   │   └── uploadApi.ts
│   │   │   ├── db/
│   │   │   │   └── photosDB.ts     # IndexedDB (Dexie)
│   │   │   ├── workers/
│   │   │   │   └── imageProcessor.worker.ts
│   │   │   ├── utils/
│   │   │   │   ├── imageCompression.ts
│   │   │   │   ├── exifReader.ts
│   │   │   │   └── gpsUtils.ts
│   │   │   └── types/
│   │   │       └── photo.types.ts
│   │   ├── projects/              # 工事案件管理
│   │   │   ├── components/
│   │   │   │   ├── ProjectList.tsx
│   │   │   │   ├── ProjectCard.tsx
│   │   │   │   └── ProjectDetails.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useProjects.ts
│   │   │   ├── api/
│   │   │   │   └── projectsApi.ts
│   │   │   └── types/
│   │   │       └── project.types.ts
│   │   └── settings/              # 設定
│   │       ├── components/
│   │       │   ├── SettingsPanel.tsx
│   │       │   └── CacheClearButton.tsx
│   │       └── hooks/
│   │           └── useSettings.ts
│   ├── routes/                    # ルート定義
│   │   ├── index.tsx              # ルートエクスポート
│   │   ├── ProtectedRoutes.tsx
│   │   └── routes.config.ts
│   ├── hooks/                     # グローバルフック
│   │   ├── useOnlineStatus.ts
│   │   ├── useBeforeInstallPrompt.ts
│   │   └── useServiceWorker.ts
│   ├── services/                  # サービス層
│   │   ├── api/
│   │   │   ├── client.ts          # Axios インスタンス
│   │   │   └── interceptors.ts    # Auth interceptor
│   │   ├── sync/
│   │   │   └── syncService.ts     # オフライン同期
│   │   └── notification/
│   │       └── notificationService.ts
│   ├── lib/                       # ライブラリ設定
│   │   ├── react-query.ts         # React Query 設定
│   │   ├── auth0.ts               # Auth0 設定
│   │   └── sentry.ts              # エラー監視
│   ├── utils/                     # ユーティリティ
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── storage.ts
│   ├── constants/                 # 定数
│   │   ├── api.ts
│   │   ├── routes.ts
│   │   └── permissions.ts
│   ├── types/                     # グローバル型定義
│   │   ├── global.d.ts
│   │   └── env.d.ts
│   └── styles/                    # グローバルスタイル
│       ├── index.css
│       └── tailwind.css
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. コンポーネントアーキテクチャ

### 3.1 コンポーネント設計原則

#### 3.1.1 責務の分離

```typescript
// ❌ Bad: ビジネスロジックとUIが混在
const PhotoList = () => {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    fetch('/api/photos')
      .then(res => res.json())
      .then(setPhotos);
  }, []);

  return <div>{photos.map(p => <img src={p.url} />)}</div>;
};

// ✅ Good: カスタムフックで分離
const PhotoList = () => {
  const { data: photos, isLoading } = usePhotos();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-3 gap-4">
      {photos.map(photo => (
        <PhotoCard key={photo.id} photo={photo} />
      ))}
    </div>
  );
};
```

#### 3.1.2 コンポーネント階層

```
【Presentation Components】(表示のみ、状態なし)
  ↓ props
【Container Components】(状態管理、ロジック)
  ↓ hooks
【Custom Hooks】(再利用可能なロジック)
  ↓ API
【React Query / Zustand】(データ取得・状態管理)
```

### 3.2 コンポーネント分類

#### 3.2.1 Presentation Components (Dumb Components)

```typescript
// src/features/photos/components/PhotoCard.tsx
import { Card, CardContent } from '@/components/ui/card';
import type { Photo } from '../types/photo.types';

interface PhotoCardProps {
  photo: Photo;
  onSelect?: (photo: Photo) => void;
  className?: string;
}

export const PhotoCard = ({ photo, onSelect, className }: PhotoCardProps) => {
  return (
    <Card
      className={`cursor-pointer hover:shadow-lg transition ${className}`}
      onClick={() => onSelect?.(photo)}
    >
      <CardContent>
        <img
          src={photo.thumbnailUrl}
          alt={photo.description}
          loading="lazy"
          className="w-full h-48 object-cover rounded"
        />
        <div className="mt-2">
          <p className="text-sm font-medium">{photo.description}</p>
          <p className="text-xs text-gray-500">
            {new Date(photo.capturedAt).toLocaleString('ja-JP')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
```

#### 3.2.2 Container Components (Smart Components)

```typescript
// src/features/photos/components/PhotoList.tsx
import { usePhotos } from '../hooks/usePhotos';
import { usePhotoStore } from '../stores/photoStore';
import { PhotoCard } from './PhotoCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

interface PhotoListProps {
  projectId: string;
}

export const PhotoList = ({ projectId }: PhotoListProps) => {
  const { data: photos, isLoading, error } = usePhotos(projectId);
  const { selectPhoto } = usePhotoStore();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {photos?.map(photo => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          onSelect={selectPhoto}
        />
      ))}
    </div>
  );
};
```

---

## 4. 状態管理アーキテクチャ

### 4.1 状態の分類と管理方法

| 状態の種類 | 管理方法 | 用途 | 例 |
|-----------|---------|------|-----|
| サーバー状態 | React Query | APIから取得したデータ | photos, projects, users |
| グローバルクライアント状態 | Zustand | アプリ全体で共有する状態 | 認証情報、UI状態 |
| ローカルコンポーネント状態 | useState | 単一コンポーネント内の状態 | フォーム入力、モーダル開閉 |
| オフラインデータ | IndexedDB (Dexie) | オフライン時のデータ永続化 | 未送信写真、キャッシュ |

### 4.2 React Query 設定

```typescript
// src/lib/react-query.ts
import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5分間はキャッシュを新鮮と見なす
      cacheTime: 10 * 60 * 1000,       // 10分間キャッシュを保持
      retry: 3,                         // 3回リトライ
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,       // ウィンドウフォーカス時に再取得
      refetchOnReconnect: true,         // ネットワーク再接続時に再取得
      networkMode: 'offlineFirst',      // オフラインファースト
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

// IndexedDB への永続化
const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000, // 24時間
});
```

### 4.3 React Query カスタムフック例

```typescript
// src/features/photos/api/photosApi.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { photosDB } from '../db/photosDB';
import type { Photo, CreatePhotoDto } from '../types/photo.types';

// Query Keys
export const photoKeys = {
  all: ['photos'] as const,
  lists: () => [...photoKeys.all, 'list'] as const,
  list: (projectId: string) => [...photoKeys.lists(), projectId] as const,
  details: () => [...photoKeys.all, 'detail'] as const,
  detail: (id: string) => [...photoKeys.details(), id] as const,
};

// 写真一覧取得
export const usePhotos = (projectId: string) => {
  return useQuery({
    queryKey: photoKeys.list(projectId),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<Photo[]>(`/projects/${projectId}/photos`);
        // オンライン取得成功時はIndexedDBにもキャッシュ
        await photosDB.photos.bulkPut(data);
        return data;
      } catch (error) {
        // オフライン時はIndexedDBから取得
        console.warn('Fetching from IndexedDB due to network error');
        const cachedPhotos = await photosDB.photos
          .where('projectId')
          .equals(projectId)
          .toArray();
        return cachedPhotos;
      }
    },
  });
};

// 写真アップロード
export const usePhotoUpload = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreatePhotoDto) => {
      const formData = new FormData();
      formData.append('file', dto.file);
      formData.append('projectId', dto.projectId);
      formData.append('description', dto.description);
      formData.append('latitude', dto.latitude.toString());
      formData.append('longitude', dto.longitude.toString());

      const { data } = await apiClient.post<Photo>('/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return data;
    },
    onMutate: async (newPhoto) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: photoKeys.list(newPhoto.projectId) });

      const previousPhotos = queryClient.getQueryData<Photo[]>(
        photoKeys.list(newPhoto.projectId)
      );

      // 仮IDで即座にUI更新
      const optimisticPhoto: Photo = {
        id: `temp-${Date.now()}`,
        ...newPhoto,
        uploadedBy: 'current-user', // 仮
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Photo[]>(
        photoKeys.list(newPhoto.projectId),
        (old) => [...(old || []), optimisticPhoto]
      );

      // オフライン対応: IndexedDBに保存
      await photosDB.pendingUploads.add({
        ...newPhoto,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      return { previousPhotos };
    },
    onError: (err, newPhoto, context) => {
      // エラー時は元に戻す
      if (context?.previousPhotos) {
        queryClient.setQueryData(
          photoKeys.list(newPhoto.projectId),
          context.previousPhotos
        );
      }
    },
    onSuccess: (data, variables) => {
      // 成功時はキャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: photoKeys.list(variables.projectId) });

      // IndexedDBから pending を削除
      photosDB.pendingUploads.where('file').equals(variables.file).delete();
    },
  });
};
```

### 4.4 Zustand ストア設計

```typescript
// src/features/photos/stores/photoStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Photo } from '../types/photo.types';

interface PhotoState {
  selectedPhoto: Photo | null;
  viewMode: 'grid' | 'list' | 'map';
  filters: {
    dateFrom?: Date;
    dateTo?: Date;
    uploadedBy?: string;
  };

  // Actions
  selectPhoto: (photo: Photo | null) => void;
  setViewMode: (mode: 'grid' | 'list' | 'map') => void;
  setFilters: (filters: PhotoState['filters']) => void;
  clearFilters: () => void;
}

export const usePhotoStore = create<PhotoState>()(
  persist(
    (set) => ({
      selectedPhoto: null,
      viewMode: 'grid',
      filters: {},

      selectPhoto: (photo) => set({ selectedPhoto: photo }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setFilters: (filters) => set({ filters }),
      clearFilters: () => set({ filters: {} }),
    }),
    {
      name: 'photo-store', // localStorage key
      partialize: (state) => ({
        viewMode: state.viewMode, // viewMode だけ永続化
      }),
    }
  )
);
```

```typescript
// src/features/auth/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, token) =>
        set({ user, accessToken: token, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),

      hasPermission: (permission) => {
        const { user } = get();
        return user?.permissions.includes(permission) ?? false;
      },
    }),
    {
      name: 'auth-store',
    }
  )
);
```

---

## 5. PWA オフライン戦略

### 5.1 Service Worker 設定 (Workbox)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'CDCP - 建設デジタル管理プラットフォーム',
        short_name: 'CDCP',
        description: '建設現場の写真・書類・進捗を一元管理',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.cdcp\.example\.com\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1時間
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.cloudfront\.net\/photos\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
```

### 5.2 IndexedDB スキーマ (Dexie)

```typescript
// src/features/photos/db/photosDB.ts
import Dexie, { Table } from 'dexie';
import type { Photo } from '../types/photo.types';

interface PendingUpload {
  id?: number;
  file: File;
  projectId: string;
  description: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'uploading' | 'failed';
  retryCount: number;
  createdAt: string;
  lastAttemptAt?: string;
  error?: string;
}

class PhotosDatabase extends Dexie {
  photos!: Table<Photo, string>;
  pendingUploads!: Table<PendingUpload, number>;

  constructor() {
    super('CDCPPhotosDB');

    this.version(1).stores({
      photos: 'id, projectId, uploadedBy, capturedAt, [projectId+capturedAt]',
      pendingUploads: '++id, projectId, status, createdAt',
    });
  }
}

export const photosDB = new PhotosDatabase();
```

### 5.3 オフライン同期サービス

```typescript
// src/services/sync/syncService.ts
import { photosDB } from '@/features/photos/db/photosDB';
import { apiClient } from '../api/client';

class SyncService {
  private syncInProgress = false;

  async syncPendingUploads() {
    if (this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      const pendingUploads = await photosDB.pendingUploads
        .where('status')
        .equals('pending')
        .or('status')
        .equals('failed')
        .and((upload) => upload.retryCount < 3)
        .toArray();

      for (const upload of pendingUploads) {
        try {
          // ステータスを uploading に更新
          await photosDB.pendingUploads.update(upload.id!, {
            status: 'uploading',
            lastAttemptAt: new Date().toISOString(),
          });

          // アップロード実行
          const formData = new FormData();
          formData.append('file', upload.file);
          formData.append('projectId', upload.projectId);
          formData.append('description', upload.description);
          formData.append('latitude', upload.latitude.toString());
          formData.append('longitude', upload.longitude.toString());

          await apiClient.post('/photos', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          // 成功したら削除
          await photosDB.pendingUploads.delete(upload.id!);

          console.log(`✅ Synced upload ${upload.id}`);
        } catch (error) {
          // 失敗したらリトライカウント増加
          await photosDB.pendingUploads.update(upload.id!, {
            status: 'failed',
            retryCount: upload.retryCount + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          console.error(`❌ Failed to sync upload ${upload.id}:`, error);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  // ネットワーク復帰時に自動同期
  startAutoSync() {
    window.addEventListener('online', () => {
      console.log('🌐 Network restored, starting sync...');
      this.syncPendingUploads();
    });

    // 定期同期 (5分ごと)
    setInterval(() => {
      if (navigator.onLine) {
        this.syncPendingUploads();
      }
    }, 5 * 60 * 1000);
  }
}

export const syncService = new SyncService();
```

---

## 6. カメラ・GPS 統合

### 6.1 カメラキャプチャコンポーネント

```typescript
// src/features/photos/components/CameraCapture.tsx
import { useRef, useState, useCallback } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useGeolocation } from '../hooks/useGeolocation';
import { Button } from '@/components/ui/button';
import { Camera, MapPin } from 'lucide-react';

export const CameraCapture = ({ onCapture }: { onCapture: (data: CaptureData) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { stream, startCamera, stopCamera } = useCamera();
  const { location, accuracy, error: gpsError } = useGeolocation();
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleStartCamera = useCallback(async () => {
    const mediaStream = await startCamera({ facingMode: 'environment' });
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
      setIsCameraActive(true);
    }
  }, [startCamera]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !location) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // ビデオフレームをキャンバスに描画
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // Canvas から Blob に変換
    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      onCapture({
        file,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy,
        capturedAt: new Date(),
      });

      stopCamera();
      setIsCameraActive(false);
    }, 'image/jpeg', 0.92);
  }, [location, accuracy, stopCamera, onCapture]);

  return (
    <div className="space-y-4">
      {!isCameraActive ? (
        <Button onClick={handleStartCamera} className="w-full">
          <Camera className="mr-2 h-4 w-4" />
          カメラを起動
        </Button>
      ) : (
        <>
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full"
            />
            {location && (
              <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                精度: {accuracy?.toFixed(0)}m
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex gap-2">
            <Button
              onClick={handleCapture}
              disabled={!location}
              className="flex-1"
            >
              撮影
            </Button>
            <Button
              onClick={() => {
                stopCamera();
                setIsCameraActive(false);
              }}
              variant="outline"
            >
              キャンセル
            </Button>
          </div>

          {gpsError && (
            <p className="text-sm text-red-500">
              位置情報の取得に失敗しました: {gpsError}
            </p>
          )}
        </>
      )}
    </div>
  );
};
```

### 6.2 Geolocation カスタムフック

```typescript
// src/features/photos/hooks/useGeolocation.ts
import { useState, useEffect } from 'react';

interface GeolocationState {
  location: { latitude: number; longitude: number } | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
}

export const useGeolocation = (options?: PositionOptions) => {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    accuracy: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported',
        isLoading: false,
      }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
          error: null,
          isLoading: false,
        });
      },
      (error) => {
        setState(prev => ({
          ...prev,
          error: error.message,
          isLoading: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return state;
};
```

### 6.3 地図表示コンポーネント

```typescript
// src/features/photos/components/PhotoMap.tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Photo } from '../types/photo.types';

const photoIcon = new Icon({
  iconUrl: '/icons/camera-marker.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

interface PhotoMapProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
}

export const PhotoMap = ({ photos, onPhotoClick }: PhotoMapProps) => {
  // 写真の中心座標を計算
  const center = photos.length > 0
    ? {
        lat: photos.reduce((sum, p) => sum + p.latitude, 0) / photos.length,
        lng: photos.reduce((sum, p) => sum + p.longitude, 0) / photos.length,
      }
    : { lat: 35.6812, lng: 139.7671 }; // デフォルトは東京

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      className="h-[600px] w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {photos.map(photo => (
        <Marker
          key={photo.id}
          position={[photo.latitude, photo.longitude]}
          icon={photoIcon}
          eventHandlers={{
            click: () => onPhotoClick(photo),
          }}
        >
          <Popup>
            <div className="p-2">
              <img
                src={photo.thumbnailUrl}
                alt={photo.description}
                className="w-32 h-24 object-cover rounded mb-2"
              />
              <p className="text-sm font-medium">{photo.description}</p>
              <p className="text-xs text-gray-500">
                {new Date(photo.capturedAt).toLocaleString('ja-JP')}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
```

---

## 7. 画像最適化

### 7.1 Web Worker による画像圧縮

```typescript
// src/features/photos/workers/imageProcessor.worker.ts
import imageCompression from 'browser-image-compression';

self.onmessage = async (e: MessageEvent<{ file: File }>) => {
  const { file } = e.data;

  try {
    const options = {
      maxSizeMB: 1,              // 最大1MB
      maxWidthOrHeight: 1920,    // 最大1920px
      useWebWorker: false,        // Worker内なのでfalse
      fileType: 'image/jpeg',
    };

    const compressedFile = await imageCompression(file, options);

    // サムネイル生成 (320px)
    const thumbnailOptions = {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 320,
      useWebWorker: false,
      fileType: 'image/jpeg',
    };

    const thumbnail = await imageCompression(file, thumbnailOptions);

    self.postMessage({
      success: true,
      compressedFile,
      thumbnail,
      originalSize: file.size,
      compressedSize: compressedFile.size,
      compressionRatio: ((1 - compressedFile.size / file.size) * 100).toFixed(1),
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
```

### 7.2 画像アップロードフック

```typescript
// src/features/photos/hooks/usePhotoUpload.ts
import { useState } from 'react';
import { usePhotoUpload as usePhotoUploadMutation } from '../api/photosApi';
import ImageProcessorWorker from '../workers/imageProcessor.worker?worker';

export const usePhotoUpload = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const uploadMutation = usePhotoUploadMutation();

  const uploadPhoto = async (file: File, metadata: PhotoMetadata) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      // Web Worker で画像圧縮
      const worker = new ImageProcessorWorker();

      const processedData = await new Promise<ProcessedImageData>((resolve, reject) => {
        worker.onmessage = (e) => {
          if (e.data.success) {
            resolve(e.data);
          } else {
            reject(new Error(e.data.error));
          }
          worker.terminate();
        };

        worker.postMessage({ file });
      });

      setProgress(50);

      // アップロード実行
      await uploadMutation.mutateAsync({
        file: processedData.compressedFile,
        thumbnail: processedData.thumbnail,
        ...metadata,
      });

      setProgress(100);

      return {
        success: true,
        compressionRatio: processedData.compressionRatio,
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return {
    uploadPhoto,
    isProcessing,
    progress,
    isUploading: uploadMutation.isPending,
  };
};
```

---

## 8. ルーティング設計

### 8.1 ルート定義

```typescript
// src/routes/routes.config.ts
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  PROJECTS: '/projects',
  PROJECT_DETAIL: '/projects/:id',
  PHOTOS: '/projects/:projectId/photos',
  PHOTO_DETAIL: '/photos/:id',
  PHOTO_UPLOAD: '/projects/:projectId/photos/upload',
  SETTINGS: '/settings',
  OFFLINE: '/offline',
} as const;
```

```typescript
// src/routes/index.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { ROUTES } from './routes.config';

// Lazy load pages
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const PhotosPage = lazy(() => import('@/pages/PhotosPage'));
const PhotoUploadPage = lazy(() => import('@/pages/PhotoUploadPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: ROUTES.HOME,
            element: <Navigate to={ROUTES.PROJECTS} replace />,
          },
          {
            path: ROUTES.PROJECTS,
            element: <ProjectsPage />,
          },
          {
            path: ROUTES.PHOTOS,
            element: <PhotosPage />,
          },
          {
            path: ROUTES.PHOTO_UPLOAD,
            element: <PhotoUploadPage />,
          },
          {
            path: ROUTES.SETTINGS,
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },
]);
```

---

## 9. パフォーマンス最適化

### 9.1 Code Splitting

```typescript
// src/App.tsx
import { Suspense, lazy } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const router = lazy(() => import('./routes'));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  );
}

export default App;
```

### 9.2 画像遅延読み込み

```typescript
// src/components/common/LazyImage.tsx
import { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
}

export const LazyImage = ({
  src,
  alt,
  placeholder = 'data:image/svg+xml,...',
  className
}: LazyImageProps) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} transition-opacity ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      onLoad={() => setIsLoaded(true)}
      loading="lazy"
    />
  );
};
```

### 9.3 仮想スクロール (大量データ対応)

```typescript
// src/features/photos/components/VirtualPhotoList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { PhotoCard } from './PhotoCard';
import type { Photo } from '../types/photo.types';

interface VirtualPhotoListProps {
  photos: Photo[];
}

export const VirtualPhotoList = ({ photos }: VirtualPhotoListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: photos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, // 1行の推定高さ
    overscan: 5, // 画面外の余分にレンダリングする数
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <PhotoCard photo={photos[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 10. エラーハンドリング

### 10.1 Error Boundary

```typescript
// src/components/common/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    // Sentry などへ送信
    // Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-600">
              エラーが発生しました
            </h1>
            <p className="text-gray-600">
              {this.state.error?.message || '予期しないエラーが発生しました'}
            </p>
            <Button onClick={() => window.location.reload()}>
              ページを再読み込み
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 11. セキュリティ対策

### 11.1 API クライアント設定

```typescript
// src/services/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/features/auth/stores/authStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: 認証トークン付与
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: トークン失効時の処理
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // トークン失効時はログアウト
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 11.2 XSS 対策

```typescript
// src/utils/sanitize.ts
import DOMPurify from 'dompurify';

export const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
};

// 使用例
// <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(userInput) }} />
```

---

## 12. テスト戦略

### 12.1 単体テスト (Vitest + React Testing Library)

```typescript
// src/features/photos/components/PhotoCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PhotoCard } from './PhotoCard';

describe('PhotoCard', () => {
  const mockPhoto = {
    id: '1',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    description: 'Test Photo',
    capturedAt: '2024-01-01T00:00:00Z',
    latitude: 35.6812,
    longitude: 139.7671,
  };

  it('should render photo information correctly', () => {
    render(<PhotoCard photo={mockPhoto} />);

    expect(screen.getByText('Test Photo')).toBeInTheDocument();
    expect(screen.getByAltText('Test Photo')).toHaveAttribute(
      'src',
      'https://example.com/thumb.jpg'
    );
  });

  it('should call onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<PhotoCard photo={mockPhoto} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('img'));

    expect(onSelect).toHaveBeenCalledWith(mockPhoto);
  });
});
```

### 12.2 E2E テスト (Playwright)

```typescript
// e2e/photo-upload.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Photo Upload', () => {
  test('should upload photo with GPS location', async ({ page, context }) => {
    // GPS 位置情報を許可
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 35.6812, longitude: 139.7671 });

    await page.goto('/projects/1/photos/upload');

    // カメラを起動
    await page.click('button:has-text("カメラを起動")');

    // カメラストリームのモック
    await page.evaluate(() => {
      const mockStream = {
        getTracks: () => [{ stop: () => {} }],
      };
      navigator.mediaDevices.getUserMedia = async () => mockStream as any;
    });

    // 撮影ボタンをクリック
    await page.click('button:has-text("撮影")');

    // 説明を入力
    await page.fill('textarea[name="description"]', 'Test photo description');

    // アップロード
    await page.click('button:has-text("アップロード")');

    // 成功メッセージを確認
    await expect(page.locator('text=写真をアップロードしました')).toBeVisible();
  });
});
```

---

## 13. まとめ

本 React PWA アーキテクチャ設計では、以下を実現する。

### 13.1 主要達成項目

| 項目 | 実装方法 |
|------|---------|
| オフライン対応 | Service Worker (Workbox) + IndexedDB |
| 状態管理 | React Query (サーバー) + Zustand (クライアント) |
| カメラ統合 | getUserMedia API + Canvas API |
| GPS 位置情報 | Geolocation API + Leaflet |
| 画像最適化 | Web Worker + browser-image-compression |
| パフォーマンス | Code Splitting + Lazy Loading + 仮想スクロール |
| セキュリティ | XSS対策 + CSRF対策 + Auth0 |
| テスト | Vitest + React Testing Library + Playwright |

### 13.2 Phase1 での実装優先度

1. **最優先 (Phase1 必須)**
   - カメラキャプチャ機能
   - GPS 位置情報取得
   - オフライン写真保存
   - 写真一覧・詳細表示

2. **高優先度**
   - バックグラウンド同期
   - 画像圧縮・最適化
   - 地図表示

3. **中優先度**
   - 仮想スクロール
   - PWA インストールプロンプト

4. **低優先度 (Phase2以降)**
   - 高度な画像編集機能
   - オフライン地図キャッシュ

---

**作成日**: 2026-02-15
**バージョン**: 1.0
**作成者**: Architecture Review Agent
