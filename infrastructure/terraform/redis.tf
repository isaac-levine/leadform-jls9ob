# Redis provider configuration - version 1.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Variables for Redis configuration
variable "redis_node_type" {
  description = "Instance type for Redis nodes"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_nodes" {
  description = "Number of cache nodes in the cluster"
  type        = number
  default     = 1
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for Redis placement"
  type        = list(string)
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for Redis notifications"
  type        = string
}

# Redis parameter group resource
resource "aws_elasticache_parameter_group" "redis_parameter_group" {
  family      = "redis6.x"
  name        = "${var.project_name}-${var.environment}-params"
  description = "Custom parameter group for Redis cache"

  # Performance optimization parameters
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Least Recently Used eviction policy
  }

  parameter {
    name  = "timeout"
    value = "300"  # Connection timeout in seconds
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"  # Sample size for LRU estimation
  }

  parameter {
    name  = "activedefrag"
    value = "yes"  # Enable active defragmentation
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# Redis subnet group resource
resource "aws_elasticache_subnet_group" "redis_subnet_group" {
  name        = "${var.project_name}-${var.environment}-redis-subnet"
  subnet_ids  = var.private_subnet_ids
  description = "Subnet group for Redis cache instances"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# Redis cache cluster resource
resource "aws_elasticache_cluster" "redis_cache" {
  cluster_id           = "${var.project_name}-${var.environment}-cache"
  engine              = "redis"
  engine_version      = "6.x"
  node_type           = var.redis_node_type
  num_cache_nodes     = var.redis_num_nodes
  port                = 6379
  
  # Network configuration
  subnet_group_name    = aws_elasticache_subnet_group.redis_subnet_group.name
  security_group_ids   = [aws_security_group.redis_security_group.id]
  
  # Parameter and maintenance configuration
  parameter_group_name = aws_elasticache_parameter_group.redis_parameter_group.name
  maintenance_window   = "sun:05:00-sun:06:00"
  
  # Backup configuration
  snapshot_retention_limit = 7
  snapshot_window         = "04:00-05:00"
  
  # Security configuration
  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = true
  
  # Monitoring and notification
  notification_topic_arn = var.sns_topic_arn
  
  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# Security group for Redis access
resource "aws_security_group" "redis_security_group" {
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "Security group for Redis cache access"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "Redis port access"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# Output values for application use
output "redis_endpoint" {
  description = "Redis cluster endpoint address"
  value       = aws_elasticache_cluster.redis_cache.cache_nodes[0].address
}

output "redis_port" {
  description = "Redis cluster port"
  value       = aws_elasticache_cluster.redis_cache.port
}

output "redis_connection_string" {
  description = "Redis connection string with encryption"
  value       = "rediss://${aws_elasticache_cluster.redis_cache.cache_nodes[0].address}:${aws_elasticache_cluster.redis_cache.port}"
  sensitive   = true
}