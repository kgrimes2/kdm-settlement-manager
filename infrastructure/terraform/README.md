# KDM Settlement Manager - Infrastructure as Code

This directory contains Terraform configurations for deploying the complete AWS infrastructure for the KDM Settlement Manager application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CloudFront (CDN)                         │
│              Serves React App + Assets                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
    ┌────────────────┐        ┌───────────────────┐
    │ S3 Bucket      │        │ API Gateway       │
    │ (React App)    │        │ (REST API)        │
    └────────────────┘        └────────┬──────────┘
                                       │
                        ┌──────────────┼──────────────┐
                        │              │              │
                        ▼              ▼              ▼
                    ┌────────────┐ ┌────────────┐ ┌────────────┐
                    │  Lambda    │ │  Lambda    │ │  Lambda    │
                    │  Get Data  │ │ Save Data  │ │Delete Data │
                    └──────┬─────┘ └──────┬─────┘ └──────┬─────┘
                           │              │              │
                           └──────────────┼──────────────┘
                                          │
                           ┌──────────────┴──────────────┐
                           │                             │
                           ▼                             ▼
                    ┌────────────────┐           ┌──────────────┐
                    │  DynamoDB      │           │ AWS Cognito  │
                    │  User Data     │           │ (Auth)       │
                    └────────┬───────┘           └──────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   PITR       │ │ AWS Backup   │ │ S3 Backups   │
    │ (35-day)     │ │ (Daily)      │ │ (30-day)     │
    └──────────────┘ └──────────────┘ └──────────────┘
```

## Terraform Files

### Core Infrastructure
- **main.tf** - Terraform version and provider configuration
- **variables.tf** - Input variables with validation
- **outputs.tf** - Output values for easy reference

### AWS Services
- **cognito.tf** - AWS Cognito User Pool for authentication
- **api_gateway.tf** - REST API with JWT authorization
- **lambda.tf** - Serverless functions (get/save/delete data)
- **dynamodb.tf** - NoSQL database for user data
- **iam.tf** - Identity & Access Management roles and policies
- **backups.tf** - Disaster recovery (PITR, daily snapshots, S3 exports)
- **frontend.tf** - CloudFront CDN + S3 for serving React app

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** (v1.0+)
   ```bash
   # macOS
   brew install terraform
   
   # Or download from https://www.terraform.io/downloads.html
   ```
3. **AWS CLI** (v2+) configured with credentials
   ```bash
   aws configure
   ```
4. **Python 3.9+** (for Lambda functions)

## Getting Started

### 1. Initialize Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform (downloads providers, etc.)
terraform init
```

### 2. Review and Customize Variables

Copy the example variables file:
```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` to customize for your environment:
```hcl
aws_region = "us-west-2"              # Change if needed
environment = "dev"                   # dev, staging, or prod
app_name    = "kdm-settlement-manager" # Your app name

cognito_callback_urls = [
  "https://your-domain.com",
  "http://localhost:5173"  # For local development
]

cognito_logout_urls = [
  "https://your-domain.com",
  "http://localhost:5173"  # For local development
]
```

### 3. Plan Infrastructure Deployment

```bash
# Review what will be created/modified
terraform plan -out=tfplan

# Check for any errors or unexpected changes
```

### 4. Apply Infrastructure

```bash
# Deploy the infrastructure
terraform apply tfplan

# Or directly (interactive):
# terraform apply
```

This will create:
- Cognito User Pool + App Client
- DynamoDB tables
- Lambda functions
- API Gateway
- S3 bucket + CloudFront distribution
- Backup vault and plan
- All necessary IAM roles and policies

### 5. Retrieve Outputs

```bash
# Get all important URLs and IDs
terraform output

# Get specific outputs
terraform output cognito_user_pool_id
terraform output api_gateway_invoke_url
terraform output cloudfront_domain_name
```

## Building and Deploying the React App

### 1. Build the App

```bash
cd ../..  # Back to project root

npm run build
```

This creates a `dist/` folder with your production-ready app.

### 2. Deploy to S3

```bash
# Get the S3 bucket name from Terraform outputs
S3_BUCKET=$(terraform -chdir=infrastructure/terraform output -raw s3_bucket_name)

# Upload the built app to S3
aws s3 sync dist/ s3://${S3_BUCKET}/ --delete

# List uploaded files to verify
aws s3 ls s3://${S3_BUCKET}/ --recursive
```

### 3. Invalidate CloudFront Cache

```bash
# Get the CloudFront distribution ID
DIST_ID=$(terraform -chdir=infrastructure/terraform output -raw cloudfront_distribution_id)

# Invalidate the cache to serve new version immediately
aws cloudfront create-invalidation \
  --distribution-id ${DIST_ID} \
  --paths "/*"
```

### 4. Access Your App

```bash
# Get the CloudFront URL
terraform -chdir=infrastructure/terraform output cloudfront_domain_name
```

Visit: `https://<cloudfront-domain-name>`

## Development Workflow

For local development with the deployed backend:

1. Create `.env.local` in project root:
   ```
   VITE_COGNITO_USER_POOL_ID=<from terraform output>
   VITE_COGNITO_CLIENT_ID=<from terraform output>
   VITE_COGNITO_REGION=us-west-2
   VITE_API_GATEWAY_URL=<from terraform output>
   ```

