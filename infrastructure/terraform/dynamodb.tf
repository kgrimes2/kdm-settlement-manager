# DynamoDB table for user settlement data
resource "aws_dynamodb_table" "user_data" {
  name         = "${var.app_name}-user-data-${var.environment}"
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "user_id"
  range_key    = "settlement_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "settlement_id"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = false
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.app_name}-user-data-table"
  }
}

# DynamoDB table for user settings/preferences
resource "aws_dynamodb_table" "user_settings" {
  name         = "${var.app_name}-user-settings-${var.environment}"
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.app_name}-user-settings-table"
  }
}
