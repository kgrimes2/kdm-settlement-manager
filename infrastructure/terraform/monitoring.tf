# CloudWatch monitoring and logging for Lambda functions and API Gateway

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/apigateway/${var.app_name}-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name        = "${var.app_name}-api-logs"
    Environment = var.environment
  }
}

# CloudWatch Log Group for Lambda functions
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.app_name}-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name        = "${var.app_name}-lambda-logs"
    Environment = var.environment
  }
}

# CloudWatch Alarms for Lambda Errors

# Alarm for get_user_data function
resource "aws_cloudwatch_metric_alarm" "lambda_get_errors" {
  alarm_name          = "${var.app_name}-${var.environment}-lambda-get-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = var.environment == "prod" ? 5 : 10
  alarm_description   = "Alert when get_user_data Lambda has errors"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.get_user_data.function_name
  }
}

# Alarm for save_user_data function
resource "aws_cloudwatch_metric_alarm" "lambda_save_errors" {
  alarm_name          = "${var.app_name}-${var.environment}-lambda-save-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = var.environment == "prod" ? 5 : 10
  alarm_description   = "Alert when save_user_data Lambda has errors"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.save_user_data.function_name
  }
}

# Alarm for delete_user_data function
resource "aws_cloudwatch_metric_alarm" "lambda_delete_errors" {
  alarm_name          = "${var.app_name}-${var.environment}-lambda-delete-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = var.environment == "prod" ? 5 : 10
  alarm_description   = "Alert when delete_user_data Lambda has errors"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.delete_user_data.function_name
  }
}

# CloudWatch Alarms for Lambda Duration (timeout detection)

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "${var.app_name}-${var.environment}-lambda-slow-execution"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = var.lambda_timeout * 1000 * 0.8 # 80% of timeout
  alarm_description   = "Alert when Lambda functions run slowly"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.save_user_data.function_name
  }
}

# CloudWatch Alarms for DynamoDB

# DynamoDB throttling alarm
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttle" {
  alarm_name          = "${var.app_name}-${var.environment}-dynamodb-throttle"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "ConsumedWriteCapacityUnits"
  namespace           = "AWS/DynamoDB"
  period              = "60"
  statistic           = "Sum"
  threshold           = 100 # Adjust based on your provisioned capacity
  alarm_description   = "Alert when DynamoDB is being throttled"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts[0].arn] : []
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.user_data.name
  }
}

# SNS Topic for alerts (only for production)
resource "aws_sns_topic" "alerts" {
  count = var.environment == "prod" ? 1 : 0
  name  = "${var.app_name}-${var.environment}-alerts"

  tags = {
    Name        = "${var.app_name}-alerts"
    Environment = var.environment
  }
}

# SNS Topic Subscription (add your email)
# Uncomment and update with your email
/*
resource "aws_sns_topic_subscription" "alerts_email" {
  count     = var.environment == "prod" ? 1 : 0
  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = "your-email@example.com"
}
*/

# Dashboard for monitoring
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.app_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Errors", { stat = "Sum", label = "Lambda Errors" }],
            [".", "Duration", { stat = "Average", label = "Lambda Duration (ms)" }],
            [".", "Invocations", { stat = "Sum", label = "Lambda Invocations" }],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", { stat = "Sum", label = "DynamoDB Writes" }],
            [".", "ConsumedReadCapacityUnits", { stat = "Sum", label = "DynamoDB Reads" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Application Metrics"
        }
      },
      {
        type = "log"
        properties = {
          query  = "fields @timestamp, @message, @logStream | filter @message like /ERROR/ | stats count() by @logStream"
          region = var.aws_region
          title  = "Lambda Errors (Last Hour)"
          width  = 12
          height = 6
        }
      }
    ]
  })
}

# Outputs
output "cloudwatch_log_group_api_gateway" {
  description = "CloudWatch log group for API Gateway"
  value       = aws_cloudwatch_log_group.api_gateway_logs.name
}

output "cloudwatch_log_group_lambda" {
  description = "CloudWatch log group for Lambda functions"
  value       = aws_cloudwatch_log_group.lambda_logs.name
}

output "cloudwatch_dashboard_url" {
  description = "URL to CloudWatch dashboard"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "sns_topic_arn" {
  description = "SNS topic ARN for alerts (production only)"
  value       = var.environment == "prod" ? aws_sns_topic.alerts[0].arn : null
}
