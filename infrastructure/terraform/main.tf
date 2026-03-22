terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "kdm-terraform-state-469983200708"
    region  = "us-west-2"
    encrypt = true
    profile = "terraform-kdm"
  }
}

provider "aws" {
  region  = var.aws_region
  profile = "terraform-kdm"

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
  profile = "terraform-kdm"

  default_tags {
    tags = {
      Project     = "KDM-Settlement-Manager"
      Environment = var.environment
      Terraform   = "true"
      CreatedBy   = "terraform"
    }
  }
}

