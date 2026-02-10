terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Use local backend for development
  # For production, configure S3 backend with:
  # terraform init -backend-config="bucket=your-bucket" -backend-config="key=kdm-app/terraform.tfstate" -backend-config="region=us-east-1"
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "KDM-Settlement-Manager"
      Environment = var.environment
      Terraform   = "true"
      CreatedBy   = "terraform"
    }
  }
}

