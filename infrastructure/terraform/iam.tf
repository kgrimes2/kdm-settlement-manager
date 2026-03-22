# IAM role for Lambda functions
resource "aws_iam_role" "lambda_role" {
  name = "${var.app_name}-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda basic execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Policy for DynamoDB access
resource "aws_iam_role_policy" "lambda_dynamodb_policy" {
  name = "${var.app_name}-lambda-dynamodb-policy-${var.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.user_data.arn,
          "${aws_dynamodb_table.user_data.arn}/index/*",
          aws_dynamodb_table.user_settings.arn,
        ]
      }
    ]
  })
}

# Policy for Cognito authorization
resource "aws_iam_role_policy" "lambda_cognito_policy" {
  name = "${var.app_name}-lambda-cognito-policy-${var.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:GetUser",
          "cognito-idp:AdminGetUser"
        ]
        Resource = aws_cognito_user_pool.main.arn
      }
    ]
  })
}

# Policy for S3 debug bucket access
resource "aws_iam_role_policy" "lambda_s3_debug_policy" {
  name = "${var.app_name}-lambda-s3-debug-policy-${var.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl"
        ]
        Resource = "${aws_s3_bucket.debug_submissions.arn}/*"
      }
    ]
  })
}

# Policy for S3 user data bucket access (for large settlements >400KB)
resource "aws_iam_role_policy" "lambda_s3_user_data_policy" {
  name = "${var.app_name}-lambda-s3-user-data-policy-${var.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.user_data.arn}/*",
          aws_s3_bucket.user_data.arn
        ]
      }
    ]
  })
}

# API Gateway execution role
resource "aws_iam_role" "api_gateway_role" {
  name = "${var.app_name}-api-gateway-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}

# Policy for API Gateway to invoke Lambda
resource "aws_iam_role_policy" "api_gateway_lambda_invoke" {
  name = "${var.app_name}-api-gateway-lambda-invoke-${var.environment}"
  role = aws_iam_role.api_gateway_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          aws_lambda_function.get_user_data.arn,
          aws_lambda_function.save_user_data.arn,
          aws_lambda_function.delete_user_data.arn,
          aws_lambda_function.submit_debug_info.arn
        ]
      }
    ]
  })
}
