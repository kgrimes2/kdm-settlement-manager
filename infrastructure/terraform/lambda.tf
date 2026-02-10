# Archive Lambda functions
data "archive_file" "get_user_data" {
  type        = "zip"
  source_file = "${path.module}/../lambda/get_user_data.py"
  output_path = "${path.module}/../lambda/get_user_data.zip"
}

data "archive_file" "save_user_data" {
  type        = "zip"
  source_file = "${path.module}/../lambda/save_user_data.py"
  output_path = "${path.module}/../lambda/save_user_data.zip"
}

data "archive_file" "delete_user_data" {
  type        = "zip"
  source_file = "${path.module}/../lambda/delete_user_data.py"
  output_path = "${path.module}/../lambda/delete_user_data.zip"
}

# Lambda function - Get user data
resource "aws_lambda_function" "get_user_data" {
  filename      = data.archive_file.get_user_data.output_path
  function_name = "${var.app_name}-get-user-data-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "get_user_data.lambda_handler"
  runtime       = "python3.11"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory

  source_code_hash = data.archive_file.get_user_data.output_base64sha256

  environment {
    variables = {
      USER_DATA_TABLE = aws_dynamodb_table.user_data.name
      ENVIRONMENT     = var.environment
    }
  }

  tags = {
    Name = "${var.app_name}-get-user-data"
  }

  depends_on = [aws_iam_role_policy.lambda_dynamodb_policy]
}

# Lambda function - Save user data
resource "aws_lambda_function" "save_user_data" {
  filename      = data.archive_file.save_user_data.output_path
  function_name = "${var.app_name}-save-user-data-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "save_user_data.lambda_handler"
  runtime       = "python3.11"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory

  source_code_hash = data.archive_file.save_user_data.output_base64sha256

  environment {
    variables = {
      USER_DATA_TABLE = aws_dynamodb_table.user_data.name
      ENVIRONMENT     = var.environment
    }
  }

  tags = {
    Name = "${var.app_name}-save-user-data"
  }

  depends_on = [aws_iam_role_policy.lambda_dynamodb_policy]
}

# Lambda function - Delete user data
resource "aws_lambda_function" "delete_user_data" {
  filename      = data.archive_file.delete_user_data.output_path
  function_name = "${var.app_name}-delete-user-data-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "delete_user_data.lambda_handler"
  runtime       = "python3.11"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory

  source_code_hash = data.archive_file.delete_user_data.output_base64sha256

  environment {
    variables = {
      USER_DATA_TABLE = aws_dynamodb_table.user_data.name
      ENVIRONMENT     = var.environment
    }
  }

  tags = {
    Name = "${var.app_name}-delete-user-data"
  }

  depends_on = [aws_iam_role_policy.lambda_dynamodb_policy]
}
