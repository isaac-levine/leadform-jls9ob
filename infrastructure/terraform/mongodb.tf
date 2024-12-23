# MongoDB Atlas Provider Configuration
# Provider version: ~> 1.0
terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.0"
    }
  }
}

# MongoDB Atlas Cluster Configuration
resource "mongodbatlas_cluster" "mongodb_cluster" {
  project_id = var.mongodb_atlas_project_id
  name       = "${var.mongodb_cluster_name}-${var.environment}"

  # Cluster Configuration
  cluster_type = "REPLICASET"
  replication_specs {
    num_shards = 1
    regions_config {
      region_name     = "US_EAST_1"
      electable_nodes = 3
      priority        = 7
      read_only_nodes = 0
    }
  }

  # Provider Settings
  provider_name               = "AWS"
  provider_instance_size_name = var.mongodb_instance_size
  mongo_db_major_version     = var.mongodb_version

  # Advanced Configuration
  auto_scaling_disk_gb_enabled = true
  provider_backup_enabled      = true
  pit_enabled                 = true # Point-in-time recovery

  # Additional Settings
  advanced_configuration {
    javascript_enabled                   = false # Security best practice
    minimum_enabled_tls_protocol        = "TLS1_2"
    no_table_scan                       = false
    oplog_size_mb                       = 2048
    sample_size_bi_connector           = 5000
    sample_refresh_interval_bi_connector = 300
  }

  # Tags for resource management
  tags {
    key   = "Environment"
    value = var.environment
  }
}

# Backup Policy Configuration
resource "mongodbatlas_cloud_backup_schedule" "mongodb_backup_policy" {
  project_id   = var.mongodb_atlas_project_id
  cluster_name = mongodbatlas_cluster.mongodb_cluster.name

  reference_hour_of_day    = 3    # 3 AM UTC
  reference_minute_of_hour = 0

  # Retention settings
  restore_window_days = 7

  # Backup policy items
  policy_item_hourly {
    frequency_interval = 6
    retention_unit    = "days"
    retention_value   = 7
  }

  policy_item_daily {
    frequency_interval = 1
    retention_unit    = "days"
    retention_value   = 14
  }

  policy_item_weekly {
    frequency_interval = 1
    retention_unit    = "weeks"
    retention_value   = 4
  }

  policy_item_monthly {
    frequency_interval = 1
    retention_unit    = "months"
    retention_value   = 12
  }
}

# Network Container Configuration
resource "mongodbatlas_network_container" "mongodb_network_container" {
  project_id       = var.mongodb_atlas_project_id
  atlas_cidr_block = "10.0.0.0/16"
  provider_name    = "AWS"
  region_name      = "US_EAST_1"
}

# Network Peering Configuration
resource "mongodbatlas_network_peering" "mongodb_network_peering" {
  project_id     = var.mongodb_atlas_project_id
  container_id   = mongodbatlas_network_container.mongodb_network_container.id
  
  provider_name        = "AWS"
  route_table_cidr_block = "10.0.0.0/16"
  vpc_id              = "vpc-placeholder" # To be replaced with actual VPC ID
  aws_account_id      = "placeholder"     # To be replaced with actual AWS account ID
  region_name         = "US_EAST_1"
}

# IP Access List Configuration
resource "mongodbatlas_project_ip_access_list" "mongodb_ip_access" {
  project_id = var.mongodb_atlas_project_id
  cidr_block = "0.0.0.0/0"  # Should be restricted in production
  comment    = "Allow access from Vercel deployment"
}

# Database User Configuration
resource "mongodbatlas_database_user" "mongodb_user" {
  project_id         = var.mongodb_atlas_project_id
  username          = "app-user-${var.environment}"
  password          = "placeholder"  # Should be replaced with secure password

  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = "lead_capture_db"
  }

  scopes {
    name = mongodbatlas_cluster.mongodb_cluster.name
    type = "CLUSTER"
  }
}

# Output Configuration
output "mongodb_cluster_connection_string" {
  description = "MongoDB cluster connection string"
  value       = mongodbatlas_cluster.mongodb_cluster.connection_strings[0].standard
  sensitive   = true
}

output "mongodb_cluster_id" {
  description = "MongoDB cluster ID"
  value       = mongodbatlas_cluster.mongodb_cluster.cluster_id
}

output "mongodb_cluster_state" {
  description = "MongoDB cluster state"
  value       = mongodbatlas_cluster.mongodb_cluster.state_name
}