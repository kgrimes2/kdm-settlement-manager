variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "aws_profile" {
  description = "AWS CLI profile to use. Leave empty to use the default credential chain (e.g. instance role on Cloud9)."
  type        = string
  default     = ""
}

variable "environment" {
  description = "Environment name (dev or prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = can(regex("^(dev|prod)$", var.environment))
    error_message = "Environment must be dev or prod."
  }
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "kdm-settlement-manager"
}

variable "cognito_callback_urls" {
  description = "Cognito app callback URLs"
  type        = list(string)
  default     = ["http://localhost:5173"]
}

variable "cognito_logout_urls" {
  description = "Cognito app logout URLs"
  type        = list(string)
  default     = ["http://localhost:5173"]
}

variable "cognito_allowed_oauth_flows" {
  description = "Cognito allowed OAuth flows"
  type        = list(string)
  default     = ["code", "implicit"]
}

variable "cognito_allowed_oauth_scopes" {
  description = "Cognito allowed OAuth scopes"
  type        = list(string)
  default     = ["email", "openid", "profile"]
}

variable "password_minimum_length" {
  description = "Minimum password length for Cognito"
  type        = number
  default     = 12

  validation {
    condition     = var.password_minimum_length >= 6 && var.password_minimum_length <= 99
    error_message = "Password minimum length must be between 6 and 99."
  }
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30

  validation {
    condition     = var.lambda_timeout >= 3 && var.lambda_timeout <= 900
    error_message = "Lambda timeout must be between 3 and 900 seconds."
  }
}

variable "lambda_memory" {
  description = "Lambda function memory in MB"
  type        = number
  default     = 256

  validation {
    condition     = var.lambda_memory >= 128 && var.lambda_memory <= 10240
    error_message = "Lambda memory must be between 128 and 10240 MB."
  }
}

variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode (PROVISIONED or PAY_PER_REQUEST)"
  type        = string
  default     = "PAY_PER_REQUEST"

  validation {
    condition     = can(regex("^(PROVISIONED|PAY_PER_REQUEST)$", var.dynamodb_billing_mode))
    error_message = "DynamoDB billing mode must be PROVISIONED or PAY_PER_REQUEST."
  }
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins for API Gateway. Use '*' for development, specific domains for production."
  type        = list(string)
  default     = ["*"]
}

variable "root_domain" {
  description = "Root domain name (registered in Route53)"
  type        = string
  default     = "rollinglanterns.com"
}

# App is always served at <host>/app/
# prod:    rollinglanterns.com/app
# staging: staging.rollinglanterns.com/app
locals {
  # The CloudFront alias (hostname only — no path)
  # prod    -> rollinglanterns.com
  # staging -> staging.rollinglanterns.com
  app_host = var.environment == "prod" ? var.root_domain : "staging.${var.root_domain}"

  # Full URL base for the app
  app_base_url = "https://${local.app_host}/app"

  # For prod, default CORS to the app origin; for staging keep wildcard unless overridden.
  effective_cors_origins = length(var.cors_allowed_origins) > 0 && var.cors_allowed_origins != ["*"] ? var.cors_allowed_origins : (
    var.environment == "prod" ? ["https://${local.app_host}"] : ["*"]
  )

  # Formatted for API Gateway integration response parameters (single-quoted CSV)
  cors_origin_header = "'${join(",", local.effective_cors_origins)}'"

  # Cognito callback/logout URLs — always include localhost for local dev,
  # plus the deployed URL for the current environment.
  cognito_callback_urls = length(var.cognito_callback_urls) > 0 ? var.cognito_callback_urls : [
    "http://localhost:5173/app",
    local.app_base_url,
  ]

  cognito_logout_urls = length(var.cognito_logout_urls) > 0 ? var.cognito_logout_urls : [
    "http://localhost:5173/app",
    local.app_base_url,
  ]
}
