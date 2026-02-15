# データベース設計書 (Database Design)

## 1. 文書概要

### 1.1 目的
CDCP（Construction Digital Control Platform）のデータベース設計を定義し、テーブル構造、リレーション、インデックス戦略を明確化する。

### 1.2 データベース仕様
- **DBMS**: PostgreSQL 15
- **文字コード**: UTF-8
- **タイムゾーン**: Asia/Tokyo (JST)
- **拡張機能**:
  - **PostGIS**: GPS座標管理
  - **pg_trgm**: 全文検索
  - **pgcrypto**: 暗号化関数
  - **uuid-ossp**: UUID生成

---

## 2. ER図（概念モデル）

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│  組織        │       │  ユーザー     │       │  権限ロール  │
│ organizations│1─────N│  users        │N─────N│  roles       │
└─────────────┘       └──────────────┘       └─────────────┘
                             │1
                             │
                             │N
                      ┌──────▼──────┐
                      │  案件        │
                      │  projects    │
                      └──────┬──────┘
                             │1
          ┌──────────────────┼──────────────────┐
          │N                 │N                 │N
    ┌─────▼─────┐    ┌───────▼──────┐   ┌──────▼───────┐
    │  写真      │    │  工程        │   │  原価        │
    │  photos    │    │  schedules   │   │  costs       │
    └───────────┘    └──────────────┘   └──────────────┘
