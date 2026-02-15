# CDCP Infrastructure - Terraform

## 概要

CDCP（Construction Digital Control Platform）のAWSインフラストラクチャをTerraformで管理します。

## 前提条件

- Terraform v1.6+
- AWS CLI v2+
- 適切なAWS認証情報（IAM User / Role）

## ディレクトリ構造

```
infrastructure/terraform/
├── main.tf                          # メイン設定、Provider、Backend
├── variables.tf                     # 変数定義
├── outputs.tf                       # 出力定義
├── terraform.tfvars.staging         # ステージング環境変数
├── terraform.tfvars.production      # 本番環境変数
├── vpc.tf                           # VPC、Subnet、Route Table
├── ecr.tf                           # Elastic Container Registry
├── ecs.tf                           # ECS Fargate、Auto Scaling
├── alb.tf                           # Application Load Balancer
├── rds.tf                           # PostgreSQL 15 (Multi-AZ)
├── elasticache.tf                   # Redis 7
├── s3.tf                            # S3、CloudFront
└── README.md                        # このファイル
```

## 初回セットアップ

### 1. Terraform State用S3バケット作成（手動）

```bash
# S3バケット作成
aws s3api create-bucket \
  --bucket cdcp-terraform-state \
  --region ap-northeast-1 \
  --create-bucket-configuration LocationConstraint=ap-northeast-1

# バージョニング有効化
aws s3api put-bucket-versioning \
  --bucket cdcp-terraform-state \
  --versioning-configuration Status=Enabled

# 暗号化有効化
aws s3api put-bucket-encryption \
  --bucket cdcp-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# DynamoDBテーブル作成（State Lock用）
aws dynamodb create-table \
  --table-name cdcp-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1
```

### 2. Terraform初期化

```bash
cd infrastructure/terraform

# ステージング環境
terraform init

# 本番環境（別途作業ディレクトリを作成推奨）
terraform init -backend-config="key=production/terraform.tfstate"
```

### 3. 環境変数設定

```bash
# データベースパスワード設定（強固なパスワードを設定）
export TF_VAR_database_master_password="CHANGE_ME_STRONG_PASSWORD_32_CHARS_MIN"

# Datadog API Key設定（オプション）
export TF_VAR_datadog_api_key="YOUR_DATADOG_API_KEY"
```

## デプロイ手順

### ステージング環境デプロイ

```bash
# 1. プランの確認
terraform plan -var-file="terraform.tfvars.staging"

# 2. デプロイ実行
terraform apply -var-file="terraform.tfvars.staging"

# 3. 出力確認
terraform output
```

### 本番環境デプロイ

```bash
# ⚠️ 本番環境への変更は慎重に！

# 1. プランの確認（必須）
terraform plan -var-file="terraform.tfvars.production"

# 2. プラン結果を保存
terraform plan -var-file="terraform.tfvars.production" -out=production.tfplan

# 3. 人間による承認後、保存したプランを適用
terraform apply production.tfplan

# 4. 出力確認
terraform output
```

## 主要リソース

### VPC構成

- **VPC**: 10.0.0.0/16
- **Public Subnets**: 2つ（ALB、NAT Gateway用）
- **Private Subnets**: 2つ（ECS Fargate、Lambda用）
- **Data Subnets**: 2つ（RDS、ElastiCache用）
- **Multi-AZ**: ap-northeast-1a、ap-northeast-1c

### ECS構成

- **Cluster**: ECS Fargate
- **Task CPU**: 512 (staging) / 1024 (production)
- **Task Memory**: 1024 MB (staging) / 2048 MB (production)
- **Auto Scaling**: CPU 70%、Memory 80% でスケールアウト

### RDS構成

- **Engine**: PostgreSQL 15.4 (PostGIS対応)
- **Instance Class**: db.t3.medium (staging) / db.r6g.large (production)
- **Multi-AZ**: 本番環境のみ有効
- **Backup**: 7日 (staging) / 30日 (production)
- **Encryption**: AES-256 (KMS)

### ElastiCache構成

- **Engine**: Redis 7.0
- **Node Type**: cache.t3.micro (staging) / cache.r6g.large (production)
- **Cluster Mode**: 本番環境のみ有効
- **Auth Token**: 本番環境のみ有効

## 注意事項

### セキュリティ

1. **機密情報管理**
   - データベースパスワードは必ず環境変数で設定
   - terraform.tfstate には機密情報が含まれるため、S3バケットのアクセス権限を厳格に管理
   - .gitignore に terraform.tfstate、*.tfvars を追加済み

2. **ACM証明書**
   - HTTPS通信には ACM証明書が必要
   - alb.tf の certificate_arn を手動設定
   - Route 53 でドメイン検証を推奨

3. **IAM権限**
   - Terraform実行には以下の権限が必要:
     - EC2, VPC, ECS, RDS, ElastiCache, S3, CloudFront, IAM, Secrets Manager, CloudWatch, KMS

### コスト最適化

- **ステージング環境**:
  - 営業時間外は ECS Task Count を0にする（Auto Scalingで設定可能）
  - RDS はシングルAZ
  - ElastiCache は1ノード

- **本番環境**:
  - RDS Read Replica は Phase2 以降で有効化
  - CloudWatch Logs の保持期間を調整
  - S3 Lifecycle で Glacier 移行

### 削除保護

本番環境では以下のリソースに削除保護が有効:

- RDS インスタンス (`deletion_protection = true`)
- ALB (`enable_deletion_protection = true`)

削除する場合は、まず削除保護を無効化してから `terraform destroy` を実行してください。

## トラブルシューティング

### State Lock エラー

```bash
# DynamoDB Lock を強制解除（最終手段）
terraform force-unlock LOCK_ID
```

### RDS パスワード変更

```bash
# Secrets Manager で管理しているため、手動変更
aws secretsmanager update-secret \
  --secret-id cdcp-production-database-credentials \
  --secret-string '{"DATABASE_PASSWORD":"NEW_PASSWORD"}'

# RDS パスワード変更
aws rds modify-db-instance \
  --db-instance-identifier cdcp-production-db \
  --master-user-password NEW_PASSWORD \
  --apply-immediately
```

## 関連ドキュメント

- [AWS Well-Architected Framework](https://aws.amazon.com/jp/architecture/well-architected/)
- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [CDCP システムアーキテクチャ設計書](../../docs/03_設計(Design)/01_アーキテクチャ設計(Architecture)/システムアーキテクチャ設計書(System-Architecture).md)

## 連絡先

- プロジェクトマネージャー: [PM名]
- インフラ担当: [担当者名]
- 緊急連絡: [連絡先]
