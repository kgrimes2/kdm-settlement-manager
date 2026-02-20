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
    key     = "kdm-app/terraform.tfstate"
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

