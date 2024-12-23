# Configure Terraform core and required providers
terraform {
  # Enforce minimum Terraform version for stability
  required_version = ">= 1.0.0"

  # Define required providers with version constraints
  required_providers {
    # Vercel provider for deployment platform
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }

    # MongoDB Atlas provider for database management
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.0"
    }
  }
}

# Configure Vercel provider with secure credential handling
provider "vercel" {
  # Secure API token from variables
  api_token = var.vercel_api_token

  # Team ID for deployment scoping
  team = var.vercel_team_id

  # Configure provider timeouts and retries for reliability
  timeout      = 300  # 5 minutes timeout for operations
  retry_count  = 3    # Retry failed operations up to 3 times
}

# Configure MongoDB Atlas provider with secure credential handling
provider "mongodbatlas" {
  # Secure authentication credentials from variables
  public_key  = var.mongodb_atlas_public_key
  private_key = var.mongodb_atlas_private_key

  # Configure provider timeouts and retries for reliability
  retry_timeout = 300  # 5 minutes timeout for retries
  max_retries   = 3    # Maximum retry attempts for failed operations
}