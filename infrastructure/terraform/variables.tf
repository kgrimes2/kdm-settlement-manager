variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod."
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
