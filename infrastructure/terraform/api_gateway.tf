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
  name            = "${var.app_name}-cognito-authorizer-${var.environment}"
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [aws_cognito_user_pool.main.arn]
  rest_api_id     = aws_api_gateway_rest_api.main.id
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
  authorization = "NONE"
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

resource "aws_api_gateway_method_response" "get_user_data_400" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.get_user_data.http_method
  status_code = "400"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_method_response" "get_user_data_500" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.get_user_data.http_method
  status_code = "500"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# POST /user-data/{settlement_id} - Save user data
resource "aws_api_gateway_method" "save_user_data" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.user_data_settlement.id
  http_method   = "POST"
  authorization = "NONE"
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

resource "aws_api_gateway_method_response" "save_user_data_400" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.save_user_data.http_method
  status_code = "400"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_method_response" "save_user_data_500" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.save_user_data.http_method
  status_code = "500"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# DELETE /user-data/{settlement_id} - Delete user data
resource "aws_api_gateway_method" "delete_user_data" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.user_data_settlement.id
  http_method   = "DELETE"
  authorization = "NONE"
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

resource "aws_api_gateway_method_response" "delete_user_data_400" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.delete_user_data.http_method
  status_code = "400"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_method_response" "delete_user_data_500" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.delete_user_data.http_method
  status_code = "500"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# OPTIONS method for CORS preflight requests on /user-data/{settlement_id}
resource "aws_api_gateway_method" "cors_settlement" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.user_data_settlement.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "cors_settlement" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.cors_settlement.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "cors_settlement" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.cors_settlement.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "cors_settlement" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.cors_settlement.http_method
  status_code = aws_api_gateway_method_response.cors_settlement.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Add CORS headers to GET method response
resource "aws_api_gateway_method_response" "get_user_data_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.get_user_data.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "get_user_data_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.get_user_data.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }
}

# Add CORS headers to POST method response
resource "aws_api_gateway_method_response" "save_user_data_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.save_user_data.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "save_user_data_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.save_user_data.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }
}

# Add CORS headers to DELETE method response
resource "aws_api_gateway_method_response" "delete_user_data_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.delete_user_data.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "delete_user_data_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.delete_user_data.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }
}


# Add 401/403 auth error responses with CORS headers for GET
resource "aws_api_gateway_method_response" "get_user_data_401" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.get_user_data.http_method
  status_code = "401"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_method_response" "get_user_data_403" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.get_user_data.http_method
  status_code = "403"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# Add 401/403 auth error responses with CORS headers for POST
resource "aws_api_gateway_method_response" "save_user_data_401" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.save_user_data.http_method
  status_code = "401"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_method_response" "save_user_data_403" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.save_user_data.http_method
  status_code = "403"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# Add 401/403 auth error responses with CORS headers for DELETE
resource "aws_api_gateway_method_response" "delete_user_data_401" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.delete_user_data.http_method
  status_code = "401"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_method_response" "delete_user_data_403" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_data_settlement.id
  http_method = aws_api_gateway_method.delete_user_data.http_method
  status_code = "403"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# Add CORS headers to all error responses (Gateway Response)
resource "aws_api_gateway_gateway_response" "unauthorized" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "UNAUTHORIZED"
  status_code   = "401"
  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
  }
}

resource "aws_api_gateway_gateway_response" "access_denied" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "ACCESS_DENIED"
  status_code   = "403"
  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
  }
}

resource "aws_api_gateway_gateway_response" "missing_authentication_token" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "MISSING_AUTHENTICATION_TOKEN"
  status_code   = "403"
  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
  }
}

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
