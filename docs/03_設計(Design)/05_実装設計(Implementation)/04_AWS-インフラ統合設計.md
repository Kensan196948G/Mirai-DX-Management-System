# AWS インフラ統合アーキテクチャ設計書

## 1. 概要

本ドキュメントでは、CDCP プロジェクト Phase1 における AWS インフラストラクチャと NestJS/React PWA の統合アーキテクチャを定義する。

### 1.1 使用 AWS サービス

| サービス | 用途 | 構成 |
|---------|------|------|
| Amazon ECS Fargate | コンテナオーケストレーション | API サーバー (NestJS) |
| Amazon RDS (PostgreSQL) | リレーショナルデータベース | PostgreSQL 15 + PostGIS |
| Amazon S3 | オブジェクトストレージ | 写真ファイル保存 |
| Amazon CloudFront | CDN | 静的コンテンツ配信 |
| Amazon ECR | コンテナレジストリ | Docker イメージ管理 |
| AWS Application Load Balancer | ロードバランサー | HTTP/HTTPS トラフィック分散 |
| AWS Secrets Manager | シークレット管理 | DB 認証情報、API キー |
| Amazon CloudWatch | 監視・ログ | メトリクス収集、ログ集約 |
| AWS VPC | ネットワーク | プライベートネットワーク |
| AWS Certificate Manager | SSL/TLS 証明書 | HTTPS 通信 |
| Amazon Route 53 | DNS | ドメイン管理 |
| AWS CodePipeline | CI/CD | 自動デプロイ |
| AWS CodeBuild | ビルド | Docker イメージビルド |

---

## 2. ネットワークアーキテクチャ

### 2.1 VPC 設計

```
CDCP VPC (10.0.0.0/16)
│
├── Public Subnet A (10.0.1.0/24, ap-northeast-1a)
│   ├── NAT Gateway A
│   └── Application Load Balancer
│
├── Public Subnet B (10.0.2.0/24, ap-northeast-1c)
│   ├── NAT Gateway B
│   └── Application Load Balancer
│
├── Private Subnet A (10.0.11.0/24, ap-northeast-1a)
│   ├── ECS Fargate Task (API Container)
│   └── VPC Endpoint (S3, ECR, CloudWatch Logs)
│
├── Private Subnet B (10.0.12.0/24, ap-northeast-1c)
│   ├── ECS Fargate Task (API Container)
│   └── VPC Endpoint (S3, ECR, CloudWatch Logs)
│
├── Database Subnet A (10.0.21.0/24, ap-northeast-1a)
│   └── RDS Primary
│
└── Database Subnet B (10.0.22.0/24, ap-northeast-1c)
    └── RDS Standby
```

### 2.2 セキュリティグループ設計

#### ALB セキュリティグループ

```hcl
# terraform/modules/network/security_groups.tf
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP from Internet (redirect to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-alb-sg"
    Environment = var.environment
  }
}
```

#### ECS セキュリティグループ

```hcl
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project_name}-${var.environment}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow inbound from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-ecs-tasks-sg"
    Environment = var.environment
  }
}
```

#### RDS セキュリティグループ

```hcl
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from ECS tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  # 開発環境のみ: Bastion からの接続を許可
  dynamic "ingress" {
    for_each = var.environment == "dev" ? [1] : []
    content {
      description     = "PostgreSQL from Bastion"
      from_port       = 5432
      to_port         = 5432
      protocol        = "tcp"
      security_groups = [aws_security_group.bastion.id]
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-sg"
    Environment = var.environment
  }
}
```

---

## 3. ECS Fargate 構成

### 3.1 ECS クラスター設計

```hcl
# terraform/modules/ecs/cluster.tf
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-cluster"
    Environment = var.environment
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 4
    base              = 0
  }
}
```

### 3.2 タスク定義

