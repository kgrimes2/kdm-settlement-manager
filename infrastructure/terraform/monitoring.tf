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

# NOTE: CloudWatch Alarms are defined in alarms.tf

# Dashboard for monitoring
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.app_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      # Row 1: Lambda Performance Overview
      {
        type   = "metric"
        width  = 12
        height = 6
        x      = 0
        y      = 0
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", { stat = "Sum", label = "Total Invocations" }],
            [".", "Errors", { stat = "Sum", label = "Errors", color = "#d62728" }],
            [".", "Throttles", { stat = "Sum", label = "Throttles", color = "#ff7f0e" }],
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Lambda Invocations & Errors"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        x      = 12
        y      = 0
        properties = {
          metrics = [
            ["AWS/Lambda", "Duration", { stat = "Average", label = "Avg Duration" }],
            ["...", { stat = "Maximum", label = "Max Duration", color = "#d62728" }],
            ["...", { stat = "Minimum", label = "Min Duration", color = "#2ca02c" }],
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Lambda Duration (ms)"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },

      # Row 2: Individual Lambda Functions
      {
        type   = "metric"
        width  = 8
        height = 6
        x      = 0
        y      = 6
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", { stat = "Sum", label = "Invocations" }],
            [".", "Errors", { stat = "Sum", label = "Errors", color = "#d62728" }],
            [".", "Duration", { stat = "Average", label = "Duration (ms)", yAxis = "right" }],
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "get_user_data Function"
          yAxis = {
            left = {
              min = 0
            }
            right = {
              min = 0
            }
          }
          view = "timeSeries"
          annotations = {
            horizontal = [
              {
                label = "Timeout Threshold"
                value = var.lambda_timeout * 1000 * 0.8
                fill  = "above"
                color = "#d62728"
              }
            ]
          }
        }
      },
      {
        type   = "metric"
        width  = 8
        height = 6
        x      = 8
        y      = 6
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", { stat = "Sum", label = "Invocations", dimensions = { FunctionName = aws_lambda_function.save_user_data.function_name } }],
            [".", "Errors", { stat = "Sum", label = "Errors", color = "#d62728", dimensions = { FunctionName = aws_lambda_function.save_user_data.function_name } }],
            [".", "Duration", { stat = "Average", label = "Duration (ms)", yAxis = "right", dimensions = { FunctionName = aws_lambda_function.save_user_data.function_name } }],
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "save_user_data Function"
          yAxis = {
            left = {
              min = 0
            }
            right = {
              min = 0
            }
          }
          view = "timeSeries"
          annotations = {
            horizontal = [
              {
                label = "Timeout Threshold"
                value = var.lambda_timeout * 1000 * 0.8
                fill  = "above"
                color = "#d62728"
              }
            ]
          }
        }
      },
      {
        type   = "metric"
        width  = 8
        height = 6
        x      = 16
        y      = 6
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", { stat = "Sum", label = "Invocations", dimensions = { FunctionName = aws_lambda_function.delete_user_data.function_name } }],
            [".", "Errors", { stat = "Sum", label = "Errors", color = "#d62728", dimensions = { FunctionName = aws_lambda_function.delete_user_data.function_name } }],
            [".", "Duration", { stat = "Average", label = "Duration (ms)", yAxis = "right", dimensions = { FunctionName = aws_lambda_function.delete_user_data.function_name } }],
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "delete_user_data Function"
          yAxis = {
            left = {
              min = 0
            }
            right = {
              min = 0
            }
          }
          view = "timeSeries"
        }
      },

      # Row 3: DynamoDB Performance
      {
        type   = "metric"
        width  = 12
        height = 6
        x      = 0
        y      = 12
        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", { stat = "Sum", label = "Read Capacity", dimensions = { TableName = aws_dynamodb_table.user_data.name } }],
            [".", "ConsumedWriteCapacityUnits", { stat = "Sum", label = "Write Capacity", dimensions = { TableName = aws_dynamodb_table.user_data.name } }],
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "DynamoDB Capacity Units"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        x      = 12
        y      = 12
        properties = {
          metrics = [
            ["AWS/DynamoDB", "SuccessfulRequestLatency", { stat = "Average", label = "Avg Latency (ms)", dimensions = { TableName = aws_dynamodb_table.user_data.name, Operation = "GetItem" } }],
            ["...", { stat = "Maximum", label = "Max Latency (ms)", color = "#d62728", dimensions = { TableName = aws_dynamodb_table.user_data.name, Operation = "GetItem" } }],
            ["...", { dimensions = { TableName = aws_dynamodb_table.user_data.name, Operation = "PutItem" }, stat = "Average", label = "PutItem Avg" }],
            ["...", { dimensions = { TableName = aws_dynamodb_table.user_data.name, Operation = "PutItem" }, stat = "Maximum", label = "PutItem Max", color = "#ff7f0e" }],
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "DynamoDB Request Latency"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },

      # Row 4: API Gateway
      {
        type   = "metric"
        width  = 12
        height = 6
        x      = 0
        y      = 18
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Count", { stat = "Sum", label = "Total Requests", dimensions = { ApiName = "${var.app_name}-${var.environment}" } }],
            [".", "4XXError", { stat = "Sum", label = "4XX Errors", color = "#ff7f0e", dimensions = { ApiName = "${var.app_name}-${var.environment}" } }],
            [".", "5XXError", { stat = "Sum", label = "5XX Errors", color = "#d62728", dimensions = { ApiName = "${var.app_name}-${var.environment}" } }],
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "API Gateway Requests & Errors"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        x      = 12
        y      = 18
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Latency", { stat = "Average", label = "Avg Latency (ms)", dimensions = { ApiName = "${var.app_name}-${var.environment}" } }],
            ["...", { stat = "p99", label = "P99 Latency", color = "#d62728", dimensions = { ApiName = "${var.app_name}-${var.environment}" } }],
            [".", "IntegrationLatency", { stat = "Average", label = "Backend Latency", dimensions = { ApiName = "${var.app_name}-${var.environment}" } }],
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "API Gateway Latency"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },

      # Row 5: CloudFront (if applicable)
      {
        type   = "metric"
        width  = 12
        height = 6
        x      = 0
        y      = 24
        properties = {
          metrics = [
            ["AWS/CloudFront", "Requests", { stat = "Sum", label = "Total Requests", dimensions = { DistributionId = aws_cloudfront_distribution.app_distribution.id } }],
            [".", "BytesDownloaded", { stat = "Sum", label = "Bytes Downloaded", yAxis = "right", dimensions = { DistributionId = aws_cloudfront_distribution.app_distribution.id } }],
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1" # CloudFront metrics are always in us-east-1
          title  = "CloudFront Traffic"
          yAxis = {
            left = {
              min = 0
            }
            right = {
              min = 0
            }
          }
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        x      = 12
        y      = 24
        properties = {
          metrics = [
            ["AWS/CloudFront", "4xxErrorRate", { stat = "Average", label = "4XX Error Rate (%)", dimensions = { DistributionId = aws_cloudfront_distribution.app_distribution.id } }],
            [".", "5xxErrorRate", { stat = "Average", label = "5XX Error Rate (%)", color = "#d62728", dimensions = { DistributionId = aws_cloudfront_distribution.app_distribution.id } }],
            [".", "TotalErrorRate", { stat = "Average", label = "Total Error Rate (%)", color = "#ff7f0e", dimensions = { DistributionId = aws_cloudfront_distribution.app_distribution.id } }],
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          title  = "CloudFront Error Rates"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },

      # Row 6: Cognito
      {
        type   = "metric"
        width  = 12
        height = 6
        x      = 0
        y      = 30
        properties = {
          metrics = [
            ["AWS/Cognito", "SignInSuccesses", { stat = "Sum", label = "Sign-In Successes", dimensions = { UserPool = aws_cognito_user_pool.main.id } }],
            [".", "SignInFailures", { stat = "Sum", label = "Sign-In Failures", color = "#d62728", dimensions = { UserPool = aws_cognito_user_pool.main.id } }],
            [".", "SignUpSuccesses", { stat = "Sum", label = "Sign-Up Successes", dimensions = { UserPool = aws_cognito_user_pool.main.id } }],
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Cognito User Activity"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        x      = 12
        y      = 30
        properties = {
          metrics = [
            ["AWS/Cognito", "TokenRefreshSuccesses", { stat = "Sum", label = "Token Refresh Success", dimensions = { UserPool = aws_cognito_user_pool.main.id } }],
            [".", "TokenRefreshFailures", { stat = "Sum", label = "Token Refresh Failures", color = "#d62728", dimensions = { UserPool = aws_cognito_user_pool.main.id } }],
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Cognito Token Activity"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },

      # Row 7: Lambda Concurrent Executions
      {
        type   = "metric"
        width  = 24
        height = 6
        x      = 0
        y      = 36
        properties = {
          metrics = [
            ["AWS/Lambda", "ConcurrentExecutions", { stat = "Maximum", label = "get_user_data", dimensions = { FunctionName = aws_lambda_function.get_user_data.function_name } }],
            ["...", { dimensions = { FunctionName = aws_lambda_function.save_user_data.function_name }, label = "save_user_data" }],
            ["...", { dimensions = { FunctionName = aws_lambda_function.delete_user_data.function_name }, label = "delete_user_data" }],
          ]
          period = 60
          stat   = "Maximum"
          region = var.aws_region
          title  = "Lambda Concurrent Executions"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },

      # Row 8: Error Rate Percentage
      {
        type   = "metric"
        width  = 24
        height = 6
        x      = 0
        y      = 42
        properties = {
          metrics = [
            [{ expression = "m1/m2*100", label = "Lambda Error Rate (%)", id = "e1", color = "#d62728" }],
            ["AWS/Lambda", "Errors", { id = "m1", stat = "Sum", visible = false }],
            [".", "Invocations", { id = "m2", stat = "Sum", visible = false }],
            [{ expression = "m3/(m3+m4)*100", label = "API 4XX Rate (%)", id = "e2", color = "#ff7f0e" }],
            ["AWS/ApiGateway", "4XXError", { id = "m3", stat = "Sum", visible = false, dimensions = { ApiName = "${var.app_name}-${var.environment}" } }],
            [".", "Count", { id = "m4", stat = "Sum", visible = false, dimensions = { ApiName = "${var.app_name}-${var.environment}" } }],
            [{ expression = "m5/(m5+m6)*100", label = "API 5XX Rate (%)", id = "e3", color = "#8c564b" }],
            ["AWS/ApiGateway", "5XXError", { id = "m5", stat = "Sum", visible = false, dimensions = { ApiName = "${var.app_name}-${var.environment}" } }],
            [".", "Count", { id = "m6", stat = "Sum", visible = false, dimensions = { ApiName = "${var.app_name}-${var.environment}" } }],
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Overall Error Rates (%)"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
          annotations = {
            horizontal = [
              {
                label = "Target < 1%"
                value = 1
                color = "#2ca02c"
              },
              {
                label = "Warning > 5%"
                value = 5
                fill  = "above"
                color = "#ff7f0e"
              }
            ]
          }
        }
      },

      # Row 9: Cost Estimation (Read/Write Units)
      {
        type   = "metric"
        width  = 24
        height = 6
        x      = 0
        y      = 48
        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", { stat = "Sum", label = "DynamoDB Reads", dimensions = { TableName = aws_dynamodb_table.user_data.name } }],
            [".", "ConsumedWriteCapacityUnits", { stat = "Sum", label = "DynamoDB Writes", dimensions = { TableName = aws_dynamodb_table.user_data.name } }],
            ["AWS/Lambda", "Invocations", { stat = "Sum", label = "Lambda Invocations" }],
            ["AWS/ApiGateway", "Count", { stat = "Sum", label = "API Requests", dimensions = { ApiName = "${var.app_name}-${var.environment}" } }],
          ]
          period = 3600 # 1 hour
          stat   = "Sum"
          region = var.aws_region
          title  = "Usage Metrics (for cost estimation)"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
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

# SNS topic output moved to alarms.tf
