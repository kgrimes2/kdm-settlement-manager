.PHONY: help plan create destroy init validate fmt deploy build env dev2-plan dev2-create dev2-destroy prod2-plan prod2-create prod2-destroy dev-deploy prod-deploy

# Color output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

# Default values
VENUE ?= dev
TF_DIR := infrastructure/terraform
STATE_BUCKET := kdm-terraform-state-469983200708
STATE_REGION := us-west-2
# Set PROFILE to your local AWS CLI profile name.
# Leave empty (or unset) on Cloud9 where the instance role is used instead.
PROFILE ?= terraform-kdm

# Venue-specific configuration
ifeq ($(VENUE),dev)
	ENVIRONMENT := dev
	AWS_REGION := us-west-2
	WORKSPACE := dev
else ifeq ($(VENUE),prod)
	ENVIRONMENT := prod
	AWS_REGION := us-west-2
	WORKSPACE := prod
else
	$(error Invalid VENUE. Choose 'dev' or 'prod')
endif

help:
	@echo "$(GREEN)Multi-Venue Terraform Deployment$(NC)"
	@echo ""
	@echo "Usage: make [target] VENUE=[dev|prod]"
	@echo ""
	@echo "Targets:"
	@echo "  $(YELLOW)plan$(NC)           - Plan infrastructure changes (default: VENUE=dev)"
	@echo "  $(YELLOW)create$(NC)         - Apply infrastructure changes (default: VENUE=dev)"
	@echo "  $(YELLOW)destroy$(NC)        - Destroy infrastructure (default: VENUE=dev)"
	@echo "  $(YELLOW)init$(NC)           - Initialize Terraform (default: VENUE=dev)"
	@echo "  $(YELLOW)validate$(NC)       - Validate Terraform configuration (default: VENUE=dev)"
	@echo "  $(YELLOW)fmt$(NC)            - Format Terraform files"
	@echo "  $(YELLOW)build$(NC)          - Build the frontend (npm install + vite build)"
	@echo "  $(YELLOW)env$(NC)            - Write .env.local from Terraform outputs (default: VENUE=dev)"
	@echo "  $(YELLOW)deploy$(NC)         - Generate .env.local + build + deploy to S3/CloudFront (default: VENUE=dev)"
	@echo ""
	@echo "Convenience targets (venue-specific):"
	@echo "  $(YELLOW)dev-plan$(NC)       - Plan dev infrastructure"
	@echo "  $(YELLOW)dev-create$(NC)     - Create/apply dev infrastructure"
	@echo "  $(YELLOW)dev-destroy$(NC)    - Destroy dev infrastructure"
	@echo "  $(YELLOW)dev-deploy$(NC)     - Build + deploy frontend to dev"
	@echo "  $(YELLOW)prod-plan$(NC)      - Plan prod infrastructure"
	@echo "  $(YELLOW)prod-create$(NC)    - Create/apply prod infrastructure"
	@echo "  $(YELLOW)prod-destroy$(NC)   - Destroy prod infrastructure"
	@echo "  $(YELLOW)prod-deploy$(NC)    - Build + deploy frontend to prod"
	@echo ""
	@echo "Examples:"
	@echo "  make deploy VENUE=dev"
	@echo "  make dev-deploy"
	@echo "  make prod-deploy"
	@echo "  make plan VENUE=dev"
	@echo "  make dev-plan"
	@echo "  make prod-create"

# Internal target to switch workspace
.PHONY: _check_venue _switch_workspace
_check_venue:
	@echo "$(YELLOW)Venue: $(VENUE)$(NC) | $(YELLOW)Environment: $(ENVIRONMENT)$(NC) | $(YELLOW)Workspace: $(WORKSPACE)$(NC)"

_switch_workspace: _check_venue
	@cd $(TF_DIR) && \
	echo "$(YELLOW)Switching to workspace: $(WORKSPACE)$(NC)" && \
	( terraform workspace select $(WORKSPACE) 2>/dev/null || terraform workspace new $(WORKSPACE) ) && \
	echo "$(GREEN)Switched to workspace: $(WORKSPACE)$(NC)"

# Conditionally pass profile flags — omitted on Cloud9 where instance role is used
ifdef PROFILE
  BACKEND_PROFILE_FLAG := -backend-config="profile=$(PROFILE)"
  PROFILE_VAR_FLAG     := -var="aws_profile=$(PROFILE)"
else
  BACKEND_PROFILE_FLAG :=
  PROFILE_VAR_FLAG     :=
endif

init: _check_venue
	@cd $(TF_DIR) && \
	echo "$(YELLOW)Initializing Terraform...$(NC)" && \
	terraform init \
		-backend-config="bucket=$(STATE_BUCKET)" \
		-backend-config="key=terraform.tfstate" \
		-backend-config="workspace_key_prefix=kdm-app" \
		-backend-config="region=$(STATE_REGION)" \
		$(BACKEND_PROFILE_FLAG) && \
	echo "$(YELLOW)Switching to workspace: $(WORKSPACE)$(NC)" && \
	( terraform workspace select $(WORKSPACE) 2>/dev/null || terraform workspace new $(WORKSPACE) ) && \
	echo "$(GREEN)Switched to workspace: $(WORKSPACE)$(NC)"