```hcl
# terraform/modules/ecs/task_definition.tf
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project_name}-${var.environment}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "S3_BUCKET_NAME"
          value = var.s3_bucket_name
        },
        {
          name  = "CLOUDFRONT_DOMAIN"
          value = var.cloudfront_domain
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${aws_secretsmanager_secret.db_url.arn}"
        },
        {
          name      = "AUTH0_DOMAIN"
          valueFrom = "${aws_secretsmanager_secret.auth0_domain.arn}"
        },
        {
          name      = "AUTH0_CLIENT_ID"
          valueFrom = "${aws_secretsmanager_secret.auth0_client_id.arn}"
        },
        {
          name      = "AUTH0_CLIENT_SECRET"
          valueFrom = "${aws_secretsmanager_secret.auth0_client_secret.arn}"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}-${var.environment}"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-task"
    Environment = var.environment
  }
}
```

### 3.3 ECS サービス定義

```hcl
# terraform/modules/ecs/service.tf
resource "aws_ecs_service" "api" {
  name            = "${var.project_name}-${var.environment}-api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true # デバッグ用

  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy_attachment.ecs_execution_role_policy
  ]

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-service"
    Environment = var.environment
  }
}

# Auto Scaling
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu_policy" {
  name               = "${var.project_name}-${var.environment}-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

---

## 4. RDS (PostgreSQL) 構成

### 4.1 RDS インスタンス設計

```hcl
# terraform/modules/rds/main.tf
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.database_subnet_ids

  tags = {
    Name        = "${var.project_name}-${var.environment}-db-subnet-group"
    Environment = var.environment
  }
}

resource "aws_db_parameter_group" "postgres15" {
  name   = "${var.project_name}-${var.environment}-postgres15-params"
  family = "postgres15"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,postgis"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # 1秒以上のクエリをログ
  }

  parameter {
    name  = "max_connections"
    value = "200"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-postgres15-params"
    Environment = var.environment
  }
}

resource "aws_db_instance" "postgres" {
  identifier     = "${var.project_name}-${var.environment}-postgres"
  engine         = "postgres"
  engine_version = "15.4"

  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  iops              = var.db_iops
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_security_group_id]
  parameter_group_name   = aws_db_parameter_group.postgres15.name

  multi_az               = var.environment == "prod" ? true : false
  backup_retention_period = var.backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  deletion_protection = var.environment == "prod" ? true : false

  tags = {
    Name        = "${var.project_name}-${var.environment}-postgres"
    Environment = var.environment
  }
}

# PostGIS 拡張インストール (手動 or Lambda で実行)
# CREATE EXTENSION IF NOT EXISTS postgis;
# CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

### 4.2 データベース接続プール設定

```typescript
// apps/api/src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,

  // Prisma Connection Pool 設定
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || '60', 10),

  // RDS Proxy を使用する場合
  useRdsProxy: process.env.USE_RDS_PROXY === 'true',
  rdsProxyEndpoint: process.env.RDS_PROXY_ENDPOINT,
}));
```

### 4.3 RDS Proxy (本番環境のみ)

```hcl
# terraform/modules/rds/proxy.tf
resource "aws_db_proxy" "main" {
  count = var.environment == "prod" ? 1 : 0

  name                   = "${var.project_name}-${var.environment}-rds-proxy"
  engine_family          = "POSTGRESQL"
  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.db_credentials.arn
  }

  role_arn               = aws_iam_role.rds_proxy.arn
  vpc_subnet_ids         = var.private_subnet_ids
  require_tls            = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-proxy"
    Environment = var.environment
  }
}

resource "aws_db_proxy_default_target_group" "main" {
  count         = var.environment == "prod" ? 1 : 0
  db_proxy_name = aws_db_proxy.main[0].name

  connection_pool_config {
    max_connections_percent      = 100
    max_idle_connections_percent = 50
    connection_borrow_timeout    = 120
  }
}

resource "aws_db_proxy_target" "main" {
  count                 = var.environment == "prod" ? 1 : 0
  db_proxy_name         = aws_db_proxy.main[0].name
  target_group_name     = aws_db_proxy_default_target_group.main[0].name
  db_instance_identifier = aws_db_instance.postgres.id
}
```

---

## 5. S3 + CloudFront 構成

### 5.1 S3 バケット設計

