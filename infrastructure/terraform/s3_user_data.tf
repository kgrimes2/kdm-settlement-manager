# S3 bucket for storing large user settlement data (>400KB)
# When settlement data exceeds DynamoDB's 400KB limit, it's stored here
# DynamoDB stores metadata and reference to S3 object

resource "aws_s3_bucket" "user_data" {
  bucket = "${var.app_name}-${var.environment}-user-data-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.app_name}-user-data"
    Environment = var.environment
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "user_data_sse" {
  bucket = aws_s3_bucket.user_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "user_data_pab" {
  bucket = aws_s3_bucket.user_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning for data protection
resource "aws_s3_bucket_versioning" "user_data_versioning" {
  bucket = aws_s3_bucket.user_data.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle policy to clean up old (noncurrent) versions after 90 days
# Current objects are NEVER expired - only old versions when a new version is uploaded
resource "aws_s3_bucket_lifecycle_configuration" "user_data_lifecycle" {
  bucket = aws_s3_bucket.user_data.id

  rule {
    id     = "delete-noncurrent-versions"
    status = "Enabled"

    # Apply to all objects
    filter {}

    # Only delete noncurrent (old) versions - current objects remain indefinitely
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
