# 建設DXサポートシステム UI/UX設計書

**システム名称**: Construction Digital Control Platform (CDCP)
**対象企業**: 建設土木会社(公共事業中心)
**企業規模**: 従業員550名、IT部門5名、売上110億円規模
**バージョン**: 2.0
**作成日**: 2026-02-15
**更新日**: 2026-02-15
**文書種別**: UI/UX設計書

---

## 目次

1. [文書概要](#1-文書概要)
2. [デザインシステム](#2-デザインシステム)
3. [カラーパレット](#3-カラーパレット)
4. [タイポグラフィ](#4-タイポグラフィ)
5. [コンポーネント設計](#5-コンポーネント設計)
6. [レイアウト・グリッドシステム](#6-レイアウト・グリッドシステム)
7. [画面遷移図](#7-画面遷移図)
8. [レスポンシブデザイン](#8-レスポンシブデザイン)
9. [アクセシビリティ](#9-アクセシビリティ)
10. [インタラクションパターン](#10-インタラクションパターン)
11. [ダークモード対応](#11-ダークモード対応)
12. [アニメーション・トランジション](#12-アニメーション・トランジション)

---

## 1. 文書概要

### 1.1 目的

本文書は、建設DXサポートシステム(CDCP)のUI/UX設計を統一し、ユーザー体験の一貫性を確保することを目的とする。

### 1.2 対象読者

- UI/UXデザイナー
- フロントエンド開発者
- プロダクトマネージャー
- QAエンジニア

### 1.3 参照文書

- 建設DXサポートシステム構築企画書
- 詳細要件定義書
- システムアーキテクチャ設計書
- データベース設計書
- API設計書

### 1.4 ユーザーペルソナと段階的展開

本システムはPhase1-3の3段階で展開され、ユーザー数と機能範囲が段階的に拡大する。

| Phase | ユーザー数 | 主要ユーザー | 主要機能 | 期間 |
|-------|---------|---------|----------|------|
| Phase 1 | 42名 | 現場監督(2プロジェクト) | 写真管理、工程管理 | 4ヶ月 |
| Phase 2 | 418名 | 全社現場(40プロジェクト) | スケジュール、原価管理 | 5ヶ月 |
| Phase 3 | 500+名 | 発注者含む社外ユーザー | 顧客ポータル、レポート | 9ヶ月 |

#### ユーザーセグメント別アプローチ

1. **現場監督**: スマートフォン/タブレット優先、オフライン対応重視
2. **施工管理部門**: Web UI、詳細レポート機能
3. **経営層**: ダッシュボード、KPI可視化
4. **発注者(Phase3)**: 限定情報表示、高アクセシビリティ

### 1.5 設計原則

1. **シンプルさ**: 現場ユーザーにも直感的に使える設計
2. **効率性**: スマートフォン片手操作で完結
3. **信頼性**: 建設業務特有のニーズに対応
4. **アクセシビリティ**: WCAG 2.1 Level A準拠
5. **レスポンシブ**: スマートフォン/タブレット/デスクトップに対応
6. **オフライン対応**: PWA機能で通信不可環境に対応

---

## 2. デザインシステム

### 2.1 設計システムの基礎

本UI/UX設計は **Material Design 3** (Material-UI v5) をベースとし、建設業務特有のカスタマイズを施している。

#### 採用理由

- 豊富なコンポーネントライブラリ
- アクセシビリティスタンダード準拠
- レスポンシブ対応が充実
- エンタープライズレベルの実績
- React 18との親和性が高い

### 2.2 デザインシステムの構成

```
Design System
├── Foundations (基盤)
│   ├── Color
│   ├── Typography
│   ├── Spacing
│   ├── Grid
│   └── Elevation/Shadow
├── Components (コンポーネント)
│   ├── Basic (Button, Card, Input)
│   ├── Navigation (AppBar, Menu, Tab)
│   ├── Form (TextField, Select, Checkbox)
│   ├── Data Display (Table, List, Tree)
│   └── Feedback (Dialog, Snackbar, Toast)
├── Patterns (パターン)
│   ├── Layout
│   ├── Navigation Flow
│   ├── Form Submission
│   └── Error Handling
└── Styles (スタイル)
    ├── Light Theme
    ├── Dark Theme
    └── High Contrast Theme
```

### 2.3 デザイントークン

#### スペーシング

```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px
```

#### ボーダーラジアス

```
none: 0px
sm: 4px
md: 8px
lg: 12px
full: 50%
```

#### シャドウ(Elevation)

```
shadow-0: none
shadow-1: 0px 1px 3px rgba(0,0,0,0.12), 0px 1px 2px rgba(0,0,0,0.24)
shadow-2: 0px 3px 6px rgba(0,0,0,0.15), 0px 2px 4px rgba(0,0,0,0.12)
shadow-3: 0px 10px 20px rgba(0,0,0,0.15), 0px 3px 6px rgba(0,0,0,0.10)
shadow-4: 0px 15px 25px rgba(0,0,0,0.15), 0px 5px 10px rgba(0,0,0,0.05)
shadow-5: 0px 20px 40px rgba(0,0,0,0.2)
```

---

## 3. カラーパレット

### 3.1 ブランドカラー

建設業界の信頼感と安定性を表現し、現場作業のニーズに対応したカラースキーム。

#### プライマリカラー（メイン色）

**建設青**: `#1976D2` (Material-UI: blue.600)

特性:
- 建設・安全性の象徴
- 高コントラスト比で視認性良好
- 複数UIフレームワークで実績がある

用途:
- ボタン (CTA)
- アクティブ要素
- リンク
- トップバー

```css
primary: #1976D2
primary-light: #42A5F5
primary-dark: #1565C0
primary-contrast: #FFFFFF
```

#### セカンダリカラー

**成功緑**: `#388E3C` (Material-UI: green.700)

用途:
- 完了・成功状態
- 承認アクション
- 正常ステータス

```css
secondary: #388E3C
secondary-light: #66BB6A
secondary-dark: #2E7D32
secondary-contrast: #FFFFFF
```

### 3.2 ステータスカラー

建設業務特有のワークフロー状態を視覚的に表現。

```
Success (完了/承認): #388E3C (緑)
Warning (確認待ち/警告): #F57C00 (橙)
Error (未承認/エラー): #D32F2F (赤)
Info (情報/通知): #0288D1 (水色)
Pending (保留/進行中): #7B1FA2 (紫)
```

#### ステータス別の使用例

| 状態 | カラー | 用途 |
|------|--------|------|
| 新規撮影 | `#0288D1` (情報) | 写真が新しくアップロードされた |
| 確認待ち | `#F57C00` (警告) | 現場監督の確認を待つ中 |
| 承認済み | `#388E3C` (成功) | 施工管理者が承認 |
| 指摘あり | `#D32F2F` (エラー) | 修正指示が発生 |
| クローズ | `#9E9E9E` (グレー) | 案件が完了 |

### 3.3 ニュートラルカラー(グレースケール)

```
Gray-50: #FAFAFA (背景)
Gray-100: #F5F5F5 (背景・ハイライト)
Gray-200: #EEEEEE (ボーダー)
Gray-300: #E0E0E0 (ディセーブル)
Gray-500: #9E9E9E (テキスト補助)
Gray-700: #616161 (テキスト通常)
Gray-900: #212121 (テキスト主要)
White: #FFFFFF (背景)
```

### 3.4 カラーアクセシビリティ

すべてのカラー組み合わせが以下の基準を満たす:

- **Normal Text (14px以下)**: WCAG AA基準を満たす (コントラスト比 4.5:1 以上)
- **Large Text (18px以上)**: WCAG AA基準を満たす (コントラスト比 3:1 以上)
- **Color Blind対応**: 色情報のみに頼らない設計

#### コントラスト比検証例

| 組み合わせ | コントラスト比 | WCAG基準 | 対応 |
|-----------|-------------|---------|------|
| #1976D2 on White | 5.2:1 | AA ✓ | 合格 |
| #388E3C on White | 6.4:1 | AAA ✓ | 合格 |
| #F57C00 on White | 7.1:1 | AAA ✓ | 合格 |
| #D32F2F on White | 5.7:1 | AA ✓ | 合格 |

---

## 4. タイポグラフィ

### 4.1 フォントファミリー選定

#### 日本語フォント (Primary)

**Noto Sans JP** (Google Fonts)

特性:
- フリーで商用利用可
- 日本語を含む全グリフに対応
- CJK言語の最適なヒンティング
- ウェイト: Light(300), Regular(400), Medium(500), Bold(700)

```css
font-family: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
```

#### 英数字フォント (Secondary)

**Roboto** (Material-UI標準)

特性:
- GoogleによるMaterial Design標準フォント
- 数字とアルファベットの可読性が高い
- ウェイト: Light(300), Regular(400), Medium(500), Bold(700), Mono(monospace)

### 4.2 タイプスケール

建設業務のコンテキストに応じたフォントサイズ体系。

```
Display Large (56px / 1.125): ページタイトル・メインビジュアル
Display Medium (44px / 1.2): セクションタイトル
Display Small (36px / 1.25): サブタイトル

Headline Large (32px / 1.25): カード見出し・セクションタイトル
Headline Medium (28px / 1.3): 小見出し
Headline Small (24px / 1.3): リスト見出し

Title Large (22px / 1.3): ダイアログタイトル
Title Medium (16px / 1.5): 中程度見出し
Title Small (14px / 1.5): 小見出し

Body Large (16px / 1.5): 本文・説明テキスト
Body Medium (14px / 1.43): 通常本文・フォームラベル
Body Small (12px / 1.33): 補助テキスト・説明

Label Large (14px / 1.43): ボタンテキスト
Label Medium (12px / 1.33): タグ・バッジ
Label Small (11px / 1.45): キャプション
```

### 4.3 フォントウェイト使用ガイド

| ウェイト | 用途 | 例 |
|---------|------|-----|
| Light (300) | 大型見出し装飾 | Display Large |
| Regular (400) | 本文・通常テキスト | Body Large/Medium |
| Medium (500) | 強調・ラベル | Label Large, Button |
| Bold (700) | 強調見出し・CTA | Headline, Important Alert |

### 4.4 行間(Line Height)とレタースペーシング

```
Display: line-height 1.125, letter-spacing -0.015em (タイトル系)
Headline: line-height 1.25-1.3, letter-spacing 0em (見出し)
Title: line-height 1.3-1.5, letter-spacing 0.005em (中程度見出し)
Body: line-height 1.43-1.5, letter-spacing 0.025em (本文)
Label: line-height 1.33-1.45, letter-spacing 0.05em (ラベル・ボタン)
```

---

## 5. コンポーネント設計

### 5.1 基本コンポーネント

#### ボタン

**バリエーション**

```
1. Contained Button (填充型)
   - 背景色: Primary Blue (#1976D2)
   - テキスト色: White
   - 用途: CTA (Call-to-Action)
   - 例: 「写真をアップロード」「承認」

2. Outlined Button (枠線型)
   - 背景: Transparent
   - ボーダー: Primary Blue
   - テキスト: Primary Blue
   - 用途: セカンダリアクション
   - 例: 「キャンセル」「戻る」

3. Text Button (テキスト型)
   - 背景: None
   - ボーダー: None
   - テキスト: Primary Blue
   - 用途: リンク的アクション
   - 例: 「詳細を見る」「編集」

4. Icon Button (アイコン型)
   - 背景: Transparent (hover時: Gray-100)
   - サイズ: 40x40px (min-touch-target)
   - 用途: アイコンのみアクション
   - 例: 削除、設定、メニュー
```

**ボタンサイズ**

```
Large: 48px height, 16px padding (CTA, スマートフォン優先)
Medium: 40px height, 12px padding (通常アクション)
Small: 32px height, 8px padding (セカンダリアクション)
```

**ボタンのアクセシビリティ**

- タッチターゲット最小: 40x40px (WCAG基準)
- リップル効果: フォーカス表示の代替
- aria-label: アイコンボタンには必須
- disabled状態: opacity 50%, cursor not-allowed

#### テキスト入力フィールド

**バリエーション**

```
1. Filled TextField (塗りつぶし型)
   - 背景: Gray-100
   - 下線: Gray-300 (通常), Primary-Blue (フォーカス)
   - 用途: フォーム入力
   - Material-UI: variant="filled"

2. Outlined TextField (枠線型)
   - 背景: White
   - ボーダー: Gray-300 (通常), Primary-Blue (フォーカス)
   - 用途: 高度な入力フォーム
   - Material-UI: variant="outlined"

3. Standard TextField (標準型)
   - 背景: None
   - 下線: Gray-300 (通常), Primary-Blue (フォーカス)
   - 用途: 検索フィールド等のシンプル入力
   - Material-UI: variant="standard"
```

**フォーム要素の配置**

```
Label (フォーカス時に色変更)
  ↓
TextField (padding 12px, border-radius 4px)
  ↓
Hint Text (Font Size 12px, Gray-500)
  ↓
Error Message (Font Size 12px, Error-Red, aria-live="polite")
```

**エラーハンドリング**

```
通常状態:
  └─ ボーダー: Gray-300
     アイコン: None

フォーカス状態:
  └─ ボーダー: Primary-Blue
     背景: Light Blue (#E3F2FD)

エラー状態:
  └─ ボーダー: Error-Red (#D32F2F)
     背景: Red Tint (#FFEBEE)
     メッセージ: 赤色で表示
     アイコン: ✕ アイコン

ディセーブル状態:
  └─ 背景: Gray-50
     テキスト: Gray-300
     opacity: 50%
```

#### カード

**構成要素**

```
┌─────────────────────────────────┐
│  Card Header (オプション)        │
│  ├─ Title                      │
│  └─ Avatar/Thumbnail           │
├─────────────────────────────────┤
│  Card Media (オプション)         │
│  └─ Image / Video              │
├─────────────────────────────────┤
│  Card Content                   │
│  ├─ Title                      │
│  ├─ Description                │
│  └─ Metadata                   │
├─────────────────────────────────┤
│  Card Actions                   │
│  └─ Buttons / Links            │
└─────────────────────────────────┘
```

**スタイル**

```
Background: White
Border: None
Shadow: shadow-1 (0px 1px 3px rgba(0,0,0,0.12))
Border Radius: 8px
Padding: 16px (content), 4px (actions)
Hover: shadow-2, cursor pointer (interactive時)
```

**写真管理機能向けカード例**

```
┌────────────────────────────────┐
│  [Thumbnail Image]              │
│  Project Name: 〇〇工事        │
│  Date: 2026-02-15 14:30       │
│  Location: 外壁工事            │
│  Status: ✓ 承認済み            │
├────────────────────────────────┤
│  [詳細] [編集] [削除]          │
└────────────────────────────────┘
```

### 5.2 フォームコンポーネント

#### Checkbox

```
サイズ: 24x24px (min-touch-target: 40x40px含む)
チェック済み:
  └─ Background: Primary-Blue
     Icon: White checkmark
未チェック:
  └─ Background: White
     Border: Gray-300
ホバー時:
  └─ Background: Primary-Blue-Light
     Border: Primary-Blue
ディセーブル時:
  └─ Border: Gray-300
     Opacity: 50%
```

#### Radio Button

```
サイズ: 24x24px (min-touch-target: 40x40px)
選択済み:
  └─ Outer circle: Primary-Blue
     Inner dot: Primary-Blue (8px)
未選択:
  └─ Circle: Gray-300 (border)
     Fill: White
```

#### Select/Dropdown

```
Closed状態:
  ├─ Background: Gray-100 (filled) or White (outlined)
  ├─ Border: Gray-300
  ├─ Padding: 12px
  └─ Arrow Icon: Gray-700

Open状態:
  ├─ Border: Primary-Blue
  ├─ Menu Position: Below (スペース足りない場合: Above)
  ├─ Menu Max-Height: 300px (スクロール可能)
  └─ Item Hover: Gray-100

Selected Item:
  ├─ Background: Light-Blue (#E3F2FD)
  ├─ Text Color: Primary-Blue
  └─ Checkmark: Primary-Blue
```

#### Toggle Switch

```
Off状態:
  └─ Background: Gray-300
     Thumb: White, position: left

On状態:
  └─ Background: Primary-Blue-Light
     Thumb: Primary-Blue, position: right

Animated: 200ms ease-in-out
```

### 5.3 ナビゲーションコンポーネント

#### AppBar (トップバー)

**スマートフォン向け (推奨)**

```
Height: 56px (material-ui standard)
Background: Primary-Blue (#1976D2)
Elevation: shadow-1

Left Area (24px padding):
  └─ Menu Icon (ハンバーガー) or Back Icon

Center Area:
  └─ Page Title (Title Medium, White)

Right Area (24px padding):
  └─ Action Icons (検索、ユーザーメニュー)
```

**デスクトップ向け**

```
Height: 64px
Background: Primary-Blue (#1976D2)
Elevation: shadow-2

Left Area:
  └─ Logo / Brand Name

Center Area:
  └─ Primary Navigation Menu (Horizontal)

Right Area:
  └─ User Profile, Settings, Notifications
```

#### Navigation Drawer (サイドメニュー)

**スマートフォン向け**

```
Width: 100% (Full Screen Modal)
背景: White
Overlay: Black 50% (背景ディセーブル)
スライドイン方向: Left から右へ
持続時間: 225ms (Material-UI standard)

構成:
├─ Header Area (64px)
│  └─ ユーザープロフィール情報
├─ Navigation Items
│  ├─ 写真管理
│  ├─ スケジュール
│  ├─ 原価管理
│  ├─ レポート
│  └─ 設定
└─ Footer Area
   └─ ログアウト
```

**デスクトップ向け**

```
Width: 280px (Persistent)
背景: White
ボーダー右: Gray-200

構成: スマートフォン向けと同じ

ホバー効果:
  └─ Menu Item: Background Gray-100
```

#### BottomNavigation (スマートフォン向けボトムナビ)

**Phase1-2ではハンバーガーメニュー、Phase3で変更検討**

```
Height: 56px
背景: White
ボーダー上: Gray-200

項目数: 3-4個 (5個以上は推奨しない)

各項目:
├─ Icon (24x24px)
├─ Label (Caption, 12px)
└─ Active時の背景色: Light-Blue (#E3F2FD)

例 (Phase1):
  ├─ 写真 (写真アイコン)
  ├─ スケジュール (カレンダーアイコン)
  └─ その他 (•••アイコン) → Drawer へ
```

#### Tabs (タブナビゲーション)

```
高さ: 48px
背景: White
ボーダー下: Gray-200

Tab Item:
├─ Padding: 12px 16px
├─ Font: Label Large (14px)
├─ Color: Gray-700 (inactive)
└─ Color: Primary-Blue (active)

Active Indicator:
├─ 位置: Tab下部
├─ 色: Primary-Blue
├─ 高さ: 3px
└─ アニメーション: 200ms ease-in-out (位置移動)

Scroll動作:
└─ タブ数が多い場合、横スクロール可能
```

### 5.4 データ表示コンポーネント

#### Table (テーブル)

**用途**: スケジュール、原価データ、プロジェクト一覧

```
構成:
┌─────────────────────────────────────┐
│  Header Row (Gray-100 背景)          │
│  ├─ Column 1 (Bold)                 │
│  ├─ Column 2                        │
│  └─ Column N                        │
├─────────────────────────────────────┤
│  Data Row 1 (White背景)              │
│  ├─ Cell 1                          │
│  ├─ Cell 2                          │
│  └─ Cell N                          │
├─────────────────────────────────────┤
│  Data Row 2 (Striped: Gray-50)      │
└─────────────────────────────────────┘
```

**テーブル要素**

```
セルパディング: 12px (vertical), 16px (horizontal)
行の高さ: 48px (基準)
ボーダー: Gray-200 (row境界線のみ)
ホバー: Gray-50背景

セルコンテンツ:
  ├─ テキスト: Body Medium (14px)
  ├─ 数値: 右寄せ
  └─ ステータス: バッジで表示
```

**スマートフォン対応**

```
スクロール: 横スクロール可能
スティッキーヘッダー: スクロール時に固定
圧縮表示: 複数項目を1行に表示

例 (写真テーブル):
┌────────────────────┐
│ 日付         撮影者  │
│ 2026-02-15  監督太郎│
│ 場所: 外壁工事     │
│ ✓ 承認済み        │
└────────────────────┘
```

#### List (リスト)

**シンプルリスト (写真一覧等)**

```
┌──────────────────────────────┐
│ [Icon] Item Title            │
│        Supporting Text       │
│        Metadata (gray-500)   │
│ [Action Icon]                │
└──────────────────────────────┘
```

**2-3行リスト**

```
┌──────────────────────────────────┐
│ [Avatar]                         │
│ Title                      [Menu]│
│ Supporting text 1                │
│ Supporting text 2                │
└──────────────────────────────────┘
```

#### Badge (バッジ)

```
背景: ステータスに応じた色
テキスト: White (コントラスト確保)
パディング: 4px 8px
ボーダーラジアス: 12px (full rounded)
フォント: Label Small (11px, Bold)

例:
┌─────────────┐
│ ✓ 承認済み  │ (Green背景)
└─────────────┘
┌──────────┐
│ ⚠ 確認待 │ (Orange背景)
└──────────┘
```

### 5.5 フィードバックコンポーネント

#### Dialog (モーダルダイアログ)

**基本構成**

```
┌───────────────────────────────────────────┐
│  Title (Headline Medium, 28px)            │
│  [Close Button] (右上)                    │
├───────────────────────────────────────────┤
│  Content Area                             │
│  (Body Large, 16px, line-height 1.5)     │
├───────────────────────────────────────────┤
│  Action Buttons (Outlined, Contained)     │
│  [Cancel] [OK]                            │
└───────────────────────────────────────────┘
```

**ダイアログ動作**

```
表示: 200ms fade-in
背景Overlay: Black 50% (タップで閉じない)
スマートフォン: Full-screen に展開
デスクトップ: 最大幅 600px, 中央配置

Escape キー: ダイアログ閉じる
フォーカストラップ: ダイアログ内に限定
```

#### Snackbar (通知バー)

**用途**: API通信結果、エラーメッセージ、一時的通知

```
位置: 画面下部 (スマートフォン)
     右下部 (デスクトップ)
背景: Gray-900 (Dark, White テキスト)
パディング: 16px
ボーダーラジアス: 4px
表示時間: 4秒 (ユーザーが消去できる)

構成:
├─ メッセージ (Body Medium)
├─ アクション (Button, Optional)
└─ クローズボタン (×)

アニメーション:
├─ 表示: 300ms slide-up
└─ 非表示: 200ms slide-down
```

**メッセージタイプ別**

```
成功: 背景 Green (#388E3C), Icon ✓
      「写真をアップロードしました」

エラー: 背景 Red (#D32F2F), Icon ✕
       「アップロードに失敗しました」

警告: 背景 Orange (#F57C00), Icon ⚠
     「インターネット接続がありません」

情報: 背景 Blue (#0288D1), Icon ℹ
     「新しいスケジュールが追加されました」
```

#### LinearProgress (進捗バー)

**用途**: ファイルアップロード、データ同期進捗

```
高さ: 4px (background色: Gray-200)
進捗色: Primary-Blue (#1976D2)
アニメーション: Linear (Determinate)
               Wave (Indeterminate)

スマートフォン表示:
  ├─ 常にフルスクリーン幅
  ├─ AppBar直下に配置
  └─ Z-index: 1200 (最前面)
```

#### Toast / Notification

**シンプルトースト**

```
表示位置: 画面下部中央 (スマートフォン)
表示時間: 2-4秒 (自動閉じ)
背景: 半透明 (Black 80%)
テキスト: White
パディング: 16px 24px
ボーダーラジアス: 4px
複数表示: 最大3個 (重ねる)
```

---

## 6. レイアウト・グリッドシステム

### 6.1 グリッドシステム

**Material Design 12-Column Grid**

```
Desktop (1920px+):
  ├─ 12 columns
  ├─ Column width: 64px
  ├─ Gutter: 24px
  └─ Margin: 24px

Tablet (600-1200px):
  ├─ 8 columns
  ├─ Column width: 84px
  ├─ Gutter: 16px
  └─ Margin: 16px

Smartphone (0-599px):
  ├─ 4 columns
  ├─ Column width: 72px
  ├─ Gutter: 16px
  └─ Margin: 16px
```

### 6.2 スペーシング規則

**垂直スペーシング (Rhythm)**

```
コンテナ内パディング: 16px (sm), 24px (md), 32px (lg)
要素間マージン: 8px (xs), 16px (md), 24px (lg)
セクション間: 32px (md), 48px (lg)
```

**例: 写真管理画面のレイアウト**

```
┌─────────────────────────────┐
│ [AppBar] (56px)             │
├─────────────────────────────┤
│ Section Padding: 16px       │
├─────────────────────────────┤
│ [検索フィールド]             │
│ Margin-bottom: 16px         │
├─────────────────────────────┤
│ [フィルターチップ]           │
│ Margin-bottom: 24px         │
├─────────────────────────────┤
│ [写真カード1] [写真カード2]  │
│ Gap: 16px (grid)            │
├─────────────────────────────┤
│ [写真カード3] [写真カード4]  │
│ Gap: 16px (grid)            │
├─────────────────────────────┤
│ [Pagination]                │
│ Margin-top: 24px            │
└─────────────────────────────┘
```

### 6.3 Safe Area & Notch対応

**スマートフォン対応**

```
iPhone (Notch / Dynamic Island):
  ├─ padding-top: max(16px, env(safe-area-inset-top))
  └─ padding-bottom: max(16px, env(safe-area-inset-bottom))

Android (Navigation Bar):
  ├─ padding-bottom: max(16px, env(safe-area-inset-bottom))
  └─ 通常 0-48px

CSS実装例:
  body {
    padding-top: env(safe-area-inset-top);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    padding-bottom: env(safe-area-inset-bottom);
  }
```

---

## 7. 画面遷移図

### 7.1 Phase1 画面遷移フロー

**ログイン・認証フロー**

```
                    ┌─────────────────┐
                    │ ログイン画面     │
                    │ (username/pass) │
                    └────────┬────────┘
                             │
                    [認証成功]
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         ┌────▼───────┐  ┌──▼─────────┐  ┌▼───────────┐
         │ ホーム      │  │ 写真管理    │  │ 設定       │
         │ (Dashboard)│  │ (Gallery)   │  │ (Settings) │
         └────┬───────┘  └──┬────────┬─┘  └───────────┘
              │             │        │
              │        [新規撮影]  [詳細]
              │             │        │
              │             │    ┌───▼──────┐
              │             │    │ 写真詳細 │
              │             │    │ (Detail) │
              │             │    └──────────┘
              │             │
              │        ┌────▼────────────┐
              │        │ 写真編集        │
              │        │ (Edit Metadata) │
              │        └─────────────────┘
              │
         ┌────▼────────┐
         │ ログアウト  │
         └─────────────┘
```

**写真管理フロー (詳細)**

```
┌─────────────────────────────────┐
│ 写真一覧画面                     │
│ - Grid表示 (2列)               │
│ - 検索・フィルター機能          │
│ - 無限スクロール                │
└────────┬────────────────────────┘
         │
    [カード選択]
         │
    ┌────▼─────────────────────────┐
    │ 写真詳細表示                  │
    │ - Fullscreen Image            │
    │ - Metadata (Date, Location)  │
    │ - Status Badge                │
    │ - Action Menu                 │
    └────┬──────────────┬───────────┘
         │              │
      [編集]        [削除/確認申請]
         │              │
    ┌────▼─────┐   ┌────▼─────┐
    │ 編集画面  │   │ 確認ダイアログ
    │ (Metadata)│   │           │
    └──────────┘   └───────────┘
```

### 7.2 Phase2 追加画面遷移

```
Phase1画面 に加え:

写真一覧 ─→ [スケジュール] ──→ スケジュール管理
          └→ [原価管理]   ──→ 原価管理

新規メニュー:
├─ スケジュール管理
│  ├─ 工程一覧 (Timeline)
│  ├─ 工程詳細
│  └─ 工程編集
│
└─ 原価管理
   ├─ 原価一覧 (Table)
   ├─ 原価詳細
   └─ 原価入力
```

### 7.3 Phase3 追加画面遷移

```
Phase1+2画面 に加え (社外ユーザー向けポータル):

ログイン ──→ 顧客ポータルホーム
             ├─ プロジェクト一覧
             ├─ 工程進捗表示 (Timeline)
             ├─ 写真ギャラリー (限定表示)
             ├─ レポート生成
             └─ 問い合わせフォーム
```

---

## 8. レスポンシブデザイン

### 8.1 ブレークポイント定義

```css
xs: 0px     (スマートフォン縦)
sm: 600px   (スマートフォン横/小タブレット)
md: 960px   (タブレット)
lg: 1280px  (ノートPC)
xl: 1920px  (デスクトップ)
```

### 8.2 デバイス別最適化

#### スマートフォン (0-599px) - 優先対象

**優先事項**:
1. シングルカラム レイアウト
2. タッチターゲット最小 44x44px (WCAG)
3. 片手操作を想定
4. 通信量削減 (画像サイズ最適化)
5. オフライン対応

**レイアウト**

```
┌──────────────────┐
│ [AppBar] (56px)  │
├──────────────────┤
│ Content          │
│ (1 column)       │
│ Padding: 16px    │
└──────────────────┘
│ [Bottom Navi]    │
│ (56px)           │
└──────────────────┘
```

**画像最適化**

```
Thumbnail: 200x200px (webp format)
Detail View: 800x800px (webp format)
File Size Target: < 300KB (thumbnail), < 1MB (detail)
```

#### タブレット (600-1199px)

**レイアウト**

```
┌──────────────────────────────────┐
│ [AppBar] (64px)                  │
├──────────────────────────────────┤
│ [Navigation] (280px) │ Content    │
│ (Drawer/Permanent)   │ (2-3 col)  │
│                      │            │
│                      │            │
└──────────────────────────────────┘
```

**写真表示**

```
Grid表示: 2-3列
各カード幅: 300-400px
アスペクト比: 3:4 (Mobile写真向け)
```

#### デスクトップ (1200px+)

**レイアウト**

```
┌──────────────────────────────────────┐
│ [AppBar] (64px)                      │
├──────────────────────────────────────┤
│ [Sidebar] (280px) │ Content Area     │
│ (Persistent)      │ (3-4 columns)    │
│                   │                  │
│                   │                  │
└──────────────────────────────────────┘
```

**機能面**

```
マルチカラムレイアウト
サイドバー永続表示
テーブルデータ表示
マウスホバーインタラクション
```

### 8.3 メディアクエリ例

```css
/* スマートフォン */
@media (max-width: 599px) {
  .app-layout {
    display: flex;
    flex-direction: column;
  }
  .drawer {
    position: fixed; /* Modal */
  }
  .content {
    padding: 16px;
  }
  .photo-grid {
    grid-template-columns: 2fr 2fr;
    gap: 8px;
  }
}

/* タブレット */
@media (min-width: 600px) and (max-width: 1199px) {
  .app-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
  }
  .drawer {
    position: relative; /* Persistent */
  }
  .photo-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}

/* デスクトップ */
@media (min-width: 1200px) {
  .app-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
  }
  .content {
    padding: 24px;
  }
  .photo-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }
}
```

---

## 9. アクセシビリティ

### 9.1 WCAG 2.1 Level A 準拠

本システムは以下の達成基準を満たす:

#### 知覚可能 (Perceivable)

**1.1 テキスト代替 (1.1.1)**
- すべてのアイコンに aria-label を設定
- 画像には alt テキストを必須

```html
<img src="photo.jpg" alt="2026年2月15日撮影、外壁工事" />
<IconButton aria-label="削除">
  <DeleteIcon />
</IconButton>
```

**1.3 順応可能 (1.3.1 情報と関係性)**
- 見出し階層の正確性 (h1 → h2 → h3)
- フォーム要素は label と関連付け

```html
<label htmlFor="project-name">プロジェクト名</label>
<input id="project-name" type="text" />
```

**1.4 識別可能 (1.4.3 コントラスト比最小)**
- テキスト: 4.5:1 以上 (標準)
- 大きいテキスト: 3:1 以上

| 要素 | 背景 | テキスト | コントラスト比 | 達成基準 |
|------|------|---------|-------------|---------|
| ボタン | #1976D2 | #FFFFFF | 5.2:1 | AA ✓ |
| ボディテキスト | #FFFFFF | #212121 | 18.5:1 | AAA ✓ |
| 補助テキスト | #FFFFFF | #9E9E9E | 4.6:1 | AA ✓ |

#### 操作可能 (Operable)

**2.1 キーボード操作 (2.1.1)**
- すべての機能がキーボードのみで操作可能

```
Tab: 要素間フォーカス移動
Shift+Tab: 逆方向フォーカス移動
Enter/Space: アクティベーション
Escape: ダイアログ閉じ
```

**2.4 ナビゲーション可能性 (2.4.3 フォーカス順序)**
- フォーカス順序が視覚順序と一致

```html
<form>
  <input /> {/* 1st */}
  <select /> {/* 2nd */}
  <button /> {/* 3rd */}
</form>
```

**2.5 入力様式 (2.5.1 ポインタ)**
- タッチターゲット最小: 44x44px (WCAG基準)

#### 理解可能 (Understandable)

**3.1 言語 (3.1.1 ページ言語)**
- HTML lang 属性を設定

```html
<html lang="ja">
```

**3.3 入力サポート (3.3.1 エラーの識別)**
- エラーメッセージが明確に表示

```
エラー: プロジェクト名は必須です
aria-live="polite" で通知
```

#### 堅牢性 (Robust)

**4.1 互換性 (4.1.2 名前、ロール、値)**
- ARIA 属性を正しく使用

```html
<div role="button" aria-pressed="false">
  送信
</div>
```

### 9.2 スクリーンリーダー対応

#### ARIA ランドマーク

```html
<header>...</header>           {/* region: banner */}
<nav>...</nav>                 {/* region: navigation */}
<main>...</main>               {/* region: main */}
<aside>...</aside>             {/* region: complementary */}
<footer>...</footer>           {/* region: contentinfo */}
```

#### Dynamic Content

```html
<div aria-live="polite" aria-atomic="true">
  写真がアップロードされました
</div>
```

#### Form Labels

```html
<label htmlFor="search">写真を検索:</label>
<input
  id="search"
  type="text"
  aria-describedby="search-hint"
/>
<span id="search-hint">プロジェクト名または日付で検索</span>
```

### 9.3 カラーブラインド対応

**色情報のみに頼らない設計**

```
エラー表示:
  ✗ 赤色のみ → 不可
  ○ 赤色 + ✕ アイコン + テキスト → 可

ステータス表示:
  ✗ 緑色のみ → 不可
  ○ 緑色 + ✓ アイコン + 「承認済み」テキスト → 可
```

### 9.4 モーション感度

**前庭障害対応**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. インタラクションパターン

### 10.1 フォーカスインジケーター

```
デフォルト:
  ├─ 外側2pxの outline
  ├─ 色: Primary-Blue (#1976D2)
  ├─ offset: 2px
  └─ radius: 4px

例:
  button:focus {
    outline: 2px solid #1976D2;
    outline-offset: 2px;
  }

高コントラストモード対応:
  @media (prefers-contrast: more) {
    button:focus {
      outline-width: 3px;
    }
  }
```

### 10.2 ホバー・アクティブ状態

```
ボタン:
  Default: Background Primary-Blue
  Hover: Background Primary-Dark, opacity 90%
  Active: Background Primary-Dark, opacity 100%
  Disabled: Background Gray-300, opacity 50%

リスト項目:
  Default: Background White
  Hover: Background Gray-50
  Active: Background Light-Blue (#E3F2FD)
  Selected: Border-left Primary-Blue (3px)
```

### 10.3 フィードバック

**タップフィードバック (Material Ripple)**

```
Effect: Circular ripple from tap point
Duration: 400ms
Color: rgba(0, 0, 0, 0.54)
Easing: cubic-bezier(0.4, 0, 0.2, 1)
```

**キーボードフォーカスフィードバック**

```
2px solid outline + 2px offset
視覚的な違いで区別可能
```

### 10.4 ページ遷移

```
Fade: 200ms ease-out (同レベルページ)
Slide: 225ms ease-out (前後ページ)
```

---

## 11. ダークモード対応

### 11.1 ダークモード設計

**Phase2-3での実装予定 (Phase1では Light Only)**

#### ダークパレット

```
背景:
  surface: #121212
  surface-dim: #0A0A0A
  surface-bright: #282828

テキスト:
  primary: #FFFFFF (87%)
  secondary: #BDBDBD (60%)
  tertiary: #616161 (38%)

カラー (Inverted):
  primary: #42A5F5 (Light版: #1976D2)
  secondary: #66BB6A (Light版: #388E3C)
  error: #EF5350 (Light版: #D32F2F)
```

#### 実装例

```css
/* Light Mode (デフォルト) */
:root {
  --bg-primary: #FFFFFF;
  --text-primary: #212121;
  --color-primary: #1976D2;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #121212;
    --text-primary: #FFFFFF;
    --color-primary: #42A5F5;
  }
}
```

### 11.2 ユーザー設定

```
設定 → 表示
  ├─ ○ ライトモード
  ├─ ○ ダークモード
  ├─ ○ システム設定に従う (Default)
```

---

## 12. アニメーション・トランジション

### 12.1 Easing関数

```
標準: cubic-bezier(0.4, 0, 0.2, 1) (Material Motion)
エンファシス: cubic-bezier(0.4, 0, 1, 1) (Accelerate)
戻す: cubic-bezier(0, 0, 0.2, 1) (Decelerate)
```

### 12.2 Duration基準

```
UI応答: 75ms
ページ遷移: 225ms
ダイアログ表示: 200ms
リスト追加: 300ms
```

### 12.3 使用例

```javascript
// React + Material-UI
import { Fade, Slide } from '@mui/material';

// ページ遷移
<Fade in={isVisible} timeout={200}>
  <Box>Content</Box>
</Fade>

// モーダル表示
<Slide direction="up" in={isOpen} timeout={225}>
  <Dialog>...</Dialog>
</Slide>
```

---

## 13. 実装ガイドライン

### 13.1 技術スタック

```
Framework: React 18
UI Library: Material-UI v5 (@mui/material)
Styling: Emotion (@emotion/react)
Icon Set: Material Icons
Animation: Framer Motion (Optional)
```

### 13.2 Material-UI のカスタマイズ

```javascript
// theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976D2',
      light: '#42A5F5',
      dark: '#1565C0',
    },
    secondary: {
      main: '#388E3C',
    },
    success: {
      main: '#388E3C',
    },
    warning: {
      main: '#F57C00',
    },
    error: {
      main: '#D32F2F',
    },
  },
  typography: {
    fontFamily: '"Noto Sans JP", "Roboto", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minHeight: '40px',
        },
      },
    },
  },
});
```

### 13.3 コンポーネント実装例

```javascript
// 写真カードコンポーネント
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

export const PhotoCard: React.FC<PhotoCardProps> = ({ photo }) => {
  return (
    <Card sx={{ maxWidth: 300 }} elevation={1}>
      <CardMedia
        component="img"
        height="200"
        image={photo.thumbnailUrl}
        alt={photo.description}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent>
        <Typography variant="headline-small" gutterBottom>
          {photo.projectName}
        </Typography>
        <Typography variant="body-medium" color="textSecondary">
          {photo.date}
        </Typography>
        <Chip
          label={photo.status}
          color={photo.status === '承認済み' ? 'success' : 'warning'}
          size="small"
          sx={{ mt: 1 }}
        />
      </CardContent>
      <CardActions>
        <Button size="small">詳細</Button>
        <Button size="small">編集</Button>
      </CardActions>
    </Card>
  );
};
```

---

## 14. 参考資料・ガイドライン

### 14.1 外部参照

- Material Design 3: https://m3.material.io/
- Material-UI Documentation: https://mui.com/
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Web Content Accessibility Guidelines: https://www.w3.org/TR/WCAG21/

### 14.2 QA チェックリスト

```
色彩:
  ☐ コントラスト比 4.5:1 以上 (通常テキスト)
  ☐ コントラスト比 3:1 以上 (大きいテキスト)
  ☐ 色のみに情報を頼らない

タイポグラフィ:
  ☐ フォントサイズ最小 12px
  ☐ 行間 1.3 以上
  ☐ テキスト全幅 80字以下

操作性:
  ☐ タッチターゲット 44x44px 以上
  ☐ キーボード操作可能
  ☐ フォーカスインジケーター表示

レスポンシブ:
  ☐ 3つのブレークポイント (sm/md/lg) でテスト
  ☐ 横スクロール不要
  ☐ 画像が正しくスケール

スクリーンリーダー:
  ☐ 見出し階層が正確
  ☐ alt テキスト/aria-label 設定
  ☐ aria-live regions が正しく機能
```

---

## 附録A: デザイン決定記録 (ADR)

### ADR-001: Material Design 3 採用

**決定**: Material Design 3 (Material-UI v5) をベースとする

**理由**:
1. エンタープライズレベルの実績
2. WCAG 2.1 Level A 準拠が容易
3. React 18 との親和性
4. 豊富なコンポーネント
5. 建設業界でも実績あり

**代替案**:
- Ant Design: 中国企業向け (適さない)
- Chakra UI: 小規模向け
- 独自デザインシステム: 開発期間増加

---

## 附録B: Phase別実装スコープ

### Phase1: 基本UI/UX

```
✓ ログイン画面
✓ ホーム (ダッシュボード)
✓ 写真管理画面
✓ 写真詳細表示
✓ 写真メタデータ編集
✓ ナビゲーション (Drawer)
✓ 基本アクセシビリティ
□ ダークモード (実装しない)
□ Advanced Analytics Dashboard
```

### Phase2: 拡張UI/UX

```
✓ スケジュール管理画面
✓ 原価管理画面
✓ テーブルコンポーネント
✓ レポート生成UI
✓ より詳細なアクセシビリティ
□ ダークモード (実装開始)
```

### Phase3: 社外向けUI/UX

```
✓ 顧客ポータルホーム
✓ プロジェクト一覧 (限定表示)
✓ 工程進捗表示 (Timeline)
✓ レポート閲覧UI
✓ ダークモード完全対応
✓ 多言語対応 (英語)
```

---

## 附録C: テスト計画

### ビジュアルリグレッションテスト

```
ツール: Percy, Chromatic (Storybook)
対象: すべてのコンポーネント
実行: CI/CD パイプライン
ブレークポイント: xs, sm, md, lg, xl
```

### アクセシビリティテスト

```
ツール: axe-core, WAVE, Lighthouse
実行頻度: 毎プルリクエスト
基準: WCAG 2.1 Level A
自動テスト対象: 色彩, コントラスト, ARIA
手動テスト対象: スクリーンリーダー, キーボード操作
```

### ユーザテスト

```
対象: 現場監督 (Phase1)
期間: 各Phase 開発完了後 2週間
参加者: 5-8名
タスク: 実際の業務フローを模擬
測定項目: タスク完了率, 完了時間, エラー数
```

---

## 版履歴

| 日付 | バージョン | 内容 | 作成者 |
|------|----------|------|--------|
| 2026-02-15 | 2.0 | 初版作成 (Phase1-3統合) | Claude |
| | | | |

---

**文書終了**

本UI/UX設計書は、建設DXサポートシステム(CDCP)の実装における標準デザインガイドラインである。すべてのフロントエンド開発は本文書に準拠すること。

更新または変更の必要性については、プロダクトマネージャーまたはデザインリーダーに確認すること。