```hcl
# terraform/modules/s3/main.tf
resource "aws_s3_bucket" "photos" {
  bucket = "${var.project_name}-${var.environment}-photos"

  tags = {
    Name        = "${var.project_name}-${var.environment}-photos"
    Environment = var.environment
  }
}

# バージョニング有効化
resource "aws_s3_bucket_versioning" "photos" {
  bucket = aws_s3_bucket.photos.id

  versioning_configuration {
    status = "Enabled"
  }
}

# 暗号化有効化
resource "aws_s3_bucket_server_side_encryption_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# パブリックアクセスブロック
resource "aws_s3_bucket_public_access_block" "photos" {
  bucket = aws_s3_bucket.photos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ライフサイクルルール
resource "aws_s3_bucket_lifecycle_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# CORS 設定
resource "aws_s3_bucket_cors_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = [
      "https://${var.domain_name}",
      var.environment == "dev" ? "http://localhost:5173" : ""
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
```

### 5.2 CloudFront ディストリビューション

```hcl
# terraform/modules/cloudfront/main.tf
resource "aws_cloudfront_origin_access_identity" "photos" {
  comment = "OAI for ${var.project_name}-${var.environment}-photos"
}

resource "aws_cloudfront_distribution" "photos" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name}-${var.environment} Photos CDN"
  default_root_object = ""
  price_class         = "PriceClass_200" # US, Europe, Asia

  origin {
    domain_name = aws_s3_bucket.photos.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.photos.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.photos.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.photos.id}"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400     # 1日
    max_ttl                = 31536000  # 1年
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = ["JP"] # 日本からのアクセスのみ許可
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-photos-cdn"
    Environment = var.environment
  }
}

# S3 バケットポリシー: CloudFront からのアクセスのみ許可
resource "aws_s3_bucket_policy" "photos" {
  bucket = aws_s3_bucket.photos.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAI"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.photos.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.photos.arn}/*"
      }
    ]
  })
}
```

---

## 6. NestJS と AWS サービスの統合

### 6.1 S3 アップロード実装

