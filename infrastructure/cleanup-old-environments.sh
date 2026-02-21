#!/bin/bash

# Cleanup script for deleting dev, dev2, prod, prod2 resources
# This script deletes resources that should NOT be in production

set -e

PROFILE="terraform-kdm"
REGION="us-west-2"
DRY_RUN="${DRY_RUN:-true}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== KDM Settlement Manager Resource Cleanup ===${NC}"
echo -e "${YELLOW}Profile: $PROFILE${NC}"
echo -e "${YELLOW}Region: $REGION${NC}"
echo -e "${YELLOW}DRY_RUN: $DRY_RUN${NC}"
echo ""

if [ "$DRY_RUN" = "true" ]; then
    echo -e "${RED}Running in DRY RUN mode. No resources will be deleted.${NC}"
    echo -e "${RED}To actually delete resources, run: DRY_RUN=false $0${NC}"
    echo ""
fi

# Function to delete or echo deletion command
delete_resource() {
    local resource_type=$1
    local resource_id=$2
    local delete_cmd=$3
    
    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${YELLOW}[DRY RUN]${NC} $resource_type: $resource_id"
        echo "  Command: $delete_cmd"
    else
        echo -e "${GREEN}Deleting${NC} $resource_type: $resource_id"
        eval "$delete_cmd"
        sleep 1  # Add delay to avoid rate limiting
    fi
}

# Delete Lambda Functions
echo -e "${YELLOW}--- Lambda Functions ---${NC}"
LAMBDA_FUNCTIONS=$(aws lambda list-functions --profile $PROFILE --region $REGION | jq -r '.Functions[] | select(.FunctionName | contains("dev2") or contains("prod2")) | .FunctionName' | sort)
if [ -z "$LAMBDA_FUNCTIONS" ]; then
    echo "No Lambda functions to delete"
else
    echo "$LAMBDA_FUNCTIONS" | while read func; do
        delete_resource "Lambda" "$func" "aws lambda delete-function --function-name '$func' --profile $PROFILE --region $REGION"
    done
fi
echo ""

# Delete DynamoDB Tables
echo -e "${YELLOW}--- DynamoDB Tables ---${NC}"
DYNAMODB_TABLES=$(aws dynamodb list-tables --profile $PROFILE --region $REGION | jq -r '.TableNames[] | select(. | contains("dev2") or contains("prod2"))' | sort)
if [ -z "$DYNAMODB_TABLES" ]; then
    echo "No DynamoDB tables to delete"
else
    echo "$DYNAMODB_TABLES" | while read table; do
        delete_resource "DynamoDB" "$table" "aws dynamodb delete-table --table-name '$table' --profile $PROFILE --region $REGION"
    done
fi
echo ""

# Delete API Gateway REST APIs
echo -e "${YELLOW}--- API Gateway REST APIs ---${NC}"
API_GATEWAYS=$(aws apigateway get-rest-apis --profile $PROFILE --region $REGION | jq -r '.items[] | select(.name | contains("dev2") or contains("prod2")) | "\(.id):\(.name)"' | sort)
if [ -z "$API_GATEWAYS" ]; then
    echo "No API Gateway REST APIs to delete"
else
    echo "$API_GATEWAYS" | while read item; do
        api_id=$(echo "$item" | cut -d: -f1)
        api_name=$(echo "$item" | cut -d: -f2)
        delete_resource "API Gateway" "$api_name" "aws apigateway delete-rest-api --rest-api-id '$api_id' --profile $PROFILE --region $REGION"
    done
fi
echo ""

# Delete Cognito User Pools (delete domain first)
echo -e "${YELLOW}--- Cognito User Pools ---${NC}"
COGNITO_POOLS=$(aws cognito-idp list-user-pools --profile $PROFILE --region $REGION --max-results 60 | jq -r '.UserPools[] | select(.Name | contains("dev2") or contains("prod2")) | "\(.Id):\(.Name)"' | sort)
if [ -z "$COGNITO_POOLS" ]; then
    echo "No Cognito user pools to delete"
else
    echo "$COGNITO_POOLS" | while read item; do
        pool_id=$(echo "$item" | cut -d: -f1)
        pool_name=$(echo "$item" | cut -d: -f2)
        
        # Delete Cognito domain first
        if [ "$DRY_RUN" = "true" ]; then
            echo -e "${YELLOW}[DRY RUN]${NC} Cognito Domain for pool: $pool_name"
        else
            echo -e "${GREEN}Deleting${NC} Cognito Domain for: $pool_name"
            DOMAIN=$(aws cognito-idp describe-user-pool --user-pool-id "$pool_id" --profile $PROFILE --region $REGION | jq -r '.UserPool.Domain // empty' 2>/dev/null)
            if [ ! -z "$DOMAIN" ]; then
                aws cognito-idp delete-user-pool-domain --domain "$DOMAIN" --user-pool-id "$pool_id" --profile $PROFILE --region $REGION 2>/dev/null || true
                sleep 3
            fi
        fi
        
        # Delete the pool
        delete_resource "Cognito Pool" "$pool_name" "aws cognito-idp delete-user-pool --user-pool-id '$pool_id' --profile $PROFILE --region $REGION"
    done
