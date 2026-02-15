# CDCP Infrastructure - Main Configuration
# Terraform v1.6+ required

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Terraform State管理 (S3 Backend)
  # 初回実行前に手動で S3 バケット作成が必要
  backend "s3" {
    bucket         = "cdcp-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "cdcp-terraform-locks"
  }
}

# AWS Provider設定
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "CDCP"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
    }
  }
}

# データソース
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}
