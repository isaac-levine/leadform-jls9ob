# Use official MongoDB 7.0.0 as base image
FROM mongo:7.0.0

# Labels for container metadata
LABEL maintainer="Lead Capture & SMS Platform Team" \
      version="1.0" \
      description="Production MongoDB instance with security, backup, and monitoring"

# Environment variables for MongoDB configuration
ENV MONGO_INITDB_DATABASE=lead_capture_sms \
    MONGODB_TLS_MODE=requireTLS \
    MONGODB_AUTH_MECHANISM=SCRAM-SHA-256 \
    MONGODB_ENABLE_ENCRYPTION=true \
    MONGODB_BACKUP_SCHEDULE="0 0 * * *" \
    MONGODB_LOG_LEVEL=info

# Install required utilities
RUN apt-get update && apt-get install -y \
    cron \
    logrotate \
    openssl \
    zstd \
    && rm -rf /var/lib/apt/lists/*

# Create necessary directories
RUN mkdir -p /data/db \
    /data/configdb \
    /backup/daily \
    /backup/weekly \
    /var/log/mongodb \
    /etc/ssl/mongodb \
    /scripts

# Copy configuration files and scripts
COPY mongod.conf /etc/mongod.conf
COPY init.js /docker-entrypoint-initdb.d/
COPY ssl/* /etc/ssl/mongodb/

# Setup log rotation
RUN echo "/var/log/mongodb/mongod.log {\n\
    size 1000M\n\
    rotate 7\n\
    missingok\n\
    compress\n\
    notifempty\n\
    create 0640 mongodb mongodb\n\
}" > /etc/logrotate.d/mongodb

# Create backup script
RUN echo '#!/bin/bash\n\
DATE=$(date +%Y%m%d)\n\
mongodump --ssl --sslCAFile=/etc/ssl/mongodb/ca.pem \
    --sslPEMKeyFile=/etc/ssl/mongodb/mongodb.pem \
    --out=/backup/daily/$DATE \
    --gzip \
    --authenticationDatabase=admin \
    --username="$MONGO_INITDB_ROOT_USERNAME" \
    --password="$MONGO_INITDB_ROOT_PASSWORD"\n\
# Cleanup old backups\n\
find /backup/daily -type d -mtime +30 -exec rm -rf {} +\n\
# Weekly backup copy\n\
if [ $(date +%u) = 7 ]; then\n\
    cp -r /backup/daily/$DATE /backup/weekly/\n\
fi' > /scripts/backup.sh && \
chmod +x /scripts/backup.sh

# Setup cron job for backups
RUN echo "0 0 * * * /scripts/backup.sh >> /var/log/mongodb/backup.log 2>&1" > /etc/cron.d/mongodb-backup && \
    chmod 0644 /etc/cron.d/mongodb-backup

# Set proper permissions
RUN chown -R mongodb:mongodb /data/db \
    /data/configdb \
    /backup \
    /var/log/mongodb \
    /etc/ssl/mongodb \
    && chmod 700 /data/db \
    /data/configdb \
    /backup \
    /var/log/mongodb \
    /etc/ssl/mongodb

# Expose MongoDB port
EXPOSE 27017

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD mongosh --eval "db.adminCommand('ping')" --quiet || exit 1

# Start MongoDB with security and monitoring configurations
CMD ["mongod", "--config", "/etc/mongod.conf", "--auth"]

# Volume configuration
VOLUME ["/data/db", "/data/configdb", "/backup", "/var/log/mongodb"]