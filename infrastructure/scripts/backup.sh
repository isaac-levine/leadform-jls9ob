#!/bin/bash

# MongoDB Atlas Backup Script
# Version: 1.0.0
# Description: Automated MongoDB Atlas database backups with S3 storage and monitoring
# Required tools:
# - mongodump (mongodb-database-tools v100.7.0+)
# - aws-cli (v2.x)

set -euo pipefail

# Global Configuration
BACKUP_DIR="/tmp/mongodb_backup"
S3_BUCKET="lead-capture-backups"
LOG_FILE="/var/log/mongodb_backup.log"
RETENTION_DAYS=7
MAX_RETRIES=3
BACKUP_COMPRESSION="gzip"
ENCRYPTION_ALGORITHM="AES256"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Logging Configuration
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "${timestamp}|${level}|backup_script|${message}" >> "${LOG_FILE}"
}

# Environment Validation
validate_environment() {
    log "INFO" "Starting environment validation"
    
    # Check required environment variables
    local required_vars=("MONGODB_URI" "AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log "ERROR" "Required environment variable $var is not set"
            return 1
        fi
    done
    
    # Verify MongoDB connection
    if ! mongosh --eval "db.adminCommand('ping')" "${MONGODB_URI}" &>/dev/null; then
        log "ERROR" "Failed to connect to MongoDB Atlas"
        return 1
    fi
    
    # Verify AWS credentials and S3 access
    if ! aws s3 ls "s3://${S3_BUCKET}" &>/dev/null; then
        log "ERROR" "Failed to access S3 bucket ${S3_BUCKET}"
        return 1
    }
    
    # Check available disk space (require at least 10GB)
    local available_space=$(df -BG "${BACKUP_DIR}" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ ${available_space} -lt 10 ]]; then
        log "ERROR" "Insufficient disk space. Required: 10GB, Available: ${available_space}GB"
        return 1
    fi
    
    log "INFO" "Environment validation completed successfully"
    return 0
}

# Backup Execution
perform_backup() {
    local database_name=$1
    local backup_path="${BACKUP_DIR}/${TIMESTAMP}"
    local retry_count=0
    
    log "INFO" "Starting backup for database: ${database_name}"
    
    mkdir -p "${backup_path}"
    
    while [[ ${retry_count} -lt ${MAX_RETRIES} ]]; do
        if mongodump \
            --uri="${MONGODB_URI}" \
            --db="${database_name}" \
            --out="${backup_path}" \
            --gzip \
            --oplog; then
            
            # Generate checksums
            find "${backup_path}" -type f -exec sha256sum {} \; > "${backup_path}/checksums.sha256"
            
            # Create backup manifest
            cat > "${backup_path}/manifest.json" <<EOF
{
    "timestamp": "${TIMESTAMP}",
    "database": "${database_name}",
    "compression": "${BACKUP_COMPRESSION}",
    "encryption": "${ENCRYPTION_ALGORITHM}"
}
EOF
            
            log "INFO" "Backup completed successfully"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        log "WARN" "Backup attempt ${retry_count} failed, retrying..."
        sleep $((2 ** retry_count))
    done
    
    log "ERROR" "Backup failed after ${MAX_RETRIES} attempts"
    return 1
}

# S3 Upload
upload_to_s3() {
    local backup_file=$1
    local s3_path="s3://${S3_BUCKET}/${TIMESTAMP}"
    local retry_count=0
    
    log "INFO" "Starting upload to S3: ${s3_path}"
    
    while [[ ${retry_count} -lt ${MAX_RETRIES} ]]; do
        if aws s3 cp \
            "${backup_file}" \
            "${s3_path}" \
            --recursive \
            --sse "${ENCRYPTION_ALGORITHM}" \
            --metadata "timestamp=${TIMESTAMP}" \
            --only-show-errors; then
            
            log "INFO" "Upload completed successfully"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        log "WARN" "Upload attempt ${retry_count} failed, retrying..."
        sleep $((2 ** retry_count))
    done
    
    log "ERROR" "Upload failed after ${MAX_RETRIES} attempts"
    return 1
}

# Cleanup Old Backups
cleanup_old_backups() {
    log "INFO" "Starting cleanup of old backups"
    
    # Local cleanup
    find "${BACKUP_DIR}" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \;
    
    # S3 cleanup
    aws s3 ls "s3://${S3_BUCKET}" | while read -r line; do
        local backup_date=$(echo "$line" | awk '{print $1}')
        local days_old=$(( ( $(date +%s) - $(date -d "$backup_date" +%s) ) / 86400 ))
        
        if [[ ${days_old} -gt ${RETENTION_DAYS} ]]; then
            local backup_prefix=$(echo "$line" | awk '{print $2}')
            aws s3 rm "s3://${S3_BUCKET}/${backup_prefix}" --recursive
            log "INFO" "Removed old backup: ${backup_prefix}"
        fi
    done
    
    log "INFO" "Cleanup completed"
    return 0
}

# Notification Handling
send_notification() {
    local status=$1
    local message=$2
    
    # Format notification payload
    local payload=$(cat <<EOF
{
    "status": "${status}",
    "timestamp": "${TIMESTAMP}",
    "message": "${message}",
    "backup_size": "$(du -sh "${BACKUP_DIR}/${TIMESTAMP}" | cut -f1)",
    "duration": "$SECONDS seconds"
}
EOF
)
    
    # Send to monitoring system (implement based on your monitoring solution)
    log "INFO" "Backup notification sent: ${status}"
}

# Main Execution
main() {
    SECONDS=0  # Reset duration counter
    
    log "INFO" "Starting backup process"
    
    if ! validate_environment; then
        send_notification "ERROR" "Environment validation failed"
        exit 1
    fi
    
    if ! perform_backup "lead_capture_db"; then
        send_notification "ERROR" "Backup creation failed"
        exit 1
    fi
    
    if ! upload_to_s3 "${BACKUP_DIR}/${TIMESTAMP}"; then
        send_notification "ERROR" "S3 upload failed"
        exit 1
    fi
    
    if ! cleanup_old_backups; then
        log "WARN" "Cleanup process encountered issues"
    fi
    
    send_notification "SUCCESS" "Backup completed successfully"
    log "INFO" "Backup process completed in $SECONDS seconds"
    exit 0
}

# Script execution
main