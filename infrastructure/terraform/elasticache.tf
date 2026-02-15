# CDCP Infrastructure - ElastiCache Redis

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-redis-subnet-group"
  subnet_ids = aws_subnet.data[*].id

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-subnet-group"
  }
}

# Security Group for ElastiCache
resource "aws_security_group" "elasticache" {
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis from ECS tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-sg"
  }
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  name   = "${var.project_name}-${var.environment}-redis7-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # LRU削除ポリシー
  }

  parameter {
    name  = "timeout"
    value = "300"  # 5分アイドルタイムアウト
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-params"
  }
}

# ElastiCache Replication Group (Redis Cluster)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.project_name}-${var.environment}-redis"
  replication_group_description = "${var.project_name} ${var.environment} Redis Cluster"

  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.elasticache_node_type
  num_cache_clusters   = var.elasticache_num_cache_nodes
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.main.name

  # Network
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.elasticache.id]

  # High Availability
  automatic_failover_enabled = var.elasticache_num_cache_nodes > 1 ? true : false
  multi_az_enabled           = var.elasticache_num_cache_nodes > 1 ? true : false

  # Backup
  snapshot_retention_limit = var.environment == "production" ? 7 : 1
  snapshot_window          = "03:00-05:00"  # JST 12:00-14:00
  maintenance_window       = "mon:05:00-mon:06:00"  # JST 月曜14:00-15:00

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = var.environment == "production" ? true : false
  auth_token_enabled         = var.environment == "production" ? true : false
  auth_token                 = var.environment == "production" ? random_password.redis_auth_token[0].result : null

  # Auto Minor Version Upgrade
  auto_minor_version_upgrade = true

  # Notification
  notification_topic_arn = null  # SNS Topic ARN を設定

  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }

  lifecycle {
    ignore_changes = [auth_token]  # トークンローテーション対応
  }
}

# Random Password for Redis AUTH (本番環境のみ)
resource "random_password" "redis_auth_token" {
  count = var.environment == "production" ? 1 : 0

  length  = 64
  special = true
}

# Secrets Manager for Redis Credentials (本番環境のみ)
resource "aws_secretsmanager_secret" "redis" {
  name                    = "${var.project_name}-${var.environment}-redis-credentials"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-secret"
  }
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id

  secret_string = jsonencode({
    REDIS_URL = var.environment == "production" ? "rediss://:${random_password.redis_auth_token[0].result}@${aws_elasticache_replication_group.main.configuration_endpoint_address}:6379" : "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
    REDIS_HOST = aws_elasticache_replication_group.main.primary_endpoint_address
    REDIS_PORT = 6379
    REDIS_PASSWORD = var.environment == "production" ? random_password.redis_auth_token[0].result : ""
    REDIS_TLS = var.environment == "production" ? "true" : "false"
  })

  lifecycle {
    ignore_changes = [secret_string]  # パスワードローテーション対応
  }
}

# CloudWatch Alarms for ElastiCache
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "Redis CPU utilization is too high"
  alarm_actions       = []  # SNS Topic ARN を設定

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Redis memory usage is too high"
  alarm_actions       = []  # SNS Topic ARN を設定

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-memory-alarm"
  }
}
