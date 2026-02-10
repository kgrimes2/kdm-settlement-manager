# S3 Bucket for DynamoDB backups
resource "aws_s3_bucket" "dynamodb_backups" {
  bucket = "${var.app_name}-dynamodb-backups-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${var.app_name}-dynamodb-backups"
  }
}

# Enable versioning for backup recovery
resource "aws_s3_bucket_versioning" "dynamodb_backups" {
  bucket = aws_s3_bucket.dynamodb_backups.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "dynamodb_backups" {
  bucket = aws_s3_bucket.dynamodb_backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "dynamodb_backups" {
  bucket = aws_s3_bucket.dynamodb_backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy to manage backup retention
resource "aws_s3_bucket_lifecycle_configuration" "dynamodb_backups" {
  bucket = aws_s3_bucket.dynamodb_backups.id

  rule {
    id     = "delete-old-backups"
    status = "Enabled"
    filter {}

    # Keep backups for 90 days
    expiration {
      days = 90
    }

    # Transition to Glacier after 30 days for cost savings
    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# IAM role for backup service
resource "aws_iam_role" "backup_role" {
  name = "${var.app_name}-backup-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
}

# Attach backup policy
resource "aws_iam_role_policy_attachment" "backup_policy" {
  role       = aws_iam_role.backup_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

# AWS Backup Vault
resource "aws_backup_vault" "dynamodb" {
  name = "${var.app_name}-backup-vault-${var.environment}"

  tags = {
    Name = "${var.app_name}-backup-vault"
  }
}

# AWS Backup Plan for DynamoDB
resource "aws_backup_plan" "dynamodb" {
  name = "${var.app_name}-backup-plan-${var.environment}"

  rule {
    rule_name             = "daily_backups"
    target_vault_name     = aws_backup_vault.dynamodb.name
    schedule              = "cron(0 5 ? * * *)"  # 5 AM UTC daily

    lifecycle {
      delete_after = 30  # Keep daily backups for 30 days
    }

    recovery_point_tags = {
      BackupType = "Daily"
    }
  }

  rule {
    rule_name             = "weekly_backups"
    target_vault_name     = aws_backup_vault.dynamodb.name
    schedule              = "cron(0 6 ? * SUN *)"  # Sundays at 6 AM UTC

    lifecycle {
      delete_after = 90  # Keep weekly backups for 90 days
    }

    recovery_point_tags = {
      BackupType = "Weekly"
    }
  }

  tags = {
    Name = "${var.app_name}-backup-plan"
  }
}

# Backup Selection for DynamoDB tables
resource "aws_backup_selection" "dynamodb" {
  name         = "${var.app_name}-backup-selection-${var.environment}"
  plan_id      = aws_backup_plan.dynamodb.id
  iam_role_arn = aws_iam_role.backup_role.arn

  resources = [
    aws_dynamodb_table.user_data.arn,
    aws_dynamodb_table.user_settings.arn,
  ]
}

# CloudWatch Alarm for backup failures
resource "aws_cloudwatch_metric_alarm" "backup_failures" {
  alarm_name          = "${var.app_name}-backup-failures-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "FailedBackupJobs"
  namespace           = "AWS/Backup"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "Alert when DynamoDB backup jobs fail"
  treat_missing_data  = "notBreaching"
}
