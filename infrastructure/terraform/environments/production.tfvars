# Project Configuration
project_name = "lead-capture-sms-platform"
environment  = "production"

# MongoDB Atlas Configuration
mongodb_cluster_name  = "lead-capture-cluster-prod"
mongodb_instance_size = "M30"
mongodb_version      = "6.0"

# MongoDB Atlas Production Settings
mongodb_backup_enabled = true
mongodb_backup_schedule = {
  type      = "continuous"
  retention = "7" # 7 days retention for point-in-time recovery
}

# MongoDB Atlas Production Scaling Settings
mongodb_auto_scaling = {
  enabled          = true
  min_instance_size = "M30"
  max_instance_size = "M40"
  target_utilization = 70
}

# MongoDB Atlas Production Security Settings
mongodb_encryption_at_rest = true
mongodb_network_peering = {
  enabled = true
  cidr_block = "10.0.0.0/16"
}

# MongoDB Atlas Production Performance Settings
mongodb_disk_size_gb = 100
mongodb_indexes = {
  priority = "high"
  build_in_background = true
}

# MongoDB Atlas Production High Availability Settings
mongodb_cluster_type = "REPLICASET"
mongodb_num_shards = 1
mongodb_replication_specs = {
  num_nodes      = 3
  region_configs = {
    priority     = 7
    votes       = 1
  }
}

# Vercel Production Deployment Settings
vercel_production_settings = {
  framework_version = "14.x"
  regions          = ["iad1", "sfo1", "dub1"] # Multi-region deployment
  min_instances    = 1
  max_instances    = 10
}

# Production Environment Variables (Non-sensitive)
environment_variables = {
  NODE_ENV = "production"
  LOG_LEVEL = "info"
  API_RATE_LIMIT = "100"
  CACHE_TTL = "3600"
}

# Production Monitoring and Analytics Settings
monitoring_settings = {
  error_tracking  = true
  performance_monitoring = true
  custom_metrics  = true
  alert_channels  = ["email", "slack"]
}

# Production Database Connection Settings
mongodb_connection_settings = {
  max_pool_size = 100
  min_pool_size = 10
  max_idle_time_ms = 120000
  connection_timeout_ms = 30000
}

# Production API Gateway Settings
api_gateway_settings = {
  timeout_ms = 30000
  cors_origins = ["https://app.leadcapturesms.com"]
  rate_limit_window_ms = 60000
  rate_limit_max_requests = 100
}

# Production SMS Provider Settings
sms_provider_settings = {
  max_concurrent_requests = 50
  retry_attempts = 3
  retry_delay_ms = 1000
  timeout_ms = 5000
}

# Production Cache Settings
cache_settings = {
  enabled = true
  ttl_seconds = 3600
  max_size_mb = 1024
}