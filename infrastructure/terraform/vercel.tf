# Configure Terraform providers
terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }
}

# Configure Vercel provider
provider "vercel" {
  api_token = var.vercel_api_token
}

# Vercel Project Configuration
resource "vercel_project" "main" {
  name = var.project_name
  framework = "nextjs"
  
  # Git repository configuration
  git_repository = {
    type = "github"
    production_branch = "main"
    deploy_hooks_enabled = true
  }

  # Build configuration
  build_command = "npm run build"
  install_command = "npm ci"
  output_directory = ".next"
  root_directory = "."
  
  # Serverless function configuration
  serverless_function_region = "iad1"

  # Environment variables
  environment = [
    {
      key     = "NODE_ENV"
      value   = var.environment
      target  = ["production", "preview"]
    },
    {
      key     = "MONGODB_URI"
      value   = var.mongodb_uri
      target  = ["production", "preview"]
      type    = "encrypted"
    },
    {
      key     = "NEXT_PUBLIC_API_URL"
      value   = var.environment == "production" ? "https://api.leadcapture.com" : "https://api.staging.leadcapture.com"
      target  = ["production", "preview"]
    }
  ]
}

# Vercel Deployment Configuration
resource "vercel_deployment" "main" {
  project_id = vercel_project.main.id
  production = true

  # Multi-region deployment for improved latency
  regions = ["iad1", "sfo1", "dub1"]

  # Runtime environment configuration
  environment = {
    npm_version  = "9.x"
    node_version = "18.x"
  }

  # Git integration settings
  git_integration = {
    deploy_on_push      = true
    production_branch   = "main"
  }

  # Protection settings
  protection_bypass = {
    deployment_protection = false
    password_protection  = true
  }
}

# Custom Domain Configuration
resource "vercel_domain" "main" {
  project_id = vercel_project.main.id
  domain     = var.environment == "production" ? "app.leadcapture.com" : "staging.leadcapture.com"
  git_branch = var.environment == "production" ? "main" : "staging"
  
  # No redirects configured
  redirect              = null
  redirect_status_code  = null
}

# Output values for reference
output "vercel_project_id" {
  description = "The ID of the created Vercel project"
  value       = vercel_project.main.id
}

output "vercel_deployment_url" {
  description = "The URL of the Vercel deployment"
  value       = vercel_deployment.main.url
}

output "vercel_domain_configuration" {
  description = "Domain configuration details"
  value       = vercel_domain.main.domain
}