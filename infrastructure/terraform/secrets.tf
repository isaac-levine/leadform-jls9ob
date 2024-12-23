# AWS Secrets Manager configuration for secure credential storage
# Version: ~> 5.0 (AWS Provider)

# Vercel deployment secrets
resource "aws_secretsmanager_secret" "vercel_secrets" {
  name        = "${var.project_name}-vercel-${var.environment}"
  description = "Encrypted storage for Vercel deployment credentials"
  
  # Recovery window for accidental deletion protection
  recovery_window_in_days = 7
  
  # Use customer managed KMS key for additional encryption control
  kms_key_id = var.kms_key_id

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# Vercel secrets values stored in JSON format
resource "aws_secretsmanager_secret_version" "vercel_secret_values" {
  secret_id = aws_secretsmanager_secret.vercel_secrets.id
  
  # Store multiple related credentials as JSON
  secret_string = jsonencode({
    api_token  = var.vercel_api_token
    team_id    = var.vercel_team_id
    project_id = var.vercel_project_id
  })
}

# MongoDB Atlas secrets
resource "aws_secretsmanager_secret" "mongodb_secrets" {
  name        = "${var.project_name}-mongodb-${var.environment}"
  description = "Encrypted storage for MongoDB Atlas credentials"
  
  # Recovery window for accidental deletion protection
  recovery_window_in_days = 7
  
  # Use customer managed KMS key for additional encryption control
  kms_key_id = var.kms_key_id

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# MongoDB secrets values stored in JSON format
resource "aws_secretsmanager_secret_version" "mongodb_secret_values" {
  secret_id = aws_secretsmanager_secret.mongodb_secrets.id
  
  # Store multiple related credentials as JSON
  secret_string = jsonencode({
    public_key        = var.mongodb_atlas_public_key
    private_key       = var.mongodb_atlas_private_key
    project_id        = var.mongodb_atlas_project_id
    connection_string = var.mongodb_connection_string
  })
}

# Output ARNs for reference in other Terraform configurations
output "vercel_secrets_arn" {
  description = "ARN of the Vercel secrets in AWS Secrets Manager"
  value       = aws_secretsmanager_secret.vercel_secrets.arn
  sensitive   = true
}

output "mongodb_secrets_arn" {
  description = "ARN of the MongoDB secrets in AWS Secrets Manager"
  value       = aws_secretsmanager_secret.mongodb_secrets.arn
  sensitive   = true
}

# Data source to allow secret retrieval in other configurations
data "aws_secretsmanager_secret" "vercel_secrets" {
  arn = aws_secretsmanager_secret.vercel_secrets.arn
}

data "aws_secretsmanager_secret" "mongodb_secrets" {
  arn = aws_secretsmanager_secret.mongodb_secrets.arn
}