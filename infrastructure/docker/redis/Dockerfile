# Use official Redis Alpine image for minimal footprint
FROM redis:7.2-alpine

# Add metadata labels for container management
LABEL maintainer="DevOps Team" \
      application="Lead Capture Platform" \
      component="Cache Layer" \
      version=${BUILD_VERSION:-1.0.0} \
      environment=${BUILD_ENV:-production}

# Set environment variables for configuration
ENV REDIS_PORT=6379 \
    REDIS_CONFIG_PATH=/usr/local/etc/redis/redis.conf \
    REDIS_DATA_DIR=/data \
    REDIS_MAX_MEMORY=256mb

# Copy Redis configuration file with optimized settings
COPY redis.conf ${REDIS_CONFIG_PATH}

# Create data directory and set proper permissions
RUN mkdir -p ${REDIS_DATA_DIR} && \
    chown redis:redis ${REDIS_DATA_DIR} && \
    chmod 777 ${REDIS_DATA_DIR}

# Expose Redis port for container communication
EXPOSE ${REDIS_PORT}

# Add health check for container monitoring
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD redis-cli ping || exit 1

# Start Redis server with custom configuration
CMD ["sh", "-c", "redis-server ${REDIS_CONFIG_PATH}"]