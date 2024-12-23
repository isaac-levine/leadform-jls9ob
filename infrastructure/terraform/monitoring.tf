# Provider configurations
terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 1.0"
    }
    prometheus = {
      source  = "prometheus/prometheus"
      version = "~> 1.0"
    }
  }
}

# Prometheus workspace configuration with enhanced retention and performance settings
resource "prometheus_workspace" "monitoring" {
  name = "${var.project_name}-${var.environment}-prometheus"
  
  # Enhanced retention and storage settings
  retention_period        = "30d"
  storage_retention_size  = "50GB"
  ingestion_rate         = 10000
  max_samples_per_query  = 50000000
  query_timeout          = "2m"
  
  # Federation and scalability settings
  federation_enabled     = true
  metrics_endpoint_uri   = "/metrics"

  # Security settings
  tls_enabled           = true
  enforce_auth          = true

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# Grafana workspace with advanced security and clustering
resource "grafana_workspace" "monitoring" {
  name = "${var.project_name}-${var.environment}-grafana"
  
  # Version and core settings
  version              = "9.0"
  admin_password       = sensitive(random_password.grafana_admin.result)
  
  # Enterprise features
  clustering_enabled   = true
  auth_proxy_enabled  = true
  audit_logs_enabled  = true
  
  # Retention and performance
  metrics_retention_days = 30
  auto_assign_org      = true

  # Security settings
  allow_embedding     = false
  cookie_secure       = true
  disable_gravatar    = true

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# Prometheus scraping configuration with optimized intervals
resource "prometheus_scrape_config" "lead_capture" {
  job_name            = "lead-capture-platform"
  scrape_interval     = "15s"
  evaluation_interval = "15s"

  static_configs {
    targets = ["localhost:3000"]
    labels = {
      environment = var.environment
      service     = "lead-capture"
    }
  }

  # Drop unnecessary metrics for optimization
  metric_relabel_configs {
    source_labels = ["__name__"]
    regex         = "go_.*"
    action        = "drop"
  }

  # Service discovery settings
  consul_sd_configs {
    server = "localhost:8500"
    services = ["lead-capture-api"]
  }
}

# System metrics dashboard with correlation capabilities
resource "grafana_dashboard" "system_metrics" {
  name         = "System Metrics"
  folder       = "Lead Capture Platform"
  dashboard_json = file("../monitoring/grafana/dashboards/system-metrics.json")

  config {
    refresh_interval = "1m"
    time_range      = "now-6h"
    
    variables = {
      environment = var.environment
      service     = "lead-capture"
    }
  }

  depends_on = [grafana_workspace.monitoring]
}

# Application performance dashboard
resource "grafana_dashboard" "application_metrics" {
  name           = "Application Metrics"
  folder         = "Lead Capture Platform"
  dashboard_json = file("../monitoring/grafana/dashboards/application-metrics.json")

  config {
    refresh_interval = "30s"
    time_range      = "now-3h"
    
    variables = {
      environment = var.environment
      service     = "lead-capture"
    }
  }

  depends_on = [grafana_workspace.monitoring]
}

# Comprehensive alerting rules
resource "prometheus_alert_rules" "lead_capture_alerts" {
  name                = "lead-capture-alerts"
  rules_file          = file("../monitoring/prometheus/rules.yml")
  evaluation_interval = "1m"
  group_interval      = "5m"
  repeat_interval     = "4h"

  notification_channels = ["slack", "email", "pagerduty"]

  # Alert grouping settings
  group_by = ["alertname", "cluster", "service"]

  # Inhibition rules to prevent alert storms
  inhibit_rules {
    source_match = {
      severity = "critical"
    }
    target_match = {
      severity = "warning"
    }
    equal = ["alertname", "cluster", "service"]
  }
}

# Random password generation for Grafana admin
resource "random_password" "grafana_admin" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Output endpoints for application configuration
output "prometheus_endpoint" {
  value       = prometheus_workspace.monitoring.endpoint_url
  description = "Prometheus endpoint URL for application configuration"
  sensitive   = true
}

output "grafana_endpoint" {
  value       = grafana_workspace.monitoring.endpoint_url
  description = "Grafana endpoint URL for dashboard access"
  sensitive   = true
}

# Local variables for consistent configuration
locals {
  monitoring_enabled             = true
  metrics_retention_days         = 30
  alert_notification_channels    = ["slack", "email", "pagerduty"]
  metric_scrape_interval_seconds = 15
}