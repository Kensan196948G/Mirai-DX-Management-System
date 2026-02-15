# API設計書 (API Design Specification)

**システム名称**: Construction Digital Control Platform (CDCP)
**作成日**: 2026-02-15
**版数**: 1.0
**対象フェーズ**: Phase 1-3

---

## 目次

1. [文書概要](#1-文書概要)
2. [API設計の基本方針](#2-api設計の基本方針)
3. [認証・認可](#3-認証認可)
4. [エンドポイント一覧](#4-エンドポイント一覧)
5. [リクエスト/レスポンス仕様](#5-リクエストレスポンス仕様)
6. [エラーハンドリング](#6-エラーハンドリング)
7. [レート制限](#7-レート制限)
8. [バージョニング戦略](#8-バージョニング戦略)
9. [WebHook仕様](#9-webhook仕様)
10. [パフォーマンス設計](#10-パフォーマンス設計)

---

## 1. 文書概要

### 1.1 目的

本文書は、CDCP（Construction Digital Control Platform）のREST API設計を定義し、クライアント・外部連携システムとの通信仕様を明確化する。

### 1.2 対象読者

- バックエンド開発チーム
- フロントエンド開発チーム
- 外部連携パートナー
- API利用者

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **RESTful設計** | リソース指向のAPI設計、HTTPメソッドの適切な使用分け |
| **バージョニング** | URLパスにバージョン含む（/api/v1/, /api/v2/） |
| **JSON形式** | すべてのリクエスト/レスポンスはJSON形式 |
| **一貫性** | エラーレスポンス、ページネーションの統一化 |
| **セキュリティ** | OAuth 2.0による認証、TLS 1.3による暗号化通信 |
| **ドキュメント** | OpenAPI 3.0準拠、Swagger UIで閲覧可能 |

---

## 2. API設計の基本方針

### 2.1 ベースURL

```
本番: https://api.cdcp.company.jp/api
ステージング: https://staging-api.cdcp.company.jp/api
開発: http://localhost:3000/api
```

### 2.2 HTTPメソッド

| メソッド | 用途 | 例 |
|---------|------|-----|
| **GET** | リソース取得 | GET /api/v1/photos |
| **POST** | リソース作成 | POST /api/v1/photos |
| **PUT** | リソース全体更新 | PUT /api/v1/photos/{id} |
| **PATCH** | リソース部分更新 | PATCH /api/v1/photos/{id} |
| **DELETE** | リソース削除 | DELETE /api/v1/photos/{id} |

### 2.3 ステータスコード

| コード | 説明 | 例 |
|--------|------|-----|
| **200** | OK - リクエスト成功 | GET成功時 |
| **201** | Created - リソース作成成功 | POST成功時 |
| **204** | No Content - 成功、レスポンス本文なし | DELETE成功時 |
| **400** | Bad Request - リクエスト不正 | バリデーションエラー |
| **401** | Unauthorized - 認証失敗 | トークン無効 |
| **403** | Forbidden - 権限不足 | ロール不足 |
| **404** | Not Found - リソース未検出 | 存在しないID指定 |
| **409** | Conflict - 重複・競合 | 既存案件と同じコード |
| **429** | Too Many Requests - レート制限超過 |  |
| **500** | Internal Server Error - サーバーエラー |  |

### 2.4 共通ヘッダ

#### リクエストヘッダ

```http
Content-Type: application/json
Authorization: Bearer {access_token}
X-Client-Version: 1.0.0
X-Request-ID: {uuid}
```

#### レスポンスヘッダ

```http
Content-Type: application/json
X-Response-Time: 123ms
X-API-Version: 1.0.0
Cache-Control: no-cache, must-revalidate
```

---

## 3. 認証・認可

### 3.1 認証方式

#### OAuth 2.0 (Authorization Code Flow + PKCE)

**フロー**:

```
1. クライアント: Auth0認可エンドポイントへリダイレクト
2. ユーザー: ログイン・MFA実施
3. Auth0: 認可コード返却
4. クライアント: トークンエンドポイントへ認可コード送信
5. Auth0: Access Token + Refresh Token返却
6. クライアント: Access Tokenで API呼び出し
```

**実装例 (JavaScript)**:

```javascript
// Auth0ログイン
const { data: { access_token } } = await auth0Client.getTokenSilently();

// API呼び出し
const response = await fetch('https://api.cdcp.company.jp/api/v1/photos', {
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  }
});
```

### 3.2 トークン管理

| 項目 | 値 | 説明 |
|------|-----|------|
| **Access Token** | JWT | 有効期限: 1日 |
| **Refresh Token** | - | 有効期限: 30日 |
| **トークン形式** | Bearer | `Authorization: Bearer {token}` |

### 3.3 ロールベースアクセス制御（RBAC）

#### ロール定義

```javascript
const ROLES = {
  SYSTEM_ADMIN: {
    name: 'system_admin',
    display: 'システム管理者',
    permissions: ['*'] // 全権限
  },
  BRANCH_ADMIN: {
    name: 'branch_admin',
    display: '拠点管理者',
    permissions: [
      'project:read',
      'project:write',      // 配下拠点のみ
      'photo:read',
      'photo:write',        // 配下拠点のみ
      'user:read',
      'user:write'          // 配下拠点のみ
    ]
  },
  SUPERVISOR: {
    name: 'supervisor',
    display: '現場監督',
    permissions: [
      'photo:read',
      'photo:write',        // 割当案件のみ
      'schedule:read',
      'schedule:write',     // 割当案件のみ
      'cost:read',
      'cost:write',         // 割当案件のみ
      'issue:read',
      'issue:write'
    ]
  },
  WORKER: {
    name: 'worker',
    display: '作業員',
    permissions: [
      'photo:read',
      'photo:write',        // 自分の写真のみ
      'issue:read'
    ]
  },
  VIEWER: {
    name: 'viewer',
    display: '閲覧専用',
    permissions: [
      'photo:read',
      'project:read'
    ]
  }
};
```

#### 権限チェックミドルウェア例

```typescript
// src/middleware/authorize.ts
async function authorize(req, res, next) {
  const user = req.user;
  const requiredPermission = req.requiredPermission;

  if (!user.permissions.includes(requiredPermission)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Insufficient permissions',
      required: requiredPermission,
      your_permissions: user.permissions
    });
  }
  next();
}
```

---

## 4. エンドポイント一覧

### 4.1 認証・ユーザー管理

#### 4.1.1 ユーザー情報取得

```http
GET /api/v1/me
```

**説明**: 現在のログインユーザー情報を取得

**レスポンス例**:

```json
{
  "id": "user-uuid-123",
  "email": "supervisor@company.jp",
  "name": "山田太郎",
  "organization_id": "org-uuid-456",
  "roles": ["supervisor"],
  "permissions": ["photo:read", "photo:write"],
  "last_login_at": "2026-02-15T10:30:00Z"
}
```

---

### 4.2 案件管理 (Phase 1-2)

#### 4.2.1 案件一覧取得

```http
GET /api/v1/projects
  ?page=1&limit=20&status=施工中&organization_id=org-123
```

**パラメータ**:

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| page | integer | false | ページ番号（デフォルト: 1） |
| limit | integer | false | 1ページの件数（デフォルト: 20、最大: 100） |
| status | string | false | ステータスフィルタ（準備中/施工中/完成/中止） |
| organization_id | string | false | 組織ID（権限による自動フィルタ） |

**レスポンス例**:

```json
{
  "data": [
    {
      "id": "proj-uuid-001",
      "code": "PJ2026-001",
      "name": "A市道路改修工事",
      "client_name": "A市役所",
      "client_type": "公共",
      "construction_type": "舗装工事",
      "location": "A市XX地区",
      "location_point": {
        "type": "Point",
        "coordinates": [139.123, 35.456]  // [経度, 緯度]
      },
      "contract_amount": 50000000,
      "start_date": "2026-04-01",
      "end_date": "2026-10-31",
      "status": "施工中",
      "supervisor_id": "user-uuid-789",
      "supervisor_name": "山田太郎",
      "organization_id": "org-uuid-456",
      "created_at": "2026-02-01T09:00:00Z",
      "updated_at": "2026-02-15T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

#### 4.2.2 案件詳細取得

```http
GET /api/v1/projects/{project_id}
```

**レスポンス例**:

```json
{
  "id": "proj-uuid-001",
  "code": "PJ2026-001",
  "name": "A市道路改修工事",
  "contract_amount": 50000000,
  "start_date": "2026-04-01",
  "end_date": "2026-10-31",
  "status": "施工中",
  "members": [
    {
      "user_id": "user-uuid-789",
      "name": "山田太郎",
      "role": "監督",
      "assigned_at": "2026-02-01T09:00:00Z"
    }
  ],
  "stats": {
    "total_photos": 1250,
    "photos_this_week": 80,
    "total_issues": 35,
    "open_issues": 12
  }
}
```

#### 4.2.3 案件作成

```http
POST /api/v1/projects
```

**リクエスト例**:

```json
{
  "code": "PJ2026-001",
  "name": "A市道路改修工事",
  "client_name": "A市役所",
  "client_type": "公共",
  "construction_type": "舗装工事",
  "location": "A市XX地区",
  "location_point": {
    "type": "Point",
    "coordinates": [139.123, 35.456]
  },
  "contract_amount": 50000000,
  "start_date": "2026-04-01",
  "end_date": "2026-10-31",
  "supervisor_id": "user-uuid-789",
  "organization_id": "org-uuid-456"
}
```

**レスポンス**: 201 Created

```json
{
  "id": "proj-uuid-001",
  "code": "PJ2026-001",
  "name": "A市道路改修工事",
  "status": "準備中",
  "created_at": "2026-02-15T14:30:00Z"
}
```

---

### 4.3 写真管理 (Phase 1)

#### 4.3.1 写真一覧取得

```http
GET /api/v1/projects/{project_id}/photos
  ?folder_id=folder-123&taken_at_from=2026-02-01&taken_at_to=2026-02-28
  &tags=工種:土工,進捗:完成&page=1&limit=50
```

**パラメータ**:

| 名前 | 型 | 説明 |
|------|-----|------|
| folder_id | string | フォルダIDでフィルタ |
| taken_at_from | date | 撮影日開始（YYYY-MM-DD） |
| taken_at_to | date | 撮影日終了 |
| tags | string | タグでフィルタ（複数タグ: カンマ区切り） |
| page | integer | ページ番号 |
| limit | integer | 1ページの件数 |

**レスポンス例**:

```json
{
  "data": [
    {
      "id": "photo-uuid-001",
      "file_name": "IMG_20260215_145000.jpg",
      "thumbnail_url": "https://cdn.cdcp.company.jp/photos/thumbs/photo-uuid-001.jpg",
      "image_url": "https://cdn.cdcp.company.jp/photos/photo-uuid-001.jpg",
      "file_size": 5242880,
      "width": 4000,
      "height": 3000,
      "taken_at": "2026-02-15T14:50:00Z",
      "location_point": {
        "type": "Point",
        "coordinates": [139.123, 35.456]
      },
      "location_address": "東京都XX区XX町X-X",
      "tags": ["工種:土工", "進捗:完成"],
      "uploaded_by": "user-uuid-789",
      "uploaded_by_name": "山田太郎",
      "uploaded_at": "2026-02-15T14:55:00Z"
    }
  ],
  "pagination": {
    "total": 1250,
    "page": 1,
    "limit": 50,
    "pages": 25
  }
}
```

#### 4.3.2 写真アップロード

```http
POST /api/v1/projects/{project_id}/photos
```

**リクエスト形式**: multipart/form-data

```
Content-Type: multipart/form-data; boundary=----Boundary

------Boundary
Content-Disposition: form-data; name="file"; filename="IMG_20260215_145000.jpg"
Content-Type: image/jpeg

[JPEG binary data]
------Boundary
Content-Disposition: form-data; name="folder_id"

folder-uuid-123
------Boundary
Content-Disposition: form-data; name="tags"

["工種:土工", "進捗:完成"]
------Boundary
Content-Disposition: form-data; name="taken_at"

2026-02-15T14:50:00Z
------Boundary
Content-Disposition: form-data; name="location_point"

{"type": "Point", "coordinates": [139.123, 35.456]}
------Boundary--
```

**レスポンス**: 201 Created

```json
{
  "id": "photo-uuid-001",
  "file_name": "IMG_20260215_145000.jpg",
  "file_size": 5242880,
  "thumbnail_url": "https://cdn.cdcp.company.jp/photos/thumbs/photo-uuid-001.jpg",
  "image_url": "https://cdn.cdcp.company.jp/photos/photo-uuid-001.jpg",
  "taken_at": "2026-02-15T14:50:00Z",
  "uploaded_at": "2026-02-15T14:55:00Z",
  "status": "processing"  // processing → ready
}
```

#### 4.3.3 バッチアップロード

```http
POST /api/v1/projects/{project_id}/photos/batch
```

**説明**: 複数写真の一括アップロード（最大50枚）

**リクエスト形式**: multipart/form-data

```
複数の file[] フィールドで複数ファイルを指定
```

**レスポンス**: 201 Created

```json
{
  "uploaded": 48,
  "failed": 2,
  "results": [
    {
      "file_name": "IMG_20260215_145000.jpg",
      "status": "success",
      "id": "photo-uuid-001"
    },
    {
      "file_name": "IMG_20260215_145001.jpg",
      "status": "failed",
      "error": "File size exceeds 10MB limit"
    }
  ]
}
```

#### 4.3.4 写真削除

```http
DELETE /api/v1/photos/{photo_id}
```

**レスポンス**: 204 No Content

---

### 4.4 工程管理 (Phase 2)

#### 4.4.1 工程一覧取得

```http
GET /api/v1/projects/{project_id}/schedules
  ?depth=all&include_progress=true
```

**レスポンス例（Ganttチャート用）**:

```json
{
  "data": [
    {
      "id": "sched-uuid-001",
      "name": "土工",
      "level": 1,
      "start_date": "2026-04-01",
      "end_date": "2026-05-31",
      "actual_start_date": "2026-04-01",
      "actual_end_date": null,
      "progress_rate": 45.0,
      "is_critical_path": true,
      "children": [
        {
          "id": "sched-uuid-002",
          "name": "掘削",
          "level": 2,
          "start_date": "2026-04-01",
          "end_date": "2026-04-30",
          "progress_rate": 80.0,
          "children": []
        }
      ]
    }
  ]
}
```

#### 4.4.2 工程作成

```http
POST /api/v1/projects/{project_id}/schedules
```

**リクエスト例**:

```json
{
  "name": "土工",
  "level": 1,
  "start_date": "2026-04-01",
  "end_date": "2026-05-31",
  "parent_id": null
}
```

**レスポンス**: 201 Created

---

### 4.5 原価管理 (Phase 2)

#### 4.5.1 原価一覧取得

```http
GET /api/v1/projects/{project_id}/costs
  ?category=材料費&month=2026-02
```

**レスポンス例**:

```json
{
  "data": [
    {
      "id": "cost-uuid-001",
      "category": "材料費",
      "sub_category": "鋼材",
      "budget_amount": 5000000,
      "actual_amount": 4800000,
      "variance": -200000,
      "variance_rate": -4.0,
      "actual_date": "2026-02-15",
      "vendor_name": "A建設資材"
    }
  ],
  "summary": {
    "total_budget": 50000000,
    "total_actual": 42000000,
    "total_variance": -8000000,
    "gross_profit_rate": 16.0
  }
}
```

#### 4.5.2 原価登録

```http
POST /api/v1/projects/{project_id}/costs
```

**リクエスト例**:

```json
{
  "category": "材料費",
  "sub_category": "鋼材",
  "actual_amount": 1200000,
  "actual_date": "2026-02-15",
  "vendor_name": "A建設資材",
  "invoice_number": "INV-202602-001"
}
```

**レスポンス**: 201 Created

---

### 4.6 指摘・是正管理 (Phase 1-2)

#### 4.6.1 指摘一覧取得

```http
GET /api/v1/projects/{project_id}/issues
  ?status=未対応&severity=high&page=1&limit=20
```

**レスポンス例**:

```json
{
  "data": [
    {
      "id": "issue-uuid-001",
      "issue_number": "ISS-2026-001",
      "content": "基礎コンクリート打設時のひび割れ",
      "severity": "高",
      "due_date": "2026-02-28",
      "responsible_user": "user-uuid-456",
      "status": "未対応",
      "created_at": "2026-02-15T14:30:00Z"
    }
  ]
}
```

#### 4.6.2 指摘登録

```http
POST /api/v1/projects/{project_id}/issues
```

**リクエスト例**:

```json
{
  "content": "基礎コンクリート打設時のひび割れ",
  "severity": "高",
  "due_date": "2026-02-28",
  "responsible_user_id": "user-uuid-456",
  "photo_id": "photo-uuid-001"
}
```

---

### 4.7 発注者ポータル (Phase 3)

#### 4.7.1 進捗情報取得（発注者向け）

```http
GET /api/v1/projects/{project_id}/progress-view
```

**認証**: 案件別アクセストークン（Viewer権限）

**レスポンス例**:

```json
{
  "project": {
    "name": "A市道路改修工事",
    "progress_rate": 65.0,
    "start_date": "2026-04-01",
    "end_date": "2026-10-31",
    "last_updated": "2026-02-15T14:30:00Z"
  },
  "schedules": [
    {
      "name": "土工",
      "progress_rate": 100.0,
      "end_date": "2026-05-31"
    }
  ],
  "recent_photos": [
    {
      "id": "photo-uuid-001",
      "thumbnail_url": "https://cdn.cdcp.company.jp/...",
      "taken_at": "2026-02-15T14:50:00Z"
    }
  ]
}
```

---

## 5. リクエスト/レスポンス仕様

### 5.1 共通レスポンス形式

#### 成功レスポンス

```json
{
  "success": true,
  "data": { /* 実データ */ },
  "meta": {
    "request_id": "req-uuid-12345",
    "timestamp": "2026-02-15T14:30:00Z",
    "version": "1.0.0"
  }
}
```

#### ページング付きレスポンス

```json
{
  "success": true,
  "data": [ /* 配列データ */ ],
  "pagination": {
    "total": 1250,
    "page": 1,
    "limit": 50,
    "pages": 25,
    "has_next": true,
    "has_prev": false
  },
  "meta": { /* */ }
}
```

### 5.2 バリデーションエラー

```http
HTTP/1.1 400 Bad Request
```

```json
{
  "success": false,
  "error": "Validation Error",
  "details": [
    {
      "field": "contract_amount",
      "message": "must be a positive number",
      "value": -100000
    },
    {
      "field": "end_date",
      "message": "must be after start_date",
      "value": "2026-03-31"
    }
  ],
  "meta": {
    "request_id": "req-uuid-12345"
  }
}
```

---

## 6. エラーハンドリング

### 6.1 エラーコード一覧

| コード | HTTPステータス | 説明 | 対策 |
|--------|-----------------|------|------|
| **INVALID_REQUEST** | 400 | リクエスト形式不正 | リクエスト確認 |
| **VALIDATION_ERROR** | 400 | バリデーション失敗 | 入力値確認 |
| **INVALID_TOKEN** | 401 | トークン無効・期限切れ | 再ログイン |
| **PERMISSION_DENIED** | 403 | 権限不足 | 権限確認 |
| **NOT_FOUND** | 404 | リソース未検出 | IDを確認 |
| **CONFLICT** | 409 | 重複・競合 | 既存データ確認 |
| **RATE_LIMIT_EXCEEDED** | 429 | レート制限超過 | 後で再試行 |
| **INTERNAL_ERROR** | 500 | サーバーエラー | サポート連絡 |

### 6.2 エラーレスポンス形式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields failed validation",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_EMAIL"
      }
    ]
  },
  "meta": {
    "request_id": "req-uuid-12345",
    "timestamp": "2026-02-15T14:30:00Z"
  }
}
```

### 6.3 リトライ戦略

```javascript
// 指数バックオフによるリトライ
async function retryRequest(fn, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;

      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

---

## 7. レート制限

### 7.1 制限ルール

| ユーザータイプ | リクエスト数/分 | リクエスト数/時間 | リクエスト数/日 |
|----------------|-----------------|------------------|--------------------|
| **認証ユーザー** | 60 | 1,000 | 10,000 |
| **API キー** | 100 | 5,000 | 50,000 |
| **ベータユーザー** | 120 | 10,000 | 100,000 |

### 7.2 レート制限レスポンスヘッダ

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1645008600
X-RateLimit-RetryAfter: 60
```

### 7.3 レート制限超過時

```http
HTTP/1.1 429 Too Many Requests
```

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 60 seconds.",
    "retry_after": 60
  }
}
```

---

## 8. バージョニング戦略

### 8.1 バージョン管理

- **URLバージョニング**: `/api/v1/`, `/api/v2/`
- **サポート期間**: 主バージョンは12ヶ月間サポート
- **廃止予告**: 廃止の6ヶ月前に予告

### 8.2 バージョン遷移例

```
v1: 2026-02 〜 2027-02 (Phase 1-2)
    - 写真管理、工程管理、原価管理

v2: 2027-03 〜 2028-03 (Phase 3以降)
    - 発注者ポータル
    - GraphQL対応
    - 新エンドポイント

v1廃止: 2027-09
```

### 8.3 後方互換性

- **互換性あり**の変更
  - 新しいフィールド追加（末尾）
  - 新しいエンドポイント追加

- **互換性なし**の変更（新バージョン必須）
  - フィールド削除
  - フィールド型変更
  - エンドポイント削除
  - レスポンス形式変更

---

## 9. WebHook仕様

### 9.1 WebHookイベント一覧

| イベント | タイミング | ペイロード |
|----------|-----------|-----------|
| **photo.created** | 写真アップロード時 | photo_id, project_id, taken_at |
| **photo.approved** | 写真承認時 | photo_id, approved_by |
| **issue.created** | 指摘登録時 | issue_id, project_id, severity |
| **issue.resolved** | 指摘完了時 | issue_id, resolved_at |
| **project.updated** | 案件更新時 | project_id, updated_fields |

### 9.2 WebHook登録

```http
POST /api/v1/webhooks
```

**リクエスト例**:

```json
{
  "url": "https://your-server.com/webhooks/photo-created",
  "events": ["photo.created", "photo.approved"],
  "active": true
}
```

**レスポンス**: 201 Created

```json
{
  "id": "webhook-uuid-001",
  "url": "https://your-server.com/webhooks/photo-created",
  "events": ["photo.created", "photo.approved"],
  "secret": "whsec_xxxxx",
  "created_at": "2026-02-15T14:30:00Z"
}
```

### 9.3 WebHookペイロード例

```json
{
  "id": "evt-uuid-001",
  "type": "photo.created",
  "created_at": "2026-02-15T14:50:00Z",
  "data": {
    "photo_id": "photo-uuid-001",
    "project_id": "proj-uuid-001",
    "file_name": "IMG_20260215_145000.jpg",
    "taken_at": "2026-02-15T14:50:00Z",
    "uploaded_by": "user-uuid-789"
  }
}
```

### 9.4 WebHook署名検証

```javascript
// Node.js例
import crypto from 'crypto';

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expected = hmac.digest('hex');
  return crypto.timingSafeEqual(signature, expected);
}
```

---

## 10. パフォーマンス設計

### 10.1 キャッシング戦略

#### クライアント側キャッシュ

```
Cache-Control: public, max-age=300  // 5分間キャッシュ
```

| リソース | キャッシュ時間 | 用途 |
|---------|-----------------|------|
| ユーザー情報 | 1時間 | GET /me |
| マスタデータ | 1日 | 工種、費目等 |
| 写真サムネイル | 無期限 | CDN |
| API レスポンス | 5分 | 一般クエリ |

### 10.2 ページネーション設計

```
最大リクエスト数: 100件/ページ
デフォルト: 20件/ページ
オフセット方式 + カーソル方式
```

### 10.3 APIレスポンス時間目標

| エンドポイント | p95 | p99 |
|-----------------|------|------|
| GET /projects | 500ms | 1s |
| GET /photos | 1s | 2s |
| POST /photos | 3s | 5s（アップロード含む） |
| GET /schedules | 1s | 2s |
| GET /costs/summary | 500ms | 1s |

---

## 11. API ドキュメント

### 11.1 Swagger/OpenAPI

```
https://api.cdcp.company.jp/swagger
```

### 11.2 自動生成

```bash
# NestJS + Swagger
npm install @nestjs/swagger swagger-ui-express
```

```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('CDCP API')
  .setDescription('Construction Digital Control Platform API')
  .setVersion('1.0.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
```

---

## 12. 変更履歴

| 日付 | 版数 | 変更内容 | 変更者 |
|------|------|---------|--------|
| 2026-02-15 | 1.0 | 初版作成（Phase 1-3対応） | アーキテクト |

---

**承認**:
- API責任者: _______________
- PM: _______________
- セキュリティ責任者: _______________

---

**END OF DOCUMENT**