2. Update Cognito callback URLs to include your dev server:
   ```bash
   # Edit terraform.tfvars to add:
   cognito_callback_urls = [
     "https://production-domain.com",
     "http://localhost:5173"
   ]
   
   # Reapply
   terraform apply
   ```

3. Start dev server:
   ```bash
   npm run dev
   ```

## Monitoring and Troubleshooting

### View Lambda Logs

```bash
# Get logs from a Lambda function
aws logs tail /aws/lambda/kdm-settlement-manager-dev-get-user-data --follow

# Replace function name as needed:
# - kdm-settlement-manager-dev-get-user-data
# - kdm-settlement-manager-dev-save-user-data
# - kdm-settlement-manager-dev-delete-user-data
```

### Check DynamoDB

```bash
# Scan user data table
aws dynamodb scan \
  --table-name kdm-settlement-manager-dev-user-data \
  --region us-west-2

# Query specific user
aws dynamodb query \
  --table-name kdm-settlement-manager-dev-user-data \
  --key-condition-expression "user_id = :uid" \
  --expression-attribute-values "{\":uid\":{\"S\":\"username\"}}" \
  --region us-west-2
```

### Check Backup Status

```bash
# List backup jobs
aws backup list-backup-jobs \
  --region us-west-2

# Get recovery points
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name kdm-backup-vault \
  --region us-west-2
```

## Scaling and Cost Optimization

### For Production

Adjust variables for production workloads:

```hcl
# terraform.tfvars
environment                = "prod"
dynamodb_billing_mode      = "PROVISIONED"  # For predictable costs
lambda_memory              = 512            # Increase for faster execution
lambda_timeout             = 60             # Increase timeout if needed
```

Costs depend on:
- **DynamoDB**: ~$1.25/GB/month (provisioned) or pay-per-request
- **Lambda**: Free tier includes 1M invocations/month
- **API Gateway**: ~$3.50 per million requests
- **CloudFront**: ~$0.085/GB out (CDN distribution)
- **S3**: ~$0.023/GB stored + transfer costs

### Cost Monitoring

Enable AWS Cost Explorer:
```bash
aws ce get-cost-and-usage \
  --time-period Start=2024-02-01,End=2024-02-29 \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

## Disaster Recovery

### Backup Recovery

All backups are stored in S3 and protected by AWS Backup:

```bash
# List available recovery points
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name kdm-backup-vault \
  --region us-west-2 | jq '.RecoveryPoints[] | {RecoveryPointArn, Status, CreationDate}'

# Restore from a recovery point (via AWS console or CLI)
# See: https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-backup.html
```

### Point-in-Time Recovery

DynamoDB has 35-day PITR enabled:

```bash
# Restore to specific point in time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name kdm-settlement-manager-dev-user-data \
  --target-table-name kdm-settlement-manager-dev-user-data-restore \
  --restore-date-time 2024-02-08T12:00:00Z \
  --region us-west-2
```

## Cleanup

To destroy all infrastructure and avoid ongoing charges:

```bash
# Warning: This will delete all data!
terraform destroy

# Confirm when prompted
# Type: yes
```

If you want to keep backups:
- Download data from S3 before destroying
- AWS Backup vault can be retained separately

## Security Best Practices

1. **Credentials**: Never commit `.env.local` or `terraform.tfvars`
2. **State Files**: Terraform state contains sensitive data - keep it safe
   - Consider using Terraform Cloud for remote state
   - Enable state locking
   - Restrict IAM access to state files
3. **Cognito**: 
   - Enable MFA for production
   - Use temporary credentials only
4. **API Gateway**:
   - Monitor CloudWatch logs
   - Set up WAF rules for production
5. **DynamoDB**:
   - Use KMS encryption for sensitive data
   - Enable point-in-time recovery (already done)
6. **IAM**:
   - Use least-privilege principle
   - Rotate credentials regularly

## Useful Terraform Commands

```bash
# Show current state
terraform show

# Destroy specific resource (dangerous!)
terraform destroy -target=aws_s3_bucket.app_bucket

# Get resource details
terraform state show aws_cognito_user_pool.main

# Format code
terraform fmt -recursive

# Validate syntax
terraform validate

# Show dependencies
terraform graph

# State management
terraform state list
terraform state show <resource>
terraform state rm <resource>
```

## Support and Troubleshooting

### Common Issues

**Issue**: "Missing Authentication Token" from API Gateway
- **Solution**: Ensure you're passing JWT token in `Authorization` header

**Issue**: Cognito callback URL mismatch
- **Solution**: Update `cognito_callback_urls` in `terraform.tfvars` and reapply

**Issue**: CloudFront returns 403 Forbidden
- **Solution**: Check S3 bucket policy and OAI permissions

**Issue**: Lambda function timeout
- **Solution**: Increase `lambda_timeout` variable, or optimize function code

### Additional Resources

- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)

## Contributing

When modifying infrastructure:

1. Test changes locally with `terraform plan`
2. Document changes in commit messages
3. Keep variables validation up-to-date
4. Update this README with new features
5. Tag releases with version numbers

---

**Last Updated**: February 2024
**Terraform Version**: 1.0+
**AWS Provider Version**: 5.0+
