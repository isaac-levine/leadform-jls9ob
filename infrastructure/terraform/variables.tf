# Core project configuration
variable "project_name" {
  type        = string
  description = "Project name for Vercel deployment"
  default     = "lead-capture-sms-platform"
}

variable "environment" {
  type        = string
  description = "Environment name for deployment"
  
  validation {
    condition     = contains(["production", "staging"], var.environment)
    error_message = "Environment must be either production or staging"
  }
}

# Vercel configuration
variable "vercel_api_token" {
  type        = string
  description = "API token for Vercel authentication"
  sensitive   = true
}

variable "vercel_team_id" {
  type        = string
  description = "Team ID for Vercel deployment"
  sensitive   = true
}

# MongoDB Atlas configuration
variable "mongodb_atlas_public_key" {
  type        = string
  description = "Public key for MongoDB Atlas authentication"
  sensitive   = true
}

variable "mongodb_atlas_private_key" {
  type        = string
  description = "Private key for MongoDB Atlas authentication"
  sensitive   = true
}

variable "mongodb_atlas_project_id" {
  type        = string
  description = "Project ID for MongoDB Atlas resources"
  sensitive   = true
}

variable "mongodb_cluster_name" {
  type        = string
  description = "Cluster name for MongoDB Atlas"
  default     = "lead-capture-cluster"
}

variable "mongodb_instance_size" {
  type        = string
  description = "MongoDB Atlas instance size"
  default     = "M10"
}

variable "mongodb_version" {
  type        = string
  description = "MongoDB major version"
  default     = "6.0"
}

# Terraform version constraint
terraform {
  required_version = ">=1.0.0"
}