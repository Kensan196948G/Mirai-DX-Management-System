# CDCP Infrastructure - RDS PostgreSQL

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.data[*].id

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

# Security Group for RDS
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

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  }
}

# DB Parameter Group
resource "aws_db_parameter_group" "main" {
  name   = "${var.project_name}-${var.environment}-pg15-params"
  family = "postgres15"

  # PostGIS有効化
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,postgis"
  }

  # ログ設定
  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # 1秒以上のクエリをログ
  }

  # 接続設定
  parameter {
    name  = "max_connections"
    value = "100"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-pg-params"
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"

  # Engine
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = var.rds_instance_class
  allocated_storage    = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id           = aws_kms_key.rds.arn

  # Database
  db_name  = "${var.project_name}_${var.environment}"
  username = "cdcp_admin"
  password = var.database_master_password
  port     = 5432

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # High Availability
  multi_az               = var.rds_multi_az
  availability_zone      = var.rds_multi_az ? null : data.aws_availability_zones.available.names[0]

  # Backup
  backup_retention_period = var.rds_backup_retention_period
  backup_window           = "03:00-04:00"  # JST 12:00-13:00
  maintenance_window      = "mon:04:00-mon:05:00"  # JST 月曜13:00-14:00
  copy_tags_to_snapshot   = true
  skip_final_snapshot     = var.environment == "staging" ? true : false
  final_snapshot_identifier = var.environment == "staging" ? null : "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYYMMDD-hhmmss", timestamp())}"

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval              = 60
  monitoring_role_arn              = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled     = true
  performance_insights_retention_period = 7

  # Deletion Protection
  deletion_protection = var.rds_deletion_protection

  # Parameter Group
  parameter_group_name = aws_db_parameter_group.main.name

  # Auto Minor Version Upgrade
  auto_minor_version_upgrade = false

  tags = {
    Name = "${var.project_name}-${var.environment}-rds"
  }

  lifecycle {
    ignore_changes = [
      password,  # パスワード変更を無視
      final_snapshot_identifier  # タイムスタンプ変更を無視
    ]
  }
}

# RDS Read Replica (本番環境のみ、Phase2+)
resource "aws_db_instance" "read_replica" {
  count = var.environment == "production" ? 1 : 0

  identifier           = "${var.project_name}-${var.environment}-db-ro"
  replicate_source_db  = aws_db_instance.main.identifier
  instance_class       = var.rds_instance_class
  publicly_accessible  = false
  skip_final_snapshot  = true
  storage_encrypted    = true
  kms_key_id           = aws_kms_key.rds.arn

  # Monitoring
  monitoring_interval   = 60
  monitoring_role_arn   = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-read-replica"
  }
}

# KMS Key for RDS Encryption
resource "aws_kms_key" "rds" {
  description             = "${var.project_name}-${var.environment} RDS encryption key"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-kms"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.project_name}-${var.environment}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project_name}-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-monitoring-role"
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Secrets Manager for Database Credentials
resource "aws_secretsmanager_secret" "database" {
  name                    = "${var.project_name}-${var.environment}-database-credentials"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-database-secret"
  }
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id

  secret_string = jsonencode({
    DATABASE_URL = "postgresql://${aws_db_instance.main.username}:${var.database_master_password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
    DATABASE_HOST = aws_db_instance.main.address
    DATABASE_PORT = aws_db_instance.main.port
    DATABASE_NAME = aws_db_instance.main.db_name
    DATABASE_USER = aws_db_instance.main.username
    DATABASE_PASSWORD = var.database_master_password
  })

  lifecycle {
    ignore_changes = [secret_string]  # パスワードローテーション対応
  }
}

# CloudWatch Alarms for RDS
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization is too high"
  alarm_actions       = []  # SNS Topic ARN を設定

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240  # 10GB
  alarm_description   = "RDS free storage space is low"
  alarm_actions       = []  # SNS Topic ARN を設定

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-storage-alarm"
  }
}
