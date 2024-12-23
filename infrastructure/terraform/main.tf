terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.0"
    }
  }

  backend "s3" {
    bucket         = "lead-capture-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Environment-specific configurations
locals {
  environment_config = {
    development = {
      mongodb_instance_size = "M10"
      backup_enabled       = false
    }
    staging = {
      mongodb_instance_size = "M20"
      backup_enabled       = true
    }
    production = {
      mongodb_instance_size = "M30"
      backup_enabled       = true
    }
  }
  current_config = local.environment_config[var.environment]
}

# Vercel Project Configuration
resource "vercel_project" "main" {
  name = var.project_name
  framework = "nextjs"
  
  git_repository {
    type              = "github"
    production_branch = "main"
    deploy_on_push    = true
  }

  build_command       = "npm run build"
  development_command = "npm run dev"
  root_directory      = "."
  ignore_command      = "git diff --quiet HEAD^ HEAD ./"

  environment {
    key     = "MONGODB_URI"
    value   = mongodbatlas_cluster.main.connection_strings[0].standard
    target  = ["production", "preview"]
    type    = "encrypted"
  }

  environment {
    key     = "NODE_ENV"
    value   = var.environment
    target  = ["production", "preview"]
  }

  environment {
    key     = "NEXT_PUBLIC_API_URL"
    value   = var.api_url
    target  = ["production", "preview"]
  }
}

# Vercel Deployment Configuration
resource "vercel_deployment" "main" {
  project_id = vercel_project.main.id
  production = true

  files {
    file = "package.json"
    data = file("../../package.json")
  }

  files {
    file = "next.config.js"
    data = file("../../next.config.js")
  }

  lifecycle_hooks {
    build {
      command   = "npm run build"
      directory = "."
    }
  }
}

# MongoDB Atlas Cluster Configuration
resource "mongodbatlas_cluster" "main" {
  project_id = var.mongodb_project_id
  name       = "${var.project_name}-${var.environment}"
  
  cluster_type = "REPLICASET"
  
  replication_specs {
    num_shards = 1
    regions_config {
      region_name     = "US_EAST_1"
      priority        = 7
      read_only_nodes = 0
      electable_nodes = 3
    }
  }

  provider_settings {
    provider_name        = "AWS"
    instance_size_name   = local.current_config.mongodb_instance_size
    region_name         = "US_EAST_1"
  }

  backup_enabled                 = local.current_config.backup_enabled
  auto_scaling_disk_gb_enabled  = true
  mongo_db_major_version        = "6.0"
}

# Output Definitions
output "vercel_deployment_url" {
  description = "URL of the deployed application"
  value       = vercel_deployment.main.url
  sensitive   = false
}

output "mongodb_connection_string" {
  description = "MongoDB Atlas connection string"
  value       = mongodbatlas_cluster.main.connection_strings[0].standard
  sensitive   = true
}

output "environment_config" {
  description = "Current environment configuration"
  value       = local.current_config
  sensitive   = false
}