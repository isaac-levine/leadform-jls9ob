#!/bin/bash

# Lead Capture & SMS Platform Deployment Script
# Version: 1.0.0
# This script automates the deployment process for the Lead Capture & SMS Platform
# using Terraform for infrastructure provisioning on Vercel and MongoDB Atlas.

set -euo pipefail

# Global Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/../terraform"
ENVIRONMENTS_DIR="${TERRAFORM_DIR}/environments"
LOG_FILE="/var/log/deployment.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Required environment variables
REQUIRED_ENV_VARS=(
    "VERCEL_API_TOKEN"
    "MONGODB_ATLAS_PUBLIC_KEY"
    "MONGODB_ATLAS_PRIVATE_KEY"
)

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function with timestamp and status
log_deployment() {
    local message="$1"
    local status="$2"
    local log_entry="[${TIMESTAMP}] [${status}] ${message}"
    
    # Ensure log directory exists with proper permissions
    if [[ ! -d "$(dirname "${LOG_FILE}")" ]]; then
        sudo mkdir -p "$(dirname "${LOG_FILE}")"
        sudo chmod 755 "$(dirname "${LOG_FILE}")"
    fi
    
    # Write to log file
    echo "${log_entry}" | sudo tee -a "${LOG_FILE}" >/dev/null
    
    # Output to console with color based on status
    case "${status}" in
        "INFO")  echo -e "${GREEN}${log_entry}${NC}" ;;
        "WARN")  echo -e "${YELLOW}${log_entry}${NC}" ;;
        "ERROR") echo -e "${RED}${log_entry}${NC}" ;;
        *)       echo "${log_entry}" ;;
    esac
}

# Function to check all prerequisites
check_prerequisites() {
    log_deployment "Checking deployment prerequisites..." "INFO"
    
    # Check Terraform version
    if ! terraform version | grep -q "v1.5"; then
        log_deployment "Required Terraform v1.5.x not found" "ERROR"
        return 1
    fi
    
    # Verify required environment variables
    for var in "${REQUIRED_ENV_VARS[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_deployment "Required environment variable ${var} is not set" "ERROR"
            return 1
        fi
    done
    
    # Check if tfvars files exist and are readable
    if [[ ! -r "${ENVIRONMENTS_DIR}/production.tfvars" ]] || [[ ! -r "${ENVIRONMENTS_DIR}/staging.tfvars" ]]; then
        log_deployment "Environment tfvars files not found or not readable" "ERROR"
        return 1
    }
    
    # Verify MongoDB Atlas API access
    if ! curl -s -u "${MONGODB_ATLAS_PUBLIC_KEY}:${MONGODB_ATLAS_PRIVATE_KEY}" \
        "https://cloud.mongodb.com/api/atlas/v1.0/groups" > /dev/null; then
        log_deployment "MongoDB Atlas API access verification failed" "ERROR"
        return 1
    fi
    
    # Verify Vercel API access
    if ! curl -s -H "Authorization: Bearer ${VERCEL_API_TOKEN}" \
        "https://api.vercel.com/v9/projects" > /dev/null; then
        log_deployment "Vercel API access verification failed" "ERROR"
        return 1
    }
    
    log_deployment "All prerequisites checked successfully" "INFO"
    return 0
}

# Function to initialize Terraform
init_terraform() {
    local environment="$1"
    log_deployment "Initializing Terraform for ${environment} environment..." "INFO"
    
    cd "${TERRAFORM_DIR}"
    
    # Select or create workspace
    if ! terraform workspace select "${environment}" 2>/dev/null; then
        terraform workspace new "${environment}"
    fi
    
    # Initialize Terraform
    if ! terraform init -upgrade; then
        log_deployment "Terraform initialization failed" "ERROR"
        return 1
    fi
    
    # Validate Terraform configuration
    if ! terraform validate; then
        log_deployment "Terraform configuration validation failed" "ERROR"
        return 1
    }
    
    log_deployment "Terraform initialized successfully" "INFO"
    return 0
}

# Function to apply Terraform configuration
apply_terraform() {
    local environment="$1"
    local tfvars_file="${ENVIRONMENTS_DIR}/${environment}.tfvars"
    
    log_deployment "Applying Terraform configuration for ${environment}..." "INFO"
    
    # Create plan
    if ! terraform plan -var-file="${tfvars_file}" -out=tfplan; then
        log_deployment "Terraform plan creation failed" "ERROR"
        return 1
    fi
    
    # Apply configuration
    if ! terraform apply -auto-approve tfplan; then
        log_deployment "Terraform apply failed" "ERROR"
        return 1
    fi
    
    # Verify deployment
    if ! verify_deployment "${environment}"; then
        log_deployment "Deployment verification failed" "ERROR"
        return 1
    fi
    
    log_deployment "Terraform configuration applied successfully" "INFO"
    return 0
}

# Function to verify deployment
verify_deployment() {
    local environment="$1"
    local retries=5
    local wait_time=30
    
    log_deployment "Verifying deployment for ${environment}..." "INFO"
    
    # Get outputs
    local mongodb_connection_string=$(terraform output -raw mongodb_connection_string)
    local vercel_deployment_url=$(terraform output -raw vercel_deployment_url)
    
    # Verify MongoDB connection
    for ((i=1; i<=retries; i++)); do
        if mongosh "${mongodb_connection_string}" --eval "db.adminCommand('ping')" &>/dev/null; then
            log_deployment "MongoDB connection verified" "INFO"
            break
        fi
        if ((i == retries)); then
            log_deployment "MongoDB connection verification failed after ${retries} attempts" "ERROR"
            return 1
        fi
        sleep "${wait_time}"
    done
    
    # Verify Vercel deployment
    for ((i=1; i<=retries; i++)); do
        if curl -sf "${vercel_deployment_url}/api/health" &>/dev/null; then
            log_deployment "Vercel deployment verified" "INFO"
            break
        fi
        if ((i == retries)); then
            log_deployment "Vercel deployment verification failed after ${retries} attempts" "ERROR"
            return 1
        fi
        sleep "${wait_time}"
    done
    
    log_deployment "Deployment verification completed successfully" "INFO"
    return 0
}

# Main script execution
main() {
    local environment="${1:-}"
    
    # Validate environment argument
    if [[ "${environment}" != "production" ]] && [[ "${environment}" != "staging" ]]; then
        log_deployment "Usage: $0 <environment> (production|staging)" "ERROR"
        exit 1
    fi
    
    # Execute deployment steps
    if ! check_prerequisites; then
        exit 1
    fi
    
    if ! init_terraform "${environment}"; then
        exit 1
    fi
    
    if ! apply_terraform "${environment}"; then
        exit 1
    fi
    
    log_deployment "Deployment completed successfully for ${environment} environment" "INFO"
    exit 0
}

# Execute main function with environment argument
main "$@"