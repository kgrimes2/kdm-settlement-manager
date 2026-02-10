# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name             = "${var.app_name}-${var.environment}"
  alias_attributes = ["email", "preferred_username"]

  # Password policy
  password_policy {
    minimum_length    = var.password_minimum_length
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # Account recovery settings
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Auto-verify email attribute
  auto_verified_attributes = ["email"]

  # MFA configuration
  mfa_configuration = "OPTIONAL"

  # Software token MFA
  software_token_mfa_configuration {
    enabled = true
  }

  # User pool tags
  tags = {
    Name = "${var.app_name}-user-pool"
  }
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.app_name}-${var.environment}-${data.aws_caller_identity.current.account_id}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name                = "${var.app_name}-${var.environment}-client"
  user_pool_id        = aws_cognito_user_pool.main.id
  generate_secret     = false
  explicit_auth_flows = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH"]

  allowed_oauth_flows                  = var.cognito_allowed_oauth_flows
  allowed_oauth_scopes                 = var.cognito_allowed_oauth_scopes
  allowed_oauth_flows_user_pool_client = true

  callback_urls = var.cognito_callback_urls
  logout_urls   = var.cognito_logout_urls

  supported_identity_providers = ["COGNITO"]

  prevent_user_existence_errors = "ENABLED"

  # Token validity periods (in hours)
  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Enable token revocation
  enable_token_revocation = true
}

# Resource Server (optional - for defining API scopes)
resource "aws_cognito_resource_server" "main" {
  identifier   = "kdm-api"
  name         = "KDM Settlement Manager API"
  user_pool_id = aws_cognito_user_pool.main.id

  scope {
    scope_name        = "read"
    scope_description = "Read user data"
  }

  scope {
    scope_name        = "write"
    scope_description = "Write user data"
  }

  scope {
    scope_name        = "delete"
    scope_description = "Delete user data"
  }
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}
