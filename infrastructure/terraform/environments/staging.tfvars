# General Project Configuration
project_name = "lead-capture-sms-platform-staging"
environment  = "staging"

# MongoDB Atlas Configuration
mongodb_cluster_name    = "lead-capture-cluster-staging"
mongodb_instance_size   = "M10"  # Minimum size for staging environment
mongodb_version        = "6.0"   # Matches production version
mongodb_backup_enabled = true
mongodb_encryption_enabled = true
mongodb_backup_retention_days = 7

# Vercel Deployment Configuration
vercel_framework = "nextjs"

# Note: Sensitive variables should be managed through secure environment variables
# or secret management systems, not in this file:
# - vercel_api_token
# - vercel_team_id
# - mongodb_atlas_public_key
# - mongodb_atlas_private_key
# - mongodb_atlas_project_id