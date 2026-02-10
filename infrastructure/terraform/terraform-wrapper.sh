#!/bin/bash
# Helper script to run Terraform with proper AWS credentials
# Usage: ./terraform-wrapper.sh plan
#        ./terraform-wrapper.sh apply
#        ./terraform-wrapper.sh destroy

# Set AWS profile - use the dedicated Terraform IAM user (not root)
export AWS_PROFILE=terraform-kdm
export AWS_REGION=us-west-2

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to terraform directory
cd "$SCRIPT_DIR" || exit 1

# Show which AWS account we're using
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "AWS Credentials:"
aws sts get-caller-identity --query 'Account' --output text 2>/dev/null | xargs -I {} echo "Account ID: {}" || echo "ERROR: Could not get AWS identity"
echo "Profile: $AWS_PROFILE"
echo "Region: $AWS_REGION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run terraform with provided command
terraform "$@"