validate: init
	@cd $(TF_DIR) && \
	echo "$(YELLOW)Validating Terraform configuration...$(NC)" && \
	terraform validate

fmt:
	@cd $(TF_DIR) && \
	echo "$(YELLOW)Formatting Terraform files...$(NC)" && \
	terraform fmt -recursive && \
	echo "$(GREEN)Terraform files formatted$(NC)"

plan: init
	@cd $(TF_DIR) && \
	echo "$(YELLOW)Planning infrastructure changes for $(VENUE)...$(NC)" && \
	terraform plan \
		-var="environment=$(ENVIRONMENT)" \
		-var="aws_region=$(AWS_REGION)" \
		$(PROFILE_VAR_FLAG) \
		-out=tfplan

create: plan
	@cd $(TF_DIR) && \
	echo "$(RED)Applying infrastructure changes to $(VENUE)...$(NC)" && \
	terraform apply tfplan && \
	rm -f tfplan && \
	echo "$(GREEN)Infrastructure applied successfully$(NC)"
	@$(MAKE) deploy VENUE=$(VENUE)

destroy: init
	@cd $(TF_DIR) && \
	echo "$(RED)WARNING: Destroying infrastructure for $(VENUE)$(NC)" && \
	echo "$(RED)This will permanently delete all resources.$(NC)" && \
	read -p "Are you sure you want to destroy $(VENUE)? (type 'yes' to confirm): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		terraform destroy \
			-var="environment=$(ENVIRONMENT)" \
			-var="aws_region=$(AWS_REGION)" \
			$(PROFILE_VAR_FLAG) && \
		echo "$(GREEN)Infrastructure destroyed$(NC)"; \
	else \
		echo "$(YELLOW)Destroy cancelled$(NC)"; \
	fi

build:
	@echo "$(YELLOW)Installing dependencies...$(NC)" && \
	npm install --production=false && \
	echo "$(YELLOW)Building frontend...$(NC)" && \
	npm run build && \
	echo "$(GREEN)Frontend built successfully ($$( du -sh dist | cut -f1))$(NC)"

env: 
	@echo "$(YELLOW)Generating .env.local from Terraform outputs for $(VENUE)...$(NC)"
	@cd $(TF_DIR) && terraform workspace select $(WORKSPACE) 2>/dev/null; \
	printf "VITE_COGNITO_USER_POOL_ID=%s\nVITE_COGNITO_CLIENT_ID=%s\nVITE_COGNITO_REGION=us-west-2\nVITE_API_GATEWAY_URL=%s\n" \
		"$$(terraform output -raw cognito_user_pool_id)" \
		"$$(terraform output -raw cognito_client_id)" \
		"$$(terraform output -raw api_gateway_invoke_url)" \
		> ../../.env.local
	@echo "$(GREEN).env.local written$(NC)"

deploy: env build
	@echo "$(YELLOW)Deploying frontend to $(VENUE)...$(NC)"
	@S3_BUCKET=$$(cd $(TF_DIR) && terraform workspace select $(WORKSPACE) 2>/dev/null && terraform output -raw s3_bucket_name 2>/dev/null); \
	if [ -z "$$S3_BUCKET" ]; then \
		echo "$(RED)Failed to get S3 bucket from Terraform. Has 'make $(VENUE)-create' been run?$(NC)"; \
		exit 1; \
	fi; \
	echo "$(YELLOW)Syncing to s3://$$S3_BUCKET ...$(NC)"; \
	aws s3 sync dist/ s3://$$S3_BUCKET/app/ --delete --sse AES256 --cache-control "public, max-age=3600"; \
	echo "$(GREEN)Files uploaded to S3$(NC)"; \
	DIST_ID=$$(cd $(TF_DIR) && terraform workspace select $(WORKSPACE) 2>/dev/null && terraform output -raw cloudfront_distribution_id 2>/dev/null); \
	if [ -n "$$DIST_ID" ]; then \
		echo "$(YELLOW)Invalidating CloudFront cache ($$DIST_ID)...$(NC)"; \
		aws cloudfront create-invalidation --distribution-id $$DIST_ID --paths "/*" > /dev/null; \
		echo "$(GREEN)Cache invalidation requested$(NC)"; \
	fi; \
	APP_URL=$$(cd $(TF_DIR) && terraform workspace select $(WORKSPACE) 2>/dev/null && terraform output -raw cloudfront_domain_name 2>/dev/null); \
	echo ""; \
	echo "$(GREEN)Deployment complete! App available at: https://$$APP_URL$(NC)"

# Convenience targets for dev
dev-init:
	@$(MAKE) init VENUE=dev

dev-plan:
	@$(MAKE) plan VENUE=dev

dev-create:
	@$(MAKE) create VENUE=dev

dev-destroy:
	@$(MAKE) destroy VENUE=dev

dev-deploy:
	@$(MAKE) deploy VENUE=dev

# Convenience targets for prod
prod-init:
	@$(MAKE) init VENUE=prod

prod-plan:
	@$(MAKE) plan VENUE=prod

prod-create:
	@$(MAKE) create VENUE=prod

prod-destroy:
	@$(MAKE) destroy VENUE=prod

prod-deploy:
	@$(MAKE) deploy VENUE=prod
