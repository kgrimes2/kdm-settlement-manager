.PHONY: help plan create destroy init validate fmt dev2-plan dev2-create dev2-destroy prod2-plan prod2-create prod2-destroy

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
PROFILE := terraform-kdm

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
	@echo ""
	@echo "Convenience targets (venue-specific):"
	@echo "  $(YELLOW)dev-plan$(NC)       - Plan dev infrastructure"
	@echo "  $(YELLOW)dev-create$(NC)     - Create/apply dev infrastructure"
	@echo "  $(YELLOW)dev-destroy$(NC)    - Destroy dev infrastructure"
	@echo "  $(YELLOW)prod-plan$(NC)      - Plan prod infrastructure"
	@echo "  $(YELLOW)prod-create$(NC)    - Create/apply prod infrastructure"
	@echo "  $(YELLOW)prod-destroy$(NC)   - Destroy prod infrastructure"
	@echo ""
	@echo "Examples:"
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
	terraform workspace select $(WORKSPACE) 2>/dev/null || terraform workspace new $(WORKSPACE) && \
	echo "$(GREEN)Switched to workspace: $(WORKSPACE)$(NC)"

init: _check_venue
	@cd $(TF_DIR) && \
	echo "$(YELLOW)Initializing Terraform...$(NC)" && \
	terraform init \
		-backend-config="bucket=$(STATE_BUCKET)" \
		-backend-config="key=terraform.tfstate" \
		-backend-config="workspace_key_prefix=kdm-app" \
		-backend-config="region=$(STATE_REGION)" \
		-backend-config="profile=$(PROFILE)" && \
	echo "$(YELLOW)Switching to workspace: $(WORKSPACE)$(NC)" && \
	terraform workspace select $(WORKSPACE) 2>/dev/null || terraform workspace new $(WORKSPACE) && \
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
		-out=tfplan

create: plan
	@cd $(TF_DIR) && \
	echo "$(RED)Applying infrastructure changes to $(VENUE)...$(NC)" && \
	terraform apply tfplan && \
	rm -f tfplan && \
	echo "$(GREEN)Infrastructure applied successfully$(NC)"

destroy: init
	@cd $(TF_DIR) && \
	echo "$(RED)WARNING: Destroying infrastructure for $(VENUE)$(NC)" && \
	echo "$(RED)This will permanently delete all resources.$(NC)" && \
	read -p "Are you sure you want to destroy $(VENUE)? (type 'yes' to confirm): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		terraform destroy \
			-var="environment=$(ENVIRONMENT)" \
			-var="aws_region=$(AWS_REGION)" && \
		echo "$(GREEN)Infrastructure destroyed$(NC)"; \
	else \
		echo "$(YELLOW)Destroy cancelled$(NC)"; \
	fi

# Convenience targets for dev
dev-init:
	@$(MAKE) init VENUE=dev

dev-plan:
	@$(MAKE) plan VENUE=dev

dev-create:
	@$(MAKE) create VENUE=dev

dev-destroy:
	@$(MAKE) destroy VENUE=dev

# Convenience targets for prod
prod-init:
	@$(MAKE) init VENUE=prod

prod-plan:
	@$(MAKE) plan VENUE=prod

prod-create:
	@$(MAKE) create VENUE=prod

prod-destroy:
	@$(MAKE) destroy VENUE=prod