fi
echo ""

# Delete IAM Roles (must delete inline policies first)
echo -e "${YELLOW}--- IAM Roles ---${NC}"
IAM_ROLES=$(aws iam list-roles --profile $PROFILE | jq -r '.Roles[] | select(.RoleName | contains("dev2") or contains("prod2")) | .RoleName' | sort)
if [ -z "$IAM_ROLES" ]; then
    echo "No IAM roles to delete"
else
    echo "$IAM_ROLES" | while read role; do
        # Delete inline policies first
        INLINE_POLICIES=$(aws iam list-role-policies --role-name "$role" --profile $PROFILE | jq -r '.PolicyNames[]')
        for policy in $INLINE_POLICIES; do
            if [ "$DRY_RUN" = "true" ]; then
                echo -e "${YELLOW}[DRY RUN]${NC} IAM Inline Policy: $role/$policy"
            else
                echo -e "${GREEN}Deleting${NC} IAM Inline Policy: $role/$policy"
                aws iam delete-role-policy --role-name "$role" --policy-name "$policy" --profile $PROFILE
                sleep 0.5
            fi
        done
        
        # Delete attached policies
        ATTACHED_POLICIES=$(aws iam list-attached-role-policies --role-name "$role" --profile $PROFILE | jq -r '.AttachedPolicies[].PolicyArn')
        for policy_arn in $ATTACHED_POLICIES; do
            if [ "$DRY_RUN" = "true" ]; then
                echo -e "${YELLOW}[DRY RUN]${NC} IAM Attached Policy: $role/$policy_arn"
            else
                echo -e "${GREEN}Detaching${NC} IAM Policy: $role/$policy_arn"
                aws iam detach-role-policy --role-name "$role" --policy-arn "$policy_arn" --profile $PROFILE
                sleep 0.5
            fi
        done
        
        # Delete the role
        delete_resource "IAM Role" "$role" "aws iam delete-role --role-name '$role' --profile $PROFILE"
    done
fi
echo ""

# Delete SNS Topics
echo -e "${YELLOW}--- SNS Topics ---${NC}"
SNS_TOPICS=$(aws sns list-topics --profile $PROFILE --region $REGION | jq -r '.Topics[].TopicArn | select(. | contains("dev2") or contains("prod2"))' | sort)
if [ -z "$SNS_TOPICS" ]; then
    echo "No SNS topics to delete"
else
    echo "$SNS_TOPICS" | while read topic_arn; do
        delete_resource "SNS Topic" "$topic_arn" "aws sns delete-topic --topic-arn '$topic_arn' --profile $PROFILE --region $REGION"
    done
fi
echo ""

# Delete CloudWatch Log Groups
echo -e "${YELLOW}--- CloudWatch Log Groups ---${NC}"
LOGGROUPS=$(aws logs describe-log-groups --profile $PROFILE --region $REGION | jq -r '.logGroups[] | select(.logGroupName | contains("dev2") or contains("prod2")) | .logGroupName' | sort)
if [ -z "$LOGGROUPS" ]; then
    echo "No CloudWatch log groups to delete"
else
    echo "$LOGGROUPS" | while read loggroup; do
        delete_resource "CloudWatch Log Group" "$loggroup" "aws logs delete-log-group --log-group-name '$loggroup' --profile $PROFILE --region $REGION"
    done
fi
echo ""

# Delete S3 Buckets (must empty first)
echo -e "${YELLOW}--- S3 Buckets ---${NC}"
S3_BUCKETS=$(aws s3api list-buckets --profile $PROFILE | jq -r '.Buckets[].Name' | grep -E "(dev|prod)" | grep -v kdm-terraform | grep -E "(dev2|prod2|-dev-|-prod-)" | sort)
if [ -z "$S3_BUCKETS" ]; then
    echo "No S3 buckets to delete"
else
    echo "$S3_BUCKETS" | while read bucket; do
        if [ "$DRY_RUN" = "true" ]; then
            echo -e "${YELLOW}[DRY RUN]${NC} S3 Bucket: $bucket (would be emptied and deleted)"
        else
            echo -e "${GREEN}Emptying${NC} S3 Bucket: $bucket"
            aws s3 rm "s3://$bucket" --recursive --profile $PROFILE
            sleep 1
            echo -e "${GREEN}Deleting${NC} S3 Bucket: $bucket"
            aws s3api delete-bucket --bucket "$bucket" --profile $PROFILE
            sleep 1
        fi
    done
fi
echo ""

echo -e "${GREEN}=== Cleanup Complete ===${NC}"
if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}This was a dry run. To actually delete resources, run:${NC}"
    echo -e "  ${GREEN}DRY_RUN=false $0${NC}"
fi
