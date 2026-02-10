# API Gateway REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.app_name}-api-${var.environment}"
  description = "KDM Settlement Manager API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = "${var.app_name}-api"
  }
}

# Cognito Authorizer for API Gateway
resource "aws_api_gateway_authorizer" "cognito" {
  name          = "${var.app_name}-cognito-authorizer-${var.environment}"
  type          = "COGNITO_USER_POOLS"
  provider_arns = [aws_cognito_user_pool.main.arn]
  rest_api_id   = aws_api_gateway_rest_api.main.id

  identity_source = "method.request.header.Authorization"
}

# API Gateway Resource - /user-data
resource "aws_api_gateway_resource" "user_data" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "user-data"
}

# API Gateway Resource - /user-data/{settlement_id}
resource "aws_api_gateway_resource" "user_data_settlement" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.user_data.id
  path_part   = "{settlement_id}"
}

# GET /user-data/{settlement_id} - Get user data
resource "aws_api_gateway_method" "get_user_data" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.user_data_settlement.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  request_parameters = {
    "method.request.path.settlement_id" = true
  }
}

resource "aws_api_gateway_integration" "get_user_data" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.user_data_settlement.id
  http_method             = aws_api_gateway_method.get_user_data.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.get_user_data.invoke_arn
}

# POST /user-data/{settlement_id} - Save user data
resource "aws_api_gateway_method" "save_user_data" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.user_data_settlement.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  request_parameters = {
    "method.request.path.settlement_id" = true
  }
}

resource "aws_api_gateway_integration" "save_user_data" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.user_data_settlement.id
  http_method             = aws_api_gateway_method.save_user_data.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.save_user_data.invoke_arn
}

# DELETE /user-data/{settlement_id} - Delete user data
resource "aws_api_gateway_method" "delete_user_data" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.user_data_settlement.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  request_parameters = {
    "method.request.path.settlement_id" = true
  }
}

resource "aws_api_gateway_integration" "delete_user_data" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.user_data_settlement.id
  http_method             = aws_api_gateway_method.delete_user_data.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.delete_user_data.invoke_arn
}

# Lambda permissions for API Gateway invocation
resource "aws_lambda_permission" "api_gateway_get" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_user_data.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_save" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.save_user_data.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_delete" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_user_data.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# API Gateway Stage
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  tags = {
    Name = "${var.app_name}-api-stage"
  }
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  depends_on = [
    aws_api_gateway_integration.get_user_data,
    aws_api_gateway_integration.save_user_data,
    aws_api_gateway_integration.delete_user_data,
  ]
}
