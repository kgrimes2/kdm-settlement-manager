# CloudWatch Alarms for Security Monitoring

# SNS Topic for alarm notifications (optional - configure email subscription manually)
resource "aws_sns_topic" "alarms" {
  name = "${var.app_name}-alarms-${var.environment}"

  tags = {
    Name = "${var.app_name}-alarms"
  }
}

# Alarm: High API Gateway Request Count (potential attack)
resource "aws_cloudwatch_metric_alarm" "api_high_request_count" {
  alarm_name          = "${var.app_name}-${var.environment}-high-api-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Count"
  namespace           = "AWS/ApiGateway"
  period              = 300 # 5 minutes
  statistic           = "Sum"
  threshold           = 1000 # 1000 requests in 5 minutes
  alarm_description   = "Alert when API receives unusually high request count"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    ApiId = aws_api_gateway_rest_api.main.id
    Stage = var.environment
  }

  tags = {
    Name = "${var.app_name}-high-api-requests"
  }
}

# Alarm: High API Gateway 4XX Errors
resource "aws_cloudwatch_metric_alarm" "api_high_4xx_errors" {
  alarm_name          = "${var.app_name}-${var.environment}-high-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 50 # 50 4xx errors in 5 minutes
  alarm_description   = "Alert when API returns high 4XX error rate (potential attack/misconfiguration)"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    ApiId = aws_api_gateway_rest_api.main.id
    Stage = var.environment
  }

  tags = {
    Name = "${var.app_name}-high-4xx-errors"
  }
}

# Alarm: High API Gateway 5XX Errors
resource "aws_cloudwatch_metric_alarm" "api_high_5xx_errors" {
  alarm_name          = "${var.app_name}-${var.environment}-high-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10 # 10 5xx errors in 5 minutes
  alarm_description   = "Alert when API returns high 5XX error rate (system issues)"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    ApiId = aws_api_gateway_rest_api.main.id
    Stage = var.environment
  }

  tags = {
    Name = "${var.app_name}-high-5xx-errors"
  }
}

# Alarm: Lambda High Error Rate (get_user_data)
resource "aws_cloudwatch_metric_alarm" "lambda_get_errors" {
  alarm_name          = "${var.app_name}-${var.environment}-lambda-get-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when get_user_data Lambda has high error count"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    FunctionName = aws_lambda_function.get_user_data.function_name
  }

  tags = {
    Name = "${var.app_name}-lambda-get-errors"
  }
}

# Alarm: Lambda High Error Rate (save_user_data)
resource "aws_cloudwatch_metric_alarm" "lambda_save_errors" {
  alarm_name          = "${var.app_name}-${var.environment}-lambda-save-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when save_user_data Lambda has high error count"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    FunctionName = aws_lambda_function.save_user_data.function_name
  }

  tags = {
    Name = "${var.app_name}-lambda-save-errors"
  }
}

# Alarm: Lambda High Error Rate (delete_user_data)
resource "aws_cloudwatch_metric_alarm" "lambda_delete_errors" {
  alarm_name          = "${var.app_name}-${var.environment}-lambda-delete-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when delete_user_data Lambda has high error count"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    FunctionName = aws_lambda_function.delete_user_data.function_name
  }

  tags = {
    Name = "${var.app_name}-lambda-delete-errors"
  }
}

# Alarm: DynamoDB High Consumed Read Capacity
resource "aws_cloudwatch_metric_alarm" "dynamodb_high_read_capacity" {
  alarm_name          = "${var.app_name}-${var.environment}-dynamodb-high-read"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ConsumedReadCapacityUnits"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000 # Adjust based on expected usage
  alarm_description   = "Alert when DynamoDB read capacity is unusually high (potential attack)"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    TableName = aws_dynamodb_table.user_data.name
  }

  tags = {
    Name = "${var.app_name}-dynamodb-high-read"
  }
}

# Alarm: DynamoDB High Consumed Write Capacity
resource "aws_cloudwatch_metric_alarm" "dynamodb_high_write_capacity" {
  alarm_name          = "${var.app_name}-${var.environment}-dynamodb-high-write"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ConsumedWriteCapacityUnits"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 500 # Adjust based on expected usage
  alarm_description   = "Alert when DynamoDB write capacity is unusually high (potential attack/abuse)"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    TableName = aws_dynamodb_table.user_data.name
  }

  tags = {
    Name = "${var.app_name}-dynamodb-high-write"
  }
}

# Alarm: DynamoDB User Errors (throttling, access denied, etc.)
resource "aws_cloudwatch_metric_alarm" "dynamodb_user_errors" {
  alarm_name          = "${var.app_name}-${var.environment}-dynamodb-user-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UserErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alert when DynamoDB encounters user errors (throttling, etc.)"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    TableName = aws_dynamodb_table.user_data.name
  }

  tags = {
    Name = "${var.app_name}-dynamodb-user-errors"
  }
}

# Output SNS topic ARN for manual email subscription
output "alarm_sns_topic_arn" {
  description = "SNS Topic ARN for CloudWatch Alarms. Subscribe your email via AWS Console."
  value       = aws_sns_topic.alarms.arn
}
