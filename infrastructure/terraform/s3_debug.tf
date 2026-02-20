# S3 bucket for storing debug submissions from users
# Debug submissions are automatically deleted after 30 days via lifecycle policy

resource "aws_s3_bucket" "debug_submissions" {
  bucket = "${var.app_name}-${var.environment}-debug-submissions-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.app_name}-debug-submissions"
    Environment = var.environment
  }
}

# Lifecycle policy to delete submissions after 30 days
resource "aws_s3_bucket_lifecycle_configuration" "debug_submissions_lifecycle" {
  bucket = aws_s3_bucket.debug_submissions.id

  rule {
    id     = "delete-old-submissions"
    status = "Enabled"

    filter {
      # Apply to all objects in the bucket
    }

    expiration {
      days = 30
    }
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "debug_submissions_sse" {
  bucket = aws_s3_bucket.debug_submissions.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "debug_submissions_pab" {
  bucket = aws_s3_bucket.debug_submissions.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
