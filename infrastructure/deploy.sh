#!/bin/bash

# KDM Settlement Manager - Production Deployment Script
# This script builds the React app and deploys it to AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_section() {
    echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_section "Checking Prerequisites"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js found: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm found: $(npm --version)"
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed"
        exit 1
    fi
    print_success "Terraform found: $(terraform version | head -1)"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    print_success "AWS CLI found: $(aws --version)"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid"
        exit 1
    fi
    print_success "AWS credentials verified"
}

# Build React app
build_app() {
    print_section "Building React Application"
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Run this script from project root."
        exit 1
    fi
    
    print_warning "Installing dependencies..."
    npm install --production=false
    
    print_warning "Building app..."
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "Build failed - dist folder not created"
        exit 1
    fi
    
    print_success "React app built successfully"
    echo "Build size: $(du -sh dist | cut -f1)"
}

# Deploy to AWS
deploy_to_aws() {
    print_section "Deploying to AWS"
    
    # Get Terraform outputs
    cd infrastructure/terraform
    
    print_warning "Retrieving S3 bucket name..."
    S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null)
    
    if [ -z "$S3_BUCKET" ]; then
        print_error "Failed to get S3 bucket from Terraform. Did you run 'terraform apply'?"
        exit 1
    fi
    
    print_success "S3 Bucket: $S3_BUCKET"
    
    print_warning "Uploading to S3..."
    cd ../..
    aws s3 sync dist/ s3://${S3_BUCKET}/ --delete --cache-control "public, max-age=3600"
    
    print_success "Files uploaded to S3"
    
    # Get CloudFront distribution ID
    cd infrastructure/terraform
    DIST_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null)
    
    if [ -z "$DIST_ID" ]; then
        print_warning "Could not get CloudFront distribution ID"
    else
        print_success "CloudFront Distribution: $DIST_ID"
        
        print_warning "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation --distribution-id ${DIST_ID} --paths "/*" > /dev/null
        print_success "Cache invalidation requested"
    fi
    
    cd ../..
}

# Get deployment info
show_deployment_info() {
    print_section "Deployment Complete!"
    
    cd infrastructure/terraform
    
    CLOUDFRONT_URL=$(terraform output -raw cloudfront_domain_name 2>/dev/null)
    API_URL=$(terraform output -raw api_gateway_invoke_url 2>/dev/null)
    
    echo -e "Your app is now live!\n"
    echo -e "${GREEN}App URL:${NC}"
    echo -e "  https://${CLOUDFRONT_URL}\n"
    
    echo -e "${GREEN}API Gateway:${NC}"
    echo -e "  ${API_URL}\n"
    
    echo -e "${GREEN}Environment Variables:${NC}"
    echo -e "  VITE_COGNITO_USER_POOL_ID=$(terraform output -raw cognito_user_pool_id 2>/dev/null)"
    echo -e "  VITE_COGNITO_CLIENT_ID=$(terraform output -raw cognito_client_id 2>/dev/null)"
    echo -e "  VITE_COGNITO_REGION=us-west-2"
    echo -e "  VITE_API_GATEWAY_URL=${API_URL}\n"
    
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "  1. Test the application in your browser"
    echo -e "  2. Create a test account and verify login works"
    echo -e "  3. Check CloudWatch logs for any errors"
    echo -e "  4. Set up custom domain (optional)"
    echo -e "  5. Configure SSL certificate (if using custom domain)\n"
    
    cd ../..
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════╗"
    echo "║  KDM Settlement Manager - Deployment Script  ║"
    echo "╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Parse arguments
    ENVIRONMENT="${1:-prod}"
    
    if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "prod" ]; then
        print_error "Invalid environment. Must be: dev, staging, or prod"
        exit 1
    fi
    
    print_warning "Deploying to environment: $ENVIRONMENT"
    
    # Execute steps
    check_prerequisites
    build_app
    deploy_to_aws
    show_deployment_info
    
    echo -e "${GREEN}Deployment completed successfully!${NC}\n"
}

# Run main function
main "$@"
