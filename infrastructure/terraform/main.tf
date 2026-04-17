terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend config is supplied at init time via -backend-config flags so that
  # the profile can be omitted on Cloud9 (instance role) and supplied locally.
  # See the Makefile init target.
  backend "s3" {
    bucket  = "kdm-terraform-state-469983200708"
    region  = "us-west-2"
    encrypt = true
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile != "" ? var.aws_profile : null

  default_tags {
    tags = {
      Project     = "KDM-Settlement-Manager"
      Environment = var.environment
      Terraform   = "true"
      CreatedBy   = "terraform"
    }
  }
}

# ACM certificates for CloudFront must be created in us-east-1
provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = var.aws_profile != "" ? var.aws_profile : null

  default_tags {
    tags = {
      Project     = "KDM-Settlement-Manager"
      Environment = var.environment
      Terraform   = "true"
      CreatedBy   = "terraform"
    }
  }
}

