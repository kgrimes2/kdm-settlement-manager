# SSO with AWS Cognito and DynamoDB Integration Guide

This guide walks you through integrating AWS Cognito authentication with your KDM Settlement Manager application and enabling automatic data sync to DynamoDB.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  LoginModal (Cognito Authentication)                 │  │
│  │  AuthContext (Session Management)                    │  │
│  │  App Component (Enhanced with Auth)                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS + JWT Token
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS Cloud                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AWS Cognito (User Pool)                            │   │
│  │  - User authentication                              │   │
│  │  - Session management                               │   │
│  │  - MFA support                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           │ JWT Token Validation              │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Gateway (REST API)                             │   │
│  │  - Cognito Authorization                            │   │
│  │  - Rate limiting                                    │   │
│  │  - CORS handling                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│      ┌────────────────────┼────────────────────┐            │
│      ▼                    ▼                    ▼            │
│  ┌────────┐          ┌────────┐          ┌────────┐        │
│  │ Lambda │          │ Lambda │          │ Lambda │        │
│  │  GET   │          │  POST  │          │ DELETE │        │
│  │  Data  │          │  Data  │          │  Data  │        │
│  └────────┘          └────────┘          └────────┘        │
│      │                    │                    │            │
│      └────────────────────┼────────────────────┘            │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DynamoDB (User Data Storage)                       │   │
│  │  - Partition Key: user_id                           │   │
│  │  - Sort Key: settlement_id                          │   │
│  │  - Auto-scaling                                     │   │
│  │  - Point-in-time recovery (prod)                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Deploy Infrastructure (Terraform)

### 1a. Install Prerequisites

```bash
# Install Terraform
brew install terraform  # macOS
# or download from https://www.terraform.io/downloads

# Install AWS CLI
brew install awscli  # macOS

# Configure AWS credentials
aws configure
# You'll be prompted for:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region
# - Default output format (json)
```

### 1b. Deploy Cognito and DynamoDB

```bash
cd infrastructure/terraform

# Copy and customize configuration
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Update with your values

# Initialize Terraform
terraform init

# Review the plan
terraform plan -out=tfplan

# Apply the configuration
terraform apply tfplan
```

### 1c. Capture Terraform Outputs

```bash
# Save the outputs for frontend configuration
terraform output -json > ../tf-outputs.json

# Display key values
echo "Cognito User Pool ID: $(terraform output cognito_user_pool_id)"
echo "Cognito Client ID: $(terraform output cognito_client_id)"
echo "Cognito Domain: $(terraform output cognito_domain)"
echo "API Gateway URL: $(terraform output api_gateway_invoke_url)"
```

## Step 2: Configure Frontend

### 2a. Create Environment File

```bash
# In project root
cp .env.local.example .env.local

# Add values from Terraform output
nano .env.local
```

Content for `.env.local`:
```
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=your_client_id_here
VITE_COGNITO_DOMAIN=your-domain
VITE_COGNITO_REGION=us-east-1
VITE_API_BASE_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev
VITE_DEBUG=false
```

### 2b. Integrate Auth Provider in App.tsx

Update your `src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import './index.css'

const cognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider {...cognitoConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
```

### 2c. Update App.tsx to Use Auth

```tsx
import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import LoginModal from './components/LoginModal'
import App from './App'  // Original app component
import './App.css'

function AppWithAuth() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(!isAuthenticated)

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(true)} />
  }

  return (
    <>
      {/* Add user info and logout button to toolbar */}
      <div style={{ paddingRight: '20px', textAlign: 'right', fontSize: '0.9rem' }}>
        <span>{user?.email}</span>
        <button onClick={() => setShowLoginModal(true)}>Logout</button>
      </div>
      <App />
    </>
  )
}

export default AppWithAuth
```

## Step 3: Implement Data Sync

### 3a. Update App State Management

Integrate automatic sync in your App component:

```tsx
import { useEffect, useCallback } from 'react'
import { useAuth } from './contexts/AuthContext'

function App() {
  const { user, dataService, isAuthenticated } = useAuth()
  const [state, setState] = useState(defaultState)

  // Sync to cloud when data changes
  useEffect(() => {
    if (!isAuthenticated || !user || !dataService) return

    const syncTimer = setTimeout(() => {
      const currentSettlement = state.settlements[state.activeSettlement]
      if (currentSettlement) {
        dataService.syncToCloud(currentSettlement.id, state)
          .catch(err => console.error('Sync error:', err))
      }
    }, 2000)  // Sync 2 seconds after last change

    return () => clearTimeout(syncTimer)
  }, [state, isAuthenticated, user, dataService])

  // Load cloud data on mount
  useEffect(() => {
    if (!isAuthenticated || !user || !dataService) return

    const loadCloudData = async () => {
      try {
        const cloudData = await dataService.restoreFromCloud(
          state.settlements[state.activeSettlement]?.id
        )
        if (cloudData) {
          setState(cloudData)
        }
      } catch (err) {
        console.error('Error loading cloud data:', err)
      }
    }

    loadCloudData()
  }, [isAuthenticated, user, dataService])

  // ... rest of your App component
}
```

### 3b. Add Data Sync UI Indicator

