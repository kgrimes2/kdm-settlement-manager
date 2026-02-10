output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = aws_cognito_user_pool_client.main.id
  sensitive   = true
}

output "cognito_domain" {
  description = "Cognito domain for authorization endpoint"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "cognito_authorization_url" {
  description = "Cognito authorization endpoint"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com/oauth2/authorize"
}

output "cognito_token_url" {
  description = "Cognito token endpoint"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com/oauth2/token"
}

output "dynamodb_user_data_table_name" {
  description = "DynamoDB table name for user data"
  value       = aws_dynamodb_table.user_data.name
}

output "dynamodb_user_data_table_arn" {
  description = "DynamoDB table ARN for user data"
  value       = aws_dynamodb_table.user_data.arn
}

output "api_gateway_invoke_url" {
  description = "API Gateway invoke URL"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "lambda_function_names" {
  description = "Lambda function names"
  value = {
    get_user_data    = aws_lambda_function.get_user_data.function_name
    save_user_data   = aws_lambda_function.save_user_data.function_name
    delete_user_data = aws_lambda_function.delete_user_data.function_name
  }
}

output "backup_vault_name" {
  description = "AWS Backup vault name for DynamoDB backups"
  value       = aws_backup_vault.dynamodb.name
}

output "backup_plan_name" {
  description = "AWS Backup plan name for DynamoDB"
  value       = aws_backup_plan.dynamodb.name
}

output "backup_s3_bucket" {
  description = "S3 bucket for DynamoDB backups"
  value       = aws_s3_bucket.dynamodb_backups.id
}

output "backup_s3_bucket_arn" {
  description = "S3 bucket ARN for DynamoDB backups"
  value       = aws_s3_bucket.dynamodb_backups.arn
}