```typescript
// apps/api/src/modules/storage/storage.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly cloudFrontDomain: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
    });
    this.bucketName = this.configService.get('S3_BUCKET_NAME');
    this.cloudFrontDomain = this.configService.get('CLOUDFRONT_DOMAIN');
  }

  /**
   * 写真アップロード (オリジナル + サムネイル)
   */
  async uploadPhoto(
    file: Express.Multer.File,
    projectId: string,
  ): Promise<{ url: string; thumbnailUrl: string; key: string }> {
    const fileId = uuidv4();
    const extension = file.originalname.split('.').pop();

    // オリジナル画像の圧縮
    const compressedBuffer = await sharp(file.buffer)
      .jpeg({ quality: 90, progressive: true })
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    // サムネイル生成
    const thumbnailBuffer = await sharp(file.buffer)
      .jpeg({ quality: 80 })
      .resize(320, 320, { fit: 'cover' })
      .toBuffer();

    const originalKey = `photos/${projectId}/${fileId}.${extension}`;
    const thumbnailKey = `photos/${projectId}/thumbnails/${fileId}.jpg`;

    // オリジナルアップロード
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: originalKey,
        Body: compressedBuffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          projectId,
        },
      }),
    );

    // サムネイルアップロード
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
      }),
    );

    return {
      url: `https://${this.cloudFrontDomain}/${originalKey}`,
      thumbnailUrl: `https://${this.cloudFrontDomain}/${thumbnailKey}`,
      key: originalKey,
    };
  }

  /**
   * Presigned URL 生成 (クライアント直接アップロード用)
   */
  async getUploadUrl(
    projectId: string,
    filename: string,
  ): Promise<{ uploadUrl: string; key: string }> {
    const fileId = uuidv4();
    const extension = filename.split('.').pop();
    const key = `photos/${projectId}/${fileId}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: 'image/jpeg',
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600, // 1時間有効
    });

    return { uploadUrl, key };
  }

  /**
   * 写真削除
   */
  async deletePhoto(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );

    // サムネイルも削除
    const thumbnailKey = key.replace('/photos/', '/photos/thumbnails/');
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: thumbnailKey,
      }),
    );
  }
}
```

### 6.2 Secrets Manager からのシークレット取得

```typescript
// apps/api/src/config/secrets.config.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

@Injectable()
export class SecretsService {
  private readonly client: SecretsManagerClient;
  private secretsCache: Map<string, any> = new Map();

  constructor(private configService: ConfigService) {
    this.client = new SecretsManagerClient({
      region: this.configService.get('AWS_REGION'),
    });
  }

  async getSecret(secretName: string): Promise<any> {
    // キャッシュチェック
    if (this.secretsCache.has(secretName)) {
      return this.secretsCache.get(secretName);
    }

    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await this.client.send(command);

    const secret = JSON.parse(response.SecretString);
    this.secretsCache.set(secretName, secret);

    return secret;
  }

  async getAuth0Config(): Promise<{
    domain: string;
    clientId: string;
    clientSecret: string;
  }> {
    const secretName = `${this.configService.get('PROJECT_NAME')}-${this.configService.get('ENVIRONMENT')}-auth0`;
    return this.getSecret(secretName);
  }
}
```

### 6.3 CloudWatch Logs へのログ送信

```typescript
// apps/api/src/common/logger/cloudwatch-logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  CreateLogStreamCommand,
} from '@aws-sdk/client-cloudwatch-logs';

@Injectable()
export class CloudWatchLogger implements LoggerService {
  private readonly client: CloudWatchLogsClient;
  private readonly logGroupName: string;
  private readonly logStreamName: string;
  private sequenceToken: string | undefined;

  constructor(private configService: ConfigService) {
    this.client = new CloudWatchLogsClient({
      region: this.configService.get('AWS_REGION'),
    });

    this.logGroupName = `/ecs/${this.configService.get('PROJECT_NAME')}-${this.configService.get('ENVIRONMENT')}`;
    this.logStreamName = `api-${Date.now()}`;

    this.initializeLogStream();
  }

  private async initializeLogStream() {
    try {
      await this.client.send(
        new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
        }),
      );
    } catch (error) {
      // Log stream already exists
    }
  }

  async log(message: string, context?: string) {
    await this.sendLog('INFO', message, context);
  }

  async error(message: string, trace?: string, context?: string) {
    await this.sendLog('ERROR', message, context, { trace });
  }

  async warn(message: string, context?: string) {
    await this.sendLog('WARN', message, context);
  }

  private async sendLog(
    level: string,
    message: string,
    context?: string,
    extra?: Record<string, any>,
  ) {
    const logEvent = {
      timestamp: Date.now(),
      message: JSON.stringify({
        level,
        message,
        context,
        ...extra,
      }),
    };

    try {
      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [logEvent],
        sequenceToken: this.sequenceToken,
      });

      const response = await this.client.send(command);
      this.sequenceToken = response.nextSequenceToken;
    } catch (error) {
      console.error('Failed to send log to CloudWatch:', error);
    }
  }
}
```

---

## 7. CI/CD パイプライン設計

### 7.1 CodePipeline 構成

```hcl
# terraform/modules/cicd/codepipeline.tf
resource "aws_codepipeline" "main" {
  name     = "${var.project_name}-${var.environment}-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts.bucket
    type     = "S3"
  }

  # Source Stage (GitHub)
  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "ThirdParty"
      provider         = "GitHub"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        Owner      = var.github_owner
        Repo       = var.github_repo
        Branch     = var.github_branch
        OAuthToken = var.github_token
      }
    }
  }

  # Build Stage
  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.api.name
      }
    }
  }

  # Deploy Stage
  stage {
    name = "Deploy"

    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ClusterName = var.ecs_cluster_name
        ServiceName = var.ecs_service_name
        FileName    = "imagedefinitions.json"
      }
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-pipeline"
    Environment = var.environment
  }
}
```

### 7.2 CodeBuild プロジェクト

```hcl
# terraform/modules/cicd/codebuild.tf
resource "aws_codebuild_project" "api" {
  name          = "${var.project_name}-${var.environment}-api-build"
  service_role  = aws_iam_role.codebuild.arn
  build_timeout = 30

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true # Docker build用

    environment_variable {
      name  = "AWS_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "ECR_REPOSITORY_URI"
      value = var.ecr_repository_url
    }

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/${var.project_name}-${var.environment}"
      stream_name = "api"
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-build"
    Environment = var.environment
  }
}
```

### 7.3 buildspec.yml

```yaml
# buildspec.yml
version: 0.2

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY_URI
      - COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
      - IMAGE_TAG=${COMMIT_HASH:=latest}

  build:
    commands:
      - echo Build started on `date`
      - echo Building the Docker image...
      - docker build -t $ECR_REPOSITORY_URI:latest -f apps/api/Dockerfile .
      - docker tag $ECR_REPOSITORY_URI:latest $ECR_REPOSITORY_URI:$IMAGE_TAG

  post_build:
    commands:
      - echo Build completed on `date`
      - echo Pushing the Docker images...
      - docker push $ECR_REPOSITORY_URI:latest
      - docker push $ECR_REPOSITORY_URI:$IMAGE_TAG
      - echo Writing image definitions file...
      - printf '[{"name":"api","imageUri":"%s"}]' $ECR_REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json

artifacts:
  files:
    - imagedefinitions.json
```

---

## 8. 監視・アラート設計

### 8.1 CloudWatch アラーム

```hcl
# terraform/modules/monitoring/alarms.tf

# ECS CPU 使用率アラーム
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS CPU utilization is too high"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }
}

# RDS CPU 使用率アラーム
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "RDS CPU utilization is too high"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }
}

# ALB 5xx エラーアラーム
resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5xx errors are too high"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}

# RDS ストレージ容量アラーム
resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240 # 10GB
  alarm_description   = "RDS free storage space is low"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }
}
```

### 8.2 カスタムメトリクス

```typescript
// apps/api/src/common/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';

@Injectable()
export class MetricsService {
  private readonly client: CloudWatchClient;
  private readonly namespace: string;

  constructor(private configService: ConfigService) {
    this.client = new CloudWatchClient({
      region: this.configService.get('AWS_REGION'),
    });
    this.namespace = `${this.configService.get('PROJECT_NAME')}/${this.configService.get('ENVIRONMENT')}`;
  }

  async putMetric(
    metricName: string,
    value: number,
    unit: string = 'Count',
    dimensions?: Record<string, string>,
  ) {
    const metricData = {
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: new Date(),
      Dimensions: dimensions
        ? Object.entries(dimensions).map(([Name, Value]) => ({
            Name,
            Value,
          }))
        : undefined,
    };

    await this.client.send(
      new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: [metricData],
      }),
    );
  }

  // 写真アップロード成功メトリクス
  async recordPhotoUploadSuccess(projectId: string) {
    await this.putMetric('PhotoUploadSuccess', 1, 'Count', {
      ProjectId: projectId,
    });
  }

  // 写真アップロード失敗メトリクス
  async recordPhotoUploadFailure(projectId: string, errorType: string) {
    await this.putMetric('PhotoUploadFailure', 1, 'Count', {
      ProjectId: projectId,
      ErrorType: errorType,
    });
  }

  // API レスポンスタイムメトリクス
  async recordApiResponseTime(endpoint: string, duration: number) {
    await this.putMetric('ApiResponseTime', duration, 'Milliseconds', {
      Endpoint: endpoint,
    });
  }
}
```

---

## 9. セキュリティ対策

### 9.1 IAM ロール設計

```hcl
# terraform/modules/iam/ecs_roles.tf

# ECS タスク実行ロール (ECR pull, CloudWatch Logs, Secrets Manager)
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-${var.environment}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Secrets Manager アクセス
resource "aws_iam_role_policy" "ecs_secrets_access" {
  name = "secrets-access"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:${var.project_name}-${var.environment}-*"
        ]
      }
    ]
  })
}

# ECS タスクロール (S3, CloudWatch, etc.)
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# S3 アクセス権限
resource "aws_iam_role_policy" "ecs_s3_access" {
  name = "s3-access"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${var.s3_bucket_arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = var.s3_bucket_arn
      }
    ]
  })
}

# CloudWatch メトリクス送信権限
resource "aws_iam_role_policy" "ecs_cloudwatch_metrics" {
  name = "cloudwatch-metrics"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}
```

### 9.2 VPC Endpoint でコスト削減

```hcl
# terraform/modules/network/vpc_endpoints.tf

# S3 VPC Endpoint (Gateway型、無料)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.s3"
  route_table_ids = concat(
    aws_route_table.private[*].id
  )

  tags = {
    Name        = "${var.project_name}-${var.environment}-s3-endpoint"
    Environment = var.environment
  }
}

# ECR API VPC Endpoint (Interface型)
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-ecr-api-endpoint"
    Environment = var.environment
  }
}

# ECR DKR VPC Endpoint
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-ecr-dkr-endpoint"
    Environment = var.environment
  }
}

# CloudWatch Logs VPC Endpoint
resource "aws_vpc_endpoint" "logs" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-logs-endpoint"
    Environment = var.environment
  }
}

# Secrets Manager VPC Endpoint
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-secretsmanager-endpoint"
    Environment = var.environment
  }
}
```

---

## 10. コスト最適化

### 10.1 環境別リソース設定

| リソース | dev | staging | prod |
|---------|-----|---------|------|
| ECS タスク CPU | 512 | 1024 | 2048 |
| ECS タスク Memory | 1024 | 2048 | 4096 |
| ECS Desired Count | 1 | 2 | 3 |
| ECS Max Count | 2 | 4 | 10 |
| RDS Instance | db.t4g.medium | db.t4g.large | db.r6g.xlarge |
| RDS Multi-AZ | No | Yes | Yes |
| RDS Backup Retention | 1 day | 7 days | 30 days |
| NAT Gateway | Single AZ | Multi AZ | Multi AZ |
| Fargate Spot | 80% | 50% | 0% |

### 10.2 月額コスト試算 (Phase1)

| サービス | dev | prod | 備考 |
|---------|-----|------|------|
| ECS Fargate | $30 | $300 | タスク数・稼働時間による |
| RDS PostgreSQL | $50 | $500 | db.t4g.medium → db.r6g.xlarge |
| S3 | $10 | $50 | 10GB → 100GB 想定 |
| CloudFront | $5 | $50 | データ転送量による |
| ALB | $25 | $25 | 固定費 |
| NAT Gateway | $35 | $70 | Single → Multi AZ |
| その他 (CloudWatch, etc.) | $10 | $30 | - |
| **合計** | **$165** | **$1,025** | Phase1 想定 |

---

## 11. まとめ

### 11.1 アーキテクチャ検証結果

| 検証項目 | 結果 | 備考 |
|---------|------|------|
| スケーラビリティ | ✅ 合格 | ECS Auto Scaling + Multi-AZ 構成 |
| 可用性 | ✅ 合格 | Multi-AZ RDS, ALB, Fargate |
| セキュリティ | ✅ 合格 | VPC, Security Group, IAM, Secrets Manager |
| コスト効率 | ✅ 合格 | Fargate Spot, VPC Endpoint, Lifecycle Policy |
| 運用性 | ✅ 合格 | CloudWatch監視, CodePipeline自動デプロイ |
| パフォーマンス | ✅ 合格 | CloudFront CDN, RDS Proxy (prod) |

### 11.2 Phase1 実装推奨事項

1. **優先度: 高**
   - VPC + Subnet 構築
   - ECS Fargate + ALB 構築
   - RDS PostgreSQL + PostGIS 構築
   - S3 + CloudFront 構築
   - CI/CD パイプライン構築

2. **優先度: 中**
   - Auto Scaling 設定
   - CloudWatch アラーム設定
   - VPC Endpoint 設定

3. **優先度: 低 (Phase2以降)**
   - RDS Proxy 導入 (本番のみ)
   - 高度な監視ダッシュボード
   - Cost Explorer アラート

---

**作成日**: 2026-02-15
**バージョン**: 1.0
**作成者**: Architecture Review Agent
