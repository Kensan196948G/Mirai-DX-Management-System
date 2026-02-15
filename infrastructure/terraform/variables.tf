# CDCP Infrastructure - Variables

variable "environment" {
  description = "Environment name (staging / production)"
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production."
  }
}

variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "cdcp"
}

variable "cost_center" {
  description = "Cost center for billing tags"
  type        = string
}

# --- VPC Configuration ---

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

# --- ECS Configuration ---

variable "ecs_task_cpu" {
  description = "ECS Task CPU (256 = 0.25 vCPU, 512 = 0.5 vCPU, 1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "ecs_task_memory" {
  description = "ECS Task Memory (MB)"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "ECS desired task count"
  type        = number
  default     = 2
}

variable "ecs_auto_scaling_min" {
  description = "ECS Auto Scaling minimum task count"
  type        = number
  default     = 2
}

variable "ecs_auto_scaling_max" {
  description = "ECS Auto Scaling maximum task count"
  type        = number
  default     = 10
}

# --- RDS Configuration ---

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage (GB)"
  type        = number
  default     = 100
}

variable "rds_max_allocated_storage" {
  description = "RDS max allocated storage for autoscaling (GB)"
  type        = number
  default     = 500
}

variable "rds_backup_retention_period" {
  description = "RDS backup retention period (days)"
  type        = number
  default     = 7
}

variable "rds_multi_az" {
  description = "Enable RDS Multi-AZ"
  type        = bool
  default     = true
}

variable "rds_deletion_protection" {
  description = "Enable RDS deletion protection"
  type        = bool
  default     = true
}

# --- ElastiCache Configuration ---

variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "elasticache_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 2
}

# --- S3 Configuration ---

variable "s3_lifecycle_glacier_days" {
  description = "Days before transitioning to Glacier (0 = disabled)"
  type        = number
  default     = 90
}

variable "s3_lifecycle_expiration_days" {
  description = "Days before object expiration (0 = disabled, 3650 = 10 years for compliance)"
  type        = number
  default     = 3650
}

# --- Security ---

variable "allowed_cidr_blocks" {
  description = "Allowed CIDR blocks for ALB access"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # 本番環境では会社IPに制限推奨
}

variable "database_master_password" {
  description = "RDS master password (managed via Secrets Manager)"
  type        = string
  sensitive   = true
}

# --- Monitoring ---

variable "enable_datadog" {
  description = "Enable Datadog integration"
  type        = bool
  default     = true
}

variable "datadog_api_key" {
  description = "Datadog API key"
  type        = string
  sensitive   = true
  default     = ""
}
