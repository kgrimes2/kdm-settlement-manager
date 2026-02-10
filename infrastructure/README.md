# AWS Infrastructure Deployment Guide

## Prerequisites

1. **AWS Account**: An active AWS account with appropriate permissions
2. **Terraform**: Version 1.0 or higher
3. **AWS CLI**: Configured with credentials
4. **Python**: 3.11+ (for Lambda functions)

## Initial Setup

### Step 1: Setup Terraform State Backend (Optional but Recommended)

For production, use S3 backend instead of local state:

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket --bucket kdm-tf-state-<your-account-id> --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket kdm-tf-state-<your-account-id> \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket kdm-tf-state-<your-account-id> \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Step 2: Configure Terraform Variables

```bash
cd infrastructure/terraform

# Copy the example tfvars file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

Update `terraform.tfvars` with:
- Your environment (dev, staging, prod)
- AWS region
- Callback URLs matching your frontend URL
- Logout URLs

### Step 3: Initialize Terraform

```bash
# Initialize Terraform (downloads plugins)
terraform init

# Optional: Configure S3 backend
terraform init -backend-config="bucket=kdm-tf-state-<your-account-id>" \
                 -backend-config="key=kdm-app/terraform.tfstate" \
                 -backend-config="region=us-east-1" \
                 -backend-config="dynamodb_table=terraform-locks" \
                 -backend-config="encrypt=true"
```

### Step 4: Review and Deploy

```bash
# Review the changes Terraform will make
terraform plan -out=tfplan

# If the plan looks good, apply it
terraform apply tfplan
```

### Step 5: Retrieve Output Values

```bash
# Show all outputs
terraform output

# Get specific values
terraform output cognito_client_id
terraform output api_gateway_invoke_url

# Get values in JSON format
terraform output -json
```

## Post-Deployment Configuration

After deployment, you need to configure your frontend with the AWS resources:

### Step 1: Update Frontend Environment Variables

Create `.env.local` in your project root (don't commit this):

```bash
cp .env.local.example .env.local
```

Update `.env.local` with values from Terraform outputs:

```bash
# Get the values from Terraform
OUTPUTS=$(terraform output -json)

# Extract and set in .env.local
VITE_COGNITO_USER_POOL_ID=$(echo $OUTPUTS | jq -r '.cognito_user_pool_id.value')
VITE_COGNITO_CLIENT_ID=$(echo $OUTPUTS | jq -r '.cognito_client_id.value')
VITE_COGNITO_DOMAIN=$(echo $OUTPUTS | jq -r '.cognito_domain.value')
VITE_COGNITO_REGION="us-east-1"
VITE_API_BASE_URL=$(echo $OUTPUTS | jq -r '.api_gateway_invoke_url.value')
```

### Step 2: Add Cognito App Client Settings

In AWS Console:
1. Go to Cognito > User Pools > Your Pool > App Clients
2. Edit your app client
3. Ensure these are configured:
   - **Callback URLs**: Your frontend callback URL
   - **Logout URLs**: Your frontend logout URL
   - **Allowed OAuth Flows**: Authorization code, Implicit
   - **Allowed OAuth Scopes**: email, openid, profile

### Step 3: Test the Deployment

```bash
# Start the development server
npm run dev

# Visit http://localhost:5173
# Try to sign up and login
```

## Managing Infrastructure

### View Current State

```bash
# List all resources
terraform state list

# Show details of a specific resource
terraform state show aws_cognito_user_pool.main
```

### Updating Configuration

```bash
# Update a variable
terraform apply -var="environment=staging"

# Or update in terraform.tfvars then apply
terraform apply
```

### Destroying Resources

```bash
# Be careful! This deletes all resources
terraform destroy

# Destroy only specific resources
terraform destroy -target=aws_api_gateway_rest_api.main
```

## Troubleshooting

### Authorization Errors

If you get authorization errors:
1. Verify AWS credentials: `aws sts get-caller-identity`
2. Check IAM permissions
3. Ensure Cognito pool ARN is correct in authorizer

### Lambda Execution Errors

Check CloudWatch logs:
```bash
# Get function name from terraform output
FUNC_NAME=$(terraform output -json | jq -r '.lambda_function_names.value.get_user_data')

# View logs
aws logs tail /aws/lambda/$FUNC_NAME --follow
```

### CORS Issues

If frontend can't call API:
1. API Gateway needs CORS headers enabled
2. Update `api_gateway.tf` to add CORS configuration if needed

## Monitoring

### View API Usage

```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=kdm-settlement-manager-api-dev \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### Monitor DynamoDB

```bash
# Check table status
aws dynamodb describe-table --table-name kdm-settlement-manager-user-data-dev

# View consumed capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=kdm-settlement-manager-user-data-dev \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Security Best Practices

1. **Never commit sensitive data**: Always use `.env.local` and `terraform.tfvars` locally
2. **Use Terraform remote state**: Store state in S3 with encryption and locking
3. **Enable MFA**: For Cognito users, enable MFA
4. **Monitor CloudTrail**: Enable CloudTrail to audit all API calls
5. **Rotate credentials**: Periodically rotate AWS access keys
6. **Use least privilege**: Ensure IAM roles have minimal required permissions
7. **Enable versioning**: On DynamoDB and S3 for disaster recovery

## Cost Optimization

- **DynamoDB**: Using `PAY_PER_REQUEST` billing is good for variable loads
- **API Gateway**: You pay per million API calls (very cheap for low traffic)
- **Lambda**: Free tier includes 1 million requests/month
- **Cognito**: Free for up to 50,000 monthly active users

Estimate costs at: https://calculator.aws/#/

## Next Steps

1. Configure CI/CD to deploy changes automatically
2. Set up alarms for Lambda errors and DynamoDB throttling
3. Implement API rate limiting
4. Add CloudFront CDN for static assets
5. Set up proper logging and monitoring