```

---

## 3. テーブル定義

### 3.1 組織・ユーザー管理

#### 3.1.1 organizations（組織マスタ）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | 組織ID（PK） |
| name | VARCHAR(200) | NOT NULL | - | 組織名 |
| code | VARCHAR(20) | NOT NULL | - | 組織コード（UK） |
| type | VARCHAR(20) | NOT NULL | - | 組織種別（本社/支店/営業所） |
| parent_id | UUID | NULL | - | 親組織ID（FK） |
| address | TEXT | NULL | - | 住所 |
| tel | VARCHAR(20) | NULL | - | 電話番号 |
| is_active | BOOLEAN | NOT NULL | TRUE | 有効フラグ |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**:
```sql
PRIMARY KEY (id)
UNIQUE (code)
FOREIGN KEY (parent_id) REFERENCES organizations(id)
CHECK (type IN ('本社', '支店', '営業所'))
```

**インデックス**:
```sql
CREATE INDEX idx_organizations_parent_id ON organizations(parent_id);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);
```

#### 3.1.2 users（ユーザーマスタ）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | ユーザーID（PK） |
| auth0_user_id | VARCHAR(100) | NOT NULL | - | Auth0 ユーザーID（UK） |
| email | VARCHAR(255) | NOT NULL | - | メールアドレス（UK） |
| name | VARCHAR(100) | NOT NULL | - | 氏名 |
| organization_id | UUID | NOT NULL | - | 所属組織ID（FK） |
| employee_code | VARCHAR(20) | NULL | - | 社員番号 |
| is_active | BOOLEAN | NOT NULL | TRUE | 有効フラグ |
| last_login_at | TIMESTAMP | NULL | - | 最終ログイン日時 |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**:
```sql
PRIMARY KEY (id)
UNIQUE (auth0_user_id)
UNIQUE (email)
FOREIGN KEY (organization_id) REFERENCES organizations(id)
```

**インデックス**:
```sql
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
```

#### 3.1.3 roles（権限ロールマスタ）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | ロールID（PK） |
| name | VARCHAR(50) | NOT NULL | - | ロール名（UK） |
| display_name | VARCHAR(100) | NOT NULL | - | 表示名 |
| description | TEXT | NULL | - | 説明 |
| permissions | JSONB | NOT NULL | '[]' | 権限リスト |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**:
```sql
PRIMARY KEY (id)
UNIQUE (name)
CHECK (name IN ('system_admin', 'branch_admin', 'supervisor', 'worker', 'viewer'))
```

#### 3.1.4 user_roles（ユーザー-ロール関連）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| user_id | UUID | NOT NULL | - | ユーザーID（PK, FK） |
| role_id | UUID | NOT NULL | - | ロールID（PK, FK） |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |

**制約**:
```sql
PRIMARY KEY (user_id, role_id)
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
```

---

### 3.2 案件管理

#### 3.2.1 projects（案件マスタ）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | 案件ID（PK） |
| code | VARCHAR(50) | NOT NULL | - | 案件コード（UK） |
| name | VARCHAR(200) | NOT NULL | - | 案件名 |
| client_name | VARCHAR(200) | NOT NULL | - | 発注者名 |
| client_type | VARCHAR(20) | NOT NULL | - | 発注者区分（公共/民間） |
| construction_type | VARCHAR(50) | NOT NULL | - | 工事種別 |
| location | VARCHAR(500) | NULL | - | 工事場所 |
| location_point | GEOGRAPHY(POINT, 4326) | NULL | - | 位置座標（PostGIS） |
| contract_amount | DECIMAL(15, 2) | NULL | - | 契約金額 |
| start_date | DATE | NOT NULL | - | 着工日 |
| end_date | DATE | NOT NULL | - | 完成予定日 |
| actual_end_date | DATE | NULL | - | 実際の完成日 |
| status | VARCHAR(20) | NOT NULL | '準備中' | ステータス |
| organization_id | UUID | NOT NULL | - | 担当組織ID（FK） |
| supervisor_id | UUID | NOT NULL | - | 現場監督ID（FK） |
| created_by | UUID | NOT NULL | - | 作成者ID（FK） |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**:
```sql
PRIMARY KEY (id)
UNIQUE (code)
FOREIGN KEY (organization_id) REFERENCES organizations(id)
FOREIGN KEY (supervisor_id) REFERENCES users(id)
FOREIGN KEY (created_by) REFERENCES users(id)
CHECK (client_type IN ('公共', '民間'))
CHECK (status IN ('準備中', '施工中', '完成', '中止'))
CHECK (end_date >= start_date)
```

**インデックス**:
```sql
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_projects_supervisor_id ON projects(supervisor_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_location_point ON projects USING GIST(location_point);
```

#### 3.2.2 project_members（案件メンバー）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| project_id | UUID | NOT NULL | - | 案件ID（PK, FK） |
| user_id | UUID | NOT NULL | - | ユーザーID（PK, FK） |
| role | VARCHAR(50) | NOT NULL | - | 役割（監督/作業員/協力会社） |
| assigned_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | アサイン日時 |

**制約**:
```sql
PRIMARY KEY (project_id, user_id)
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
CHECK (role IN ('監督', '作業員', '協力会社', '閲覧'))
```

---

### 3.3 写真管理（Phase1）

#### 3.3.1 photos（写真）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | 写真ID（PK） |
| project_id | UUID | NOT NULL | - | 案件ID（FK） |
| folder_id | UUID | NULL | - | フォルダID（FK） |
| file_name | VARCHAR(500) | NOT NULL | - | ファイル名 |
| s3_key | VARCHAR(1000) | NOT NULL | - | S3オブジェクトキー（UK） |
| thumbnail_s3_key | VARCHAR(1000) | NULL | - | サムネイルS3キー |
| file_size | BIGINT | NOT NULL | - | ファイルサイズ（Byte） |
| mime_type | VARCHAR(100) | NOT NULL | - | MIMEタイプ |
| width | INTEGER | NULL | - | 画像幅（px） |
| height | INTEGER | NULL | - | 画像高さ（px） |
| taken_at | TIMESTAMP | NOT NULL | - | 撮影日時 |
| location_point | GEOGRAPHY(POINT, 4326) | NULL | - | 撮影位置（PostGIS） |
| location_address | VARCHAR(500) | NULL | - | 撮影位置住所（逆ジオコーディング） |
| device_info | JSONB | NULL | - | 撮影デバイス情報 |
| exif_data | JSONB | NULL | - | EXIFデータ |
| uploaded_by | UUID | NOT NULL | - | アップロード者ID（FK） |
| uploaded_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | アップロード日時 |
| is_deleted | BOOLEAN | NOT NULL | FALSE | 削除フラグ（論理削除） |
| deleted_at | TIMESTAMP | NULL | - | 削除日時 |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**:
```sql
PRIMARY KEY (id)
UNIQUE (s3_key)
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
FOREIGN KEY (folder_id) REFERENCES photo_folders(id) ON DELETE SET NULL
FOREIGN KEY (uploaded_by) REFERENCES users(id)
```

**インデックス**:
```sql
CREATE INDEX idx_photos_project_id ON photos(project_id);
CREATE INDEX idx_photos_folder_id ON photos(folder_id);
CREATE INDEX idx_photos_taken_at ON photos(taken_at);
CREATE INDEX idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX idx_photos_is_deleted ON photos(is_deleted);
CREATE INDEX idx_photos_location_point ON photos USING GIST(location_point);
CREATE INDEX idx_photos_file_name_gin ON photos USING gin(to_tsvector('japanese', file_name));
```

#### 3.3.2 photo_folders（写真フォルダ）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | フォルダID（PK） |
| project_id | UUID | NOT NULL | - | 案件ID（FK） |
| parent_id | UUID | NULL | - | 親フォルダID（FK） |
| name | VARCHAR(200) | NOT NULL | - | フォルダ名 |
| description | TEXT | NULL | - | 説明 |
| sort_order | INTEGER | NOT NULL | 0 | 表示順 |
| created_by | UUID | NOT NULL | - | 作成者ID（FK） |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**:
```sql
PRIMARY KEY (id)
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
FOREIGN KEY (parent_id) REFERENCES photo_folders(id) ON DELETE CASCADE
FOREIGN KEY (created_by) REFERENCES users(id)
UNIQUE (project_id, parent_id, name) -- 同一階層で同名フォルダ禁止
```

**インデックス**:
```sql
CREATE INDEX idx_photo_folders_project_id ON photo_folders(project_id);
CREATE INDEX idx_photo_folders_parent_id ON photo_folders(parent_id);
```

#### 3.3.3 photo_tags（写真タグ）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | タグID（PK） |
| project_id | UUID | NOT NULL | - | 案件ID（FK） |
| name | VARCHAR(100) | NOT NULL | - | タグ名 |
| color | VARCHAR(7) | NULL | '#3f51b5' | カラーコード |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |

**制約**:
```sql
PRIMARY KEY (id)
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
UNIQUE (project_id, name)
```

#### 3.3.4 photo_tag_relations（写真-タグ関連）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| photo_id | UUID | NOT NULL | - | 写真ID（PK, FK） |
| tag_id | UUID | NOT NULL | - | タグID（PK, FK） |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |

**制約**:
```sql
PRIMARY KEY (photo_id, tag_id)
FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
FOREIGN KEY (tag_id) REFERENCES photo_tags(id) ON DELETE CASCADE
```

#### 3.3.5 photo_comments（写真コメント）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | コメントID（PK） |
| photo_id | UUID | NOT NULL | - | 写真ID（FK） |
| user_id | UUID | NOT NULL | - | コメント者ID（FK） |
| comment | TEXT | NOT NULL | - | コメント内容 |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**:
```sql
PRIMARY KEY (id)
FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
FOREIGN KEY (user_id) REFERENCES users(id)
```

**インデックス**:
```sql
CREATE INDEX idx_photo_comments_photo_id ON photo_comments(photo_id);
CREATE INDEX idx_photo_comments_user_id ON photo_comments(user_id);
```

---

### 3.4 工程管理（Phase2）

#### 3.4.1 schedules（工程）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | 工程ID（PK） |
| project_id | UUID | NOT NULL | - | 案件ID（FK） |
| parent_id | UUID | NULL | - | 親工程ID（FK） |
| name | VARCHAR(200) | NOT NULL | - | 工程名 |
| code | VARCHAR(50) | NULL | - | 工程コード |
| level | INTEGER | NOT NULL | 1 | 階層レベル（1:大工程、2:中工程、3:小工程） |
| start_date | DATE | NOT NULL | - | 開始予定日 |
| end_date | DATE | NOT NULL | - | 完了予定日 |
| actual_start_date | DATE | NULL | - | 実際の開始日 |
| actual_end_date | DATE | NULL | - | 実際の完了日 |
| progress_rate | DECIMAL(5, 2) | NOT NULL | 0.00 | 進捗率（0.00-100.00） |
| is_critical_path | BOOLEAN | NOT NULL | FALSE | クリティカルパスフラグ |
| sort_order | INTEGER | NOT NULL | 0 | 表示順 |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**:
```sql
PRIMARY KEY (id)
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
FOREIGN KEY (parent_id) REFERENCES schedules(id) ON DELETE CASCADE
CHECK (end_date >= start_date)
CHECK (progress_rate >= 0 AND progress_rate <= 100)
CHECK (level IN (1, 2, 3))
```

**インデックス**:
```sql
CREATE INDEX idx_schedules_project_id ON schedules(project_id);
CREATE INDEX idx_schedules_parent_id ON schedules(parent_id);
CREATE INDEX idx_schedules_start_date ON schedules(start_date);
```

#### 3.4.2 schedule_progresses（工程進捗記録）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | 進捗記録ID（PK） |
| schedule_id | UUID | NOT NULL | - | 工程ID（FK） |
| recorded_date | DATE | NOT NULL | - | 記録日 |
| progress_rate | DECIMAL(5, 2) | NOT NULL | - | 進捗率 |
| weather | VARCHAR(50) | NULL | - | 天候（公共工事記録用） |
| worker_count | INTEGER | NULL | - | 作業人数 |
| memo | TEXT | NULL | - | メモ |
| recorded_by | UUID | NOT NULL | - | 記録者ID（FK） |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |

**制約**:
```sql
PRIMARY KEY (id)
FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
FOREIGN KEY (recorded_by) REFERENCES users(id)
UNIQUE (schedule_id, recorded_date)
CHECK (progress_rate >= 0 AND progress_rate <= 100)
```

**インデックス**:
```sql
CREATE INDEX idx_schedule_progresses_schedule_id ON schedule_progresses(schedule_id);
CREATE INDEX idx_schedule_progresses_recorded_date ON schedule_progresses(recorded_date);
```

---

### 3.5 原価管理（Phase2）

#### 3.5.1 cost_budgets（予算）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | 予算ID（PK） |
| project_id | UUID | NOT NULL | - | 案件ID（FK） |
| category | VARCHAR(50) | NOT NULL | - | 費目（材料費/労務費/外注費/経費） |
| sub_category | VARCHAR(100) | NULL | - | 細目 |
| budget_amount | DECIMAL(15, 2) | NOT NULL | - | 予算額 |
| description | TEXT | NULL | - | 説明 |
| created_by | UUID | NOT NULL | - | 作成者ID（FK） |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**:
```sql
PRIMARY KEY (id)
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
FOREIGN KEY (created_by) REFERENCES users(id)
CHECK (category IN ('材料費', '労務費', '外注費', '経費'))
CHECK (budget_amount >= 0)
```

**インデックス**:
```sql
CREATE INDEX idx_cost_budgets_project_id ON cost_budgets(project_id);
CREATE INDEX idx_cost_budgets_category ON cost_budgets(category);
```

#### 3.5.2 cost_actuals（実績）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | 実績ID（PK） |
| project_id | UUID | NOT NULL | - | 案件ID（FK） |
| budget_id | UUID | NULL | - | 予算ID（FK） |
| category | VARCHAR(50) | NOT NULL | - | 費目 |
| sub_category | VARCHAR(100) | NULL | - | 細目 |
| actual_amount | DECIMAL(15, 2) | NOT NULL | - | 実績額 |
| actual_date | DATE | NOT NULL | - | 発生日 |
| vendor_name | VARCHAR(200) | NULL | - | 取引先名 |
| invoice_number | VARCHAR(100) | NULL | - | 請求書番号 |
| description | TEXT | NULL | - | 説明 |
| attachment_s3_key | VARCHAR(1000) | NULL | - | 証憑S3キー |
| recorded_by | UUID | NOT NULL | - | 記録者ID（FK） |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**制約**:
```sql
PRIMARY KEY (id)
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
FOREIGN KEY (budget_id) REFERENCES cost_budgets(id) ON DELETE SET NULL
FOREIGN KEY (recorded_by) REFERENCES users(id)
CHECK (category IN ('材料費', '労務費', '外注費', '経費'))
CHECK (actual_amount >= 0)
```

**インデックス**:
```sql
CREATE INDEX idx_cost_actuals_project_id ON cost_actuals(project_id);
CREATE INDEX idx_cost_actuals_budget_id ON cost_actuals(budget_id);
CREATE INDEX idx_cost_actuals_actual_date ON cost_actuals(actual_date);
CREATE INDEX idx_cost_actuals_category ON cost_actuals(category);
```

---

### 3.6 監査ログ

#### 3.6.1 audit_logs（監査ログ）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|-----------|------|
| id | UUID | NOT NULL | uuid_generate_v4() | ログID（PK） |
| user_id | UUID | NULL | - | ユーザーID（FK） |
| action | VARCHAR(100) | NOT NULL | - | アクション（CREATE/UPDATE/DELETE/LOGIN等） |
| entity_type | VARCHAR(100) | NOT NULL | - | エンティティ種別 |
| entity_id | UUID | NULL | - | エンティティID |
| changes | JSONB | NULL | - | 変更内容 |
| ip_address | INET | NULL | - | IPアドレス |
| user_agent | TEXT | NULL | - | UserAgent |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |

**制約**:
```sql
PRIMARY KEY (id)
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
```

**インデックス**:
```sql
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

**パーティショニング（Phase2以降）**:
```sql
-- 月別パーティション
CREATE TABLE audit_logs_y2026m02 PARTITION OF audit_logs
FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

---

## 4. データ整合性制約

### 4.1 外部キー制約

すべての外部キーには以下のルールを適用:
- `ON DELETE CASCADE`: 親削除時に子も削除（project削除時にphoto削除等）
- `ON DELETE SET NULL`: 親削除時にNULLに設定（user削除時のcreated_byをNULL等）
- `ON DELETE RESTRICT`: 親削除を禁止（使用中のrole削除禁止等）

### 4.2 CHECK制約

- 日付範囲: `end_date >= start_date`
- 進捗率: `0 <= progress_rate <= 100`
- 金額: `amount >= 0`
- ステータス: `ENUM値のチェック`

### 4.3 UNIQUE制約

- 組織コード: `organizations(code)`
- メールアドレス: `users(email)`
- 案件コード: `projects(code)`
- S3キー: `photos(s3_key)`

---

## 5. インデックス戦略

### 5.1 主キーインデックス

すべてのテーブルで `id` をUUID型の主キーとし、自動的にB-Treeインデックスが作成される。

### 5.2 外部キーインデックス

すべての外部キーカラムにインデックスを作成し、JOIN性能を向上。

### 5.3 検索用インデックス

| テーブル | カラム | インデックス種別 | 用途 |
|---------|--------|----------------|------|
| photos | file_name | GIN (全文検索) | ファイル名検索 |
| photos | location_point | GiST (地理空間) | 位置検索 |
| projects | location_point | GiST (地理空間) | 案件位置検索 |
| photos | taken_at | B-Tree | 日付範囲検索 |
| schedules | start_date | B-Tree | 工程検索 |

### 5.4 複合インデックス

```sql
-- 案件 + 撮影日での写真検索
CREATE INDEX idx_photos_project_taken ON photos(project_id, taken_at DESC);

-- 案件 + ステータスでの検索
CREATE INDEX idx_projects_org_status ON projects(organization_id, status);
```

---

## 6. パーティショニング戦略（Phase2以降）

### 6.1 対象テーブル

| テーブル | パーティション方式 | キー | 理由 |
|---------|------------------|-----|------|
| photos | 月別 | taken_at | データ量増加対策 |
| audit_logs | 月別 | created_at | ログ保持期間管理 |
| schedule_progresses | 年別 | recorded_date | 年度別集計 |
| cost_actuals | 年別 | actual_date | 年度別集計 |

### 6.2 パーティション例

```sql
-- photosテーブルを月別パーティション化
CREATE TABLE photos (
  ... (カラム定義)
) PARTITION BY RANGE (taken_at);

-- 2026年2月パーティション
CREATE TABLE photos_y2026m02 PARTITION OF photos
FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- 2026年3月パーティション
CREATE TABLE photos_y2026m03 PARTITION OF photos
FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

---

## 7. データ保持期間

| データ種別 | 保持期間 | 削除方法 |
|-----------|---------|---------|
| **写真** | 無期限 | 論理削除 |
| **監査ログ** | 3年 | パーティション削除 |
| **進捗記録** | 無期限 | - |
| **原価実績** | 無期限 | - |
| **アクセスログ** | 1年 | 自動削除 |

---

## 8. バックアップ戦略

### 8.1 RDS自動バックアップ

- **頻度**: 日次（深夜2時）
- **保持期間**: 7日間
- **スナップショット**: 週次（日曜深夜）、保持期間30日

### 8.2 リストア手順

1. RDSコンソールから最新スナップショット選択
2. 新しいRDSインスタンスとして復元
3. アプリケーション接続先変更
4. 整合性確認後、旧インスタンス削除

**想定リストア時間**: 30分

---

## 9. データ移行計画

### 9.1 Phase1（新規データのみ）

- ユーザーマスタ: CSV一括登録
- 組織マスタ: 手動登録
- 過去データ: なし

### 9.2 Phase2以降

- Phase1データ: そのまま継続利用
- 新規マスタ: 追加登録

---

## 10. 変更履歴

| 日付 | 版数 | 変更内容 | 変更者 |
|------|------|---------|--------|
| 2026-02-15 | 1.0 | 初版作成 | DB設計担当 |

---

**承認**:
- アーキテクト: _______________
- PM: _______________
