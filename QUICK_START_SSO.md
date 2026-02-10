# Quick Start: AWS Cognito SSO + DynamoDB

## TL;DR - 10 Minute Setup

### Prerequisites
- AWS Account (free tier eligible)
- Terraform installed
- AWS CLI configured

### Step 1: Deploy Infrastructure (5 minutes)

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values (keep callback URLs as http://localhost:5173 for dev)
terraform init
terraform plan
terraform apply
```

Save the outputs:
```bash
terraform output cognito_user_pool_id
terraform output cognito_client_id
terraform output cognito_domain
terraform output api_gateway_invoke_url
```

### Step 2: Configure Frontend (3 minutes)

```bash
# In project root
cp .env.local.example .env.local
# Edit .env.local with values from Step 1
```

### Step 3: Test It (2 minutes)

```bash
npm run dev
# Visit http://localhost:5173
# Create account → Verify email → Login → See your app!
```

## File Structure

```
project/
├── infrastructure/
│   ├── terraform/                 # All Terraform configs
│   │   ├── main.tf               # Terraform setup
│   │   ├── cognito.tf            # Cognito User Pool
│   │   ├── dynamodb.tf           # Database tables
│   │   ├── lambda.tf             # Lambda functions
│   │   ├── api_gateway.tf        # API setup
│   │   ├── iam.tf                # Security/permissions
│   │   ├── variables.tf          # Configuration options
│   │   ├── outputs.tf            # Output values
│   │   ├── terraform.tfvars.example   # Template (commit this)
│   │   └── terraform.tfvars      # Your config (NEVER commit!)
│   │
│   ├── lambda/                    # Lambda source code
│   │   ├── get_user_data.py
│   │   ├── save_user_data.py
│   │   └── delete_user_data.py
│   │
│   └── README.md                 # Detailed deployment guide
│
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx       # React auth provider
│   │
│   ├── utils/
│   │   ├── authService.ts        # Cognito SDK wrapper
│   │   └── dataService.ts        # API communication
│   │
│   └── components/
│       ├── LoginModal.tsx        # Login/signup UI
│       └── LoginModal.css        # Login styles
│
├── .env.local.example            # Environment template (commit this)
├── .gitignore                    # Updated with AWS/TF files
└── SSO_COGNITO_INTEGRATION.md   # Full integration guide
```

## What Gets Created

### AWS Resources
- **Cognito User Pool**: User authentication and management
- **DynamoDB Tables**: 
  - `kdm-settlement-manager-user-data-{env}` - Settlement data
  - `kdm-settlement-manager-user-settings-{env}` - User preferences
- **Lambda Functions**: 3 functions for CRUD operations
- **API Gateway**: REST API with Cognito authorization
- **IAM Roles**: Permissions for Lambda to access DynamoDB

### Frontend Components
- **AuthContext**: Manages authentication state
- **LoginModal**: Sign up, login, verification flow
- **authService**: Cognito integration (signup, signin, logout, etc)
- **dataService**: API communication (get/save/delete user data)

## Data Flow

### Sign Up
```
User fills form → Cognito creates account → Email verification → Login
```

### Sign In
```
Username + Password → Cognito validates → JWT tokens returned → localStorage
```

### Data Sync
```
App changes → 2 second debounce → POST to API → Lambda validates JWT → 
DynamoDB save → Confirmation response
```

### Data Load
```
User logs in → App loads → API GET /user-data → Lambda validates JWT →
DynamoDB query → Data restored to app
```

## Environment Variables

```
VITE_COGNITO_USER_POOL_ID     = AWS user pool ID
VITE_COGNITO_CLIENT_ID        = Cognito app client ID
VITE_COGNITO_DOMAIN          = Cognito domain (for hosted UI if needed)
VITE_COGNITO_REGION          = AWS region (us-east-1 default)
VITE_API_BASE_URL            = API Gateway endpoint
VITE_DEBUG                    = Enable debug logging
```

## Key Security Features

✅ **Password Security**
- Minimum 12 characters
- Requires uppercase, lowercase, numbers, symbols
- Configurable in Terraform

✅ **Token Management**
- JWT tokens stored in localStorage
- Automatic token refresh
- Token revocation on logout

✅ **API Security**
- All Lambda functions require JWT authorization
- Cognito validates tokens
- CORS restricted to your domain

✅ **Data Security**
- HTTPS only
- User ID in all DynamoDB queries (isolation)
- No credentials in code (use .env.local)

## Troubleshooting

### "Invalid token" API error
- Token expired: Page refresh triggers re-login
- Wrong region: Check VITE_COGNITO_REGION
- Pool ID mismatch: Verify Cognito config

### "Can't connect to API"
- API URL wrong: Copy from terraform output
- CORS error: Check browser console, may need CORS config
- Lambda not deployed: Run `terraform apply` again

### "Email verification not arriving"
- Check spam folder
- Cognito limit: 1 email per hour per user
- Use test accounts in AWS console for testing

### Data not syncing
- Check network tab (browser DevTools)
- Verify JWT token is sent
- Check Lambda CloudWatch logs:
  ```bash
  aws logs tail /aws/lambda/kdm-settlement-manager-save-user-data-dev --follow
  ```

## Useful AWS CLI Commands

```bash
# List Cognito users
aws cognito-idp list-users --user-pool-id us-east-1_XXXXX

# View API Gateway logs
aws apigateway get-stage --rest-api-id xxx --stage-name dev

# View DynamoDB data
aws dynamodb scan --table-name kdm-settlement-manager-user-data-dev

# Tail Lambda logs
aws logs tail /aws/lambda/kdm-settlement-manager-get-user-data-dev --follow

# Monitor CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=kdm-settlement-manager-get-user-data-dev \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Cost Estimate (Monthly)

For a small app with <100 users:
- **Cognito**: $0-5 (50k MAU free, then $0.015/user)
- **API Gateway**: $0.35 (1M calls free)
- **Lambda**: $0.20 (~1M requests free, $0.20 per million)
- **DynamoDB**: $0.25-1 (on-demand pricing)
- **Total**: ~$1-6/month

See: https://calculator.aws/#/addService

## Next Steps

1. **Production Setup**
   - Create separate prod/staging/dev environments
   - Update Cognito callback URLs to your domain
   - Enable HTTPS everywhere
   - Set up CloudTrail for auditing

2. **Enhanced Features**
   - Add MFA (multi-factor authentication)
   - User profile management page
   - Password reset flow
   - Social login (Google, GitHub, etc)

3. **Monitoring**
   - CloudWatch dashboards
   - Email alerts for errors
   - Performance metrics

4. **CI/CD**
   - Automate Terraform deployments
   - Run tests before deploy
   - Auto-deploy on git push

## Support

For issues:
1. Check [SSO_COGNITO_INTEGRATION.md](./SSO_COGNITO_INTEGRATION.md) for detailed guide
2. Check [infrastructure/README.md](./infrastructure/README.md) for Terraform details
3. Review Lambda logs in CloudWatch
4. Test with AWS CLI directly

Happy coding! 🚀