Create `src/components/SyncStatus.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function SyncStatus() {
  const { isAuthenticated } = useAuth()
  const [isSyncing, setIsSyncing] = useState(false)

  // Listen to sync events (you can implement via custom hooks)
  useEffect(() => {
    // Show sync indicator based on pending uploads
  }, [])

  if (!isAuthenticated) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      padding: '10px 16px',
      backgroundColor: isSyncing ? '#fff3cd' : '#d4edda',
      borderRadius: '4px',
      fontSize: '0.875rem',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      {isSyncing ? (
        <>
          <span>⏳ Syncing...</span>
        </>
      ) : (
        <>
          <span>✓ Synced</span>
        </>
      )}
    </div>
  )
}
```

## Step 4: Test the Implementation

### 4a. Local Testing

```bash
# Start the development server
npm run dev

# Visit http://localhost:5173
# You should see the login modal
```

### 4b. Test Sign Up

1. Click "Create Account"
2. Fill in email, username, and password
3. Receive verification email
4. Enter verification code
5. Should redirect to login

### 4c. Test Sign In

1. Login with username and password
2. Should see the main app
3. Make some changes to survivors/settlements
4. Check CloudWatch to see API calls
5. Verify data is being saved to DynamoDB

### 4d. Test Data Persistence

1. Login and make changes
2. Refresh the page
3. Data should load from DynamoDB
4. Close browser and reopen
5. Data should still be there

## Step 5: Monitoring and Troubleshooting

### Monitor Lambda Execution

```bash
# View recent errors
aws logs tail /aws/lambda/kdm-settlement-manager-get-user-data-dev --follow

# View specific function invocation
aws logs filter-log-events \
  --log-group-name /aws/lambda/kdm-settlement-manager-get-user-data-dev \
  --filter-pattern "ERROR"
```

### Monitor API Gateway

```bash
# Get API Gateway metrics
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
# View table metrics
aws dynamodb describe-table \
  --table-name kdm-settlement-manager-user-data-dev \
  --query 'Table.{Name:TableName,Status:TableStatus,Items:ItemCount,Size:TableSizeBytes}'
```

### Common Issues and Solutions

**Issue**: "Invalid token" error when calling API

**Solution**: Check that:
1. JWT token is being passed in Authorization header
2. Token hasn't expired
3. Cognito user pool ID matches in Lambda environment variable

**Issue**: "Access Denied" error from DynamoDB

**Solution**: Verify:
1. Lambda role has DynamoDB permissions (check IAM policies)
2. DynamoDB table name matches in Lambda environment variable
3. Table exists in the same region as Lambda

**Issue**: CORS errors from frontend

**Solution**: API Gateway needs CORS headers. Add this to `api_gateway.tf`:

```hcl
# Add CORS response headers
resource "aws_api_gateway_integration_response" "cors" {
  # ... existing config ...
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}
```

## Step 6: Production Deployment

### 6a. Create Production Environment

```bash
# Create prod terraform.tfvars
cp infrastructure/terraform/terraform.tfvars.example \
   infrastructure/terraform/terraform.tfvars.prod

# Edit with production values
nano infrastructure/terraform/terraform.tfvars.prod

# Set environment to prod
environment = "prod"

# Use production callback URLs
cognito_callback_urls = [
  "https://yourdomain.com/callback",
  "https://www.yourdomain.com/callback"
]

cognito_logout_urls = [
  "https://yourdomain.com",
  "https://www.yourdomain.com"
]
```

### 6b. Deploy to Production

```bash
cd infrastructure/terraform

# Plan production deployment
terraform plan -var-file=terraform.tfvars.prod -out=tfplan.prod

# Apply production deployment
terraform apply tfplan.prod

# Enable backups and monitoring
terraform output -json > ../prod-outputs.json
```

### 6c. Configure Production Frontend

Update your production `.env`:
```
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXX_PROD
VITE_COGNITO_CLIENT_ID=prod_client_id
VITE_COGNITO_DOMAIN=kdm-prod-domain
VITE_COGNITO_REGION=us-east-1
VITE_API_BASE_URL=https://prod-api-id.execute-api.us-east-1.amazonaws.com/prod
VITE_DEBUG=false
```

## Security Checklist

- [ ] Never commit `.env.local` or `terraform.tfvars`
- [ ] Enable MFA for Cognito users
- [ ] Use HTTPS for all API calls
- [ ] Rotate access keys regularly
- [ ] Enable CloudTrail for audit logging
- [ ] Set up CloudWatch alarms for Lambda errors
- [ ] Enable DynamoDB point-in-time recovery for production
- [ ] Use strong password policy (already configured)
- [ ] Enable rate limiting on API Gateway
- [ ] Set up VPC endpoints for private access (optional)

## Additional Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Amazon Cognito Identity SDK for JavaScript](https://github.com/aws-amplify/amplify-js)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

## Getting Help

If you encounter issues:

1. Check the Lambda CloudWatch logs
2. Verify Terraform outputs match environment variables
3. Test API endpoints directly with curl:

```bash
curl -X POST https://your-api.execute-api.region.amazonaws.com/dev/user-data/test-settlement \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

4. Check AWS IAM permissions
5. Verify CORS headers in API Gateway
