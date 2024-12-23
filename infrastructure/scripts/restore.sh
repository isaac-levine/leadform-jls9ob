#!/bin/bash

# MongoDB Atlas Database Restore Script
# Version: 1.0.0
# Dependencies:
# - mongodb-database-tools v100.7.0
# - aws-cli v2.x

# Global variables
RESTORE_DIR="/tmp/mongodb_restore"
S3_BUCKET="lead-capture-backups"
LOG_FILE="/var/log/mongodb_restore.log"
MAX_RETRIES=3
BACKUP_RETENTION=7
MONITORING_ENDPOINT="https://monitoring.leadcapture.com/webhook"

# Logging function with standardized format
log() {
    local level=$1
    local message=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "${timestamp}|${level}|RESTORE|${message}" >> "${LOG_FILE}"
}

# Validate environment and prerequisites
validate_environment() {
    log "INFO" "Starting environment validation"
    
    # Check required environment variables
    for var in MONGODB_URI AWS_ACCESS_KEY AWS_SECRET_KEY; do
        if [[ -z "${!var}" ]]; then
            log "ERROR" "Missing required environment variable: ${var}"
            return 1
        fi
    done
    
    # Verify mongorestore installation
    if ! command -v mongorestore &> /dev/null; then
        log "ERROR" "mongorestore utility not found"
        return 1
    fi
    
    # Verify mongorestore version
    local version=$(mongorestore --version | grep -oP "version \K[0-9]+\.[0-9]+\.[0-9]+")
    if [[ "${version}" < "100.7.0" ]]; then
        log "ERROR" "mongorestore version ${version} is below required 100.7.0"
        return 1
    }
    
    # Verify AWS CLI installation and credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log "ERROR" "AWS credentials validation failed"
        return 1
    }
    
    # Create and verify restore directory
    mkdir -p "${RESTORE_DIR}"
    if [[ ! -w "${RESTORE_DIR}" ]]; then
        log "ERROR" "Cannot write to restore directory: ${RESTORE_DIR}"
        return 1
    }
    
    # Verify available disk space (minimum 20GB required)
    local available_space=$(df -BG "${RESTORE_DIR}" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ "${available_space}" -lt 20 ]]; then
        log "ERROR" "Insufficient disk space. Required: 20GB, Available: ${available_space}GB"
        return 1
    }
    
    log "INFO" "Environment validation completed successfully"
    return 0
}

# Download backup from S3 with integrity verification
download_from_s3() {
    local backup_file=$1
    local retry_count=0
    local max_retries=${MAX_RETRIES}
    
    log "INFO" "Starting download of ${backup_file} from S3"
    
    while [[ ${retry_count} -lt ${max_retries} ]]; do
        # Download backup file with progress monitoring
        if aws s3 cp "s3://${S3_BUCKET}/${backup_file}" "${RESTORE_DIR}/${backup_file}" \
            --expected-size $(aws s3api head-object --bucket "${S3_BUCKET}" --key "${backup_file}" --query 'ContentLength' --output text); then
            
            # Download and verify checksum
            aws s3 cp "s3://${S3_BUCKET}/${backup_file}.sha256" "${RESTORE_DIR}/${backup_file}.sha256"
            local expected_checksum=$(cat "${RESTORE_DIR}/${backup_file}.sha256")
            local actual_checksum=$(sha256sum "${RESTORE_DIR}/${backup_file}" | awk '{print $1}')
            
            if [[ "${expected_checksum}" == "${actual_checksum}" ]]; then
                log "INFO" "Backup file downloaded and verified successfully"
                return 0
            else
                log "ERROR" "Checksum verification failed"
                rm -f "${RESTORE_DIR}/${backup_file}"*
            fi
        fi
        
        retry_count=$((retry_count + 1))
        sleep $((2 ** retry_count))
    done
    
    log "ERROR" "Failed to download backup file after ${max_retries} attempts"
    return 1
}

# Perform database restore with validation
perform_restore() {
    local database_name=$1
    local backup_file=$2
    
    log "INFO" "Starting restore operation for database: ${database_name}"
    
    # Create restore point
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local restore_point="${database_name}_${timestamp}"
    
    # Execute restore with progress monitoring
    if mongorestore \
        --uri="${MONGODB_URI}" \
        --db="${database_name}" \
        --archive="${RESTORE_DIR}/${backup_file}" \
        --gzip \
        --preserveUUID \
        --stopOnError \
        --verbose 2>&1 | tee -a "${LOG_FILE}"; then
        
        # Validate restore completion
        if mongo "${MONGODB_URI}/${database_name}" --eval "db.stats()" &> /dev/null; then
            log "INFO" "Database restore completed successfully"
            return 0
        else
            log "ERROR" "Restored database validation failed"
            return 1
        fi
    else
        log "ERROR" "Database restore operation failed"
        return 1
    fi
}

# Clean up temporary files securely
cleanup_restore_files() {
    log "INFO" "Starting cleanup of temporary files"
    
    # Securely delete backup files
    find "${RESTORE_DIR}" -type f -exec shred -u {} \;
    
    # Remove restore directory
    rm -rf "${RESTORE_DIR}"
    
    log "INFO" "Cleanup completed successfully"
    return 0
}

# Send notifications to monitoring system
send_notification() {
    local status=$1
    local message=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Prepare notification payload
    local payload=$(cat <<EOF
{
    "timestamp": "${timestamp}",
    "status": "${status}",
    "message": "${message}",
    "source": "mongodb_restore"
}
EOF
)
    
    # Send notification with retry logic
    local retry_count=0
    while [[ ${retry_count} -lt ${MAX_RETRIES} ]]; do
        if curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "${payload}" \
            "${MONITORING_ENDPOINT}"; then
            log "INFO" "Notification sent successfully"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        sleep $((2 ** retry_count))
    done
    
    log "ERROR" "Failed to send notification after ${MAX_RETRIES} attempts"
    return 1
}

# Main execution flow
main() {
    local database_name=$1
    local backup_file=$2
    
    # Initialize logging
    exec 1> >(tee -a "${LOG_FILE}")
    exec 2> >(tee -a "${LOG_FILE}" >&2)
    
    log "INFO" "Starting database restore process"
    
    # Execute restore process with proper error handling
    if ! validate_environment; then
        send_notification "ERROR" "Environment validation failed"
        exit 1
    fi
    
    if ! download_from_s3 "${backup_file}"; then
        send_notification "ERROR" "Backup download failed"
        exit 1
    fi
    
    if ! perform_restore "${database_name}" "${backup_file}"; then
        send_notification "ERROR" "Database restore failed"
        cleanup_restore_files
        exit 1
    fi
    
    if ! cleanup_restore_files; then
        send_notification "WARNING" "Cleanup operation failed"
        exit 1
    fi
    
    send_notification "SUCCESS" "Database restore completed successfully"
    log "INFO" "Restore process completed successfully"
    exit 0
}

# Script entry point with parameter validation
if [[ $# -ne 2 ]]; then
    echo "Usage: $0 <database_name> <backup_file>"
    exit 1
fi

main "$1" "$2"