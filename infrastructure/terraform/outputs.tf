# Vercel deployment outputs
output "vercel_deployment_url" {
  description = "URL where the application is accessible"
  value       = vercel_project.main.deployment_url
  sensitive   = false
}

output "vercel_project_id" {
  description = "Vercel project identifier"
  value       = vercel_project.main.id
  sensitive   = false
}

# MongoDB connection outputs
output "mongodb_connection_string" {
  description = "Connection string for MongoDB Atlas cluster"
  value       = mongodbatlas_cluster.mongodb_cluster.connection_strings[0].standard
  sensitive   = true # Marked as sensitive to prevent exposure in logs
}

output "mongodb_database_name" {
  description = "Environment-specific database name"
  value       = "lead_capture_${var.environment}"
  sensitive   = false
}

# Additional deployment information
output "mongodb_cluster_state" {
  description = "Current state of the MongoDB cluster"
  value       = mongodbatlas_cluster.mongodb_cluster.state_name
  sensitive   = false
}

output "vercel_domain" {
  description = "Custom domain configured for the deployment"
  value       = vercel_domain.main.domain
  sensitive   = false
}

output "deployment_environment" {
  description = "Current deployment environment"
  value       = var.environment
  sensitive   = false
}

output "mongodb_backup_window" {
  description = "Backup window configuration for MongoDB cluster"
  value = {
    reference_hour   = mongodbatlas_cloud_backup_schedule.mongodb_backup_policy.reference_hour_of_day
    reference_minute = mongodbatlas_cloud_backup_schedule.mongodb_backup_policy.reference_minute_of_hour
    retention_days   = mongodbatlas_cloud_backup_schedule.mongodb_backup_policy.restore_window_days
  }
  sensitive = false
}