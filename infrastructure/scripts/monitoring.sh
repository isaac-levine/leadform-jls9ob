#!/bin/bash

# Monitoring Setup Script v1.0.0
# Sets up and configures monitoring infrastructure for Lead Capture & SMS Platform
# Dependencies:
# - prometheus v2.45.0
# - alertmanager v0.25.0
# - grafana v9.5.0

set -euo pipefail

# Global variables
PROMETHEUS_VERSION="v2.45.0"
ALERTMANAGER_VERSION="v0.25.0"
GRAFANA_VERSION="9.5.0"
MONITORING_NAMESPACE="monitoring"
RETENTION_DAYS="15"
BACKUP_PATH="/opt/monitoring/backups"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message=$@
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} ${timestamp} - $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message"
            ;;
    esac
}

# Error handling function
handle_error() {
    local exit_code=$?
    local line_number=$1
    log "ERROR" "Script failed at line $line_number with exit code $exit_code"
    exit $exit_code
}

trap 'handle_error ${LINENO}' ERR

# Function to check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log "ERROR" "kubectl not found. Please install kubectl first."
        exit 1
    fi

    # Check namespace exists
    if ! kubectl get namespace "$MONITORING_NAMESPACE" &> /dev/null; then
        log "INFO" "Creating monitoring namespace..."
        kubectl create namespace "$MONITORING_NAMESPACE"
    fi

    # Check required directories
    if [ ! -d "$BACKUP_PATH" ]; then
        log "INFO" "Creating backup directory..."
        mkdir -p "$BACKUP_PATH"
    fi
}

# Function to setup Prometheus
setup_prometheus() {
    log "INFO" "Setting up Prometheus $PROMETHEUS_VERSION..."

    # Create ConfigMap from prometheus.yml
    kubectl create configmap prometheus-config \
        --from-file=../monitoring/prometheus/prometheus.yml \
        --from-file=../monitoring/prometheus/rules.yml \
        -n "$MONITORING_NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    # Create Prometheus deployment
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: $MONITORING_NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:$PROMETHEUS_VERSION
        args:
          - "--config.file=/etc/prometheus/prometheus.yml"
          - "--storage.tsdb.path=/prometheus"
          - "--storage.tsdb.retention.time=${RETENTION_DAYS}d"
          - "--web.enable-lifecycle"
        ports:
          - containerPort: 9090
        volumeMounts:
          - name: prometheus-config
            mountPath: /etc/prometheus
          - name: prometheus-storage
            mountPath: /prometheus
      volumes:
        - name: prometheus-config
          configMap:
            name: prometheus-config
        - name: prometheus-storage
          persistentVolumeClaim:
            claimName: prometheus-storage
EOF

    # Create Prometheus service
    kubectl create service clusterip prometheus \
        --tcp=9090:9090 \
        -n "$MONITORING_NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    log "INFO" "Waiting for Prometheus deployment..."
    kubectl rollout status deployment/prometheus -n "$MONITORING_NAMESPACE" --timeout=300s
}

# Function to setup Alertmanager
setup_alertmanager() {
    log "INFO" "Setting up Alertmanager $ALERTMANAGER_VERSION..."

    # Create ConfigMap from alertmanager.yml
    kubectl create configmap alertmanager-config \
        --from-file=../monitoring/alertmanager/config.yml \
        -n "$MONITORING_NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    # Create Alertmanager deployment
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alertmanager
  namespace: $MONITORING_NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: alertmanager
  template:
    metadata:
      labels:
        app: alertmanager
    spec:
      containers:
      - name: alertmanager
        image: prom/alertmanager:$ALERTMANAGER_VERSION
        args:
          - "--config.file=/etc/alertmanager/config.yml"
          - "--storage.path=/alertmanager"
        ports:
          - containerPort: 9093
        volumeMounts:
          - name: alertmanager-config
            mountPath: /etc/alertmanager
          - name: alertmanager-storage
            mountPath: /alertmanager
      volumes:
        - name: alertmanager-config
          configMap:
            name: alertmanager-config
        - name: alertmanager-storage
          persistentVolumeClaim:
            claimName: alertmanager-storage
EOF

    # Create Alertmanager service
    kubectl create service clusterip alertmanager \
        --tcp=9093:9093 \
        -n "$MONITORING_NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    log "INFO" "Waiting for Alertmanager deployment..."
    kubectl rollout status deployment/alertmanager -n "$MONITORING_NAMESPACE" --timeout=300s
}

# Function to setup Grafana
setup_grafana() {
    log "INFO" "Setting up Grafana $GRAFANA_VERSION..."

    # Create ConfigMap for dashboards
    kubectl create configmap grafana-dashboards \
        --from-file=../monitoring/grafana/dashboards/ \
        -n "$MONITORING_NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    # Create Grafana deployment
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: $MONITORING_NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:$GRAFANA_VERSION
        ports:
          - containerPort: 3000
        env:
          - name: GF_SECURITY_ADMIN_PASSWORD
            valueFrom:
              secretKeyRef:
                name: grafana-secrets
                key: admin-password
        volumeMounts:
          - name: grafana-storage
            mountPath: /var/lib/grafana
          - name: grafana-dashboards
            mountPath: /etc/grafana/provisioning/dashboards
      volumes:
        - name: grafana-storage
          persistentVolumeClaim:
            claimName: grafana-storage
        - name: grafana-dashboards
          configMap:
            name: grafana-dashboards
EOF

    # Create Grafana service
    kubectl create service clusterip grafana \
        --tcp=3000:3000 \
        -n "$MONITORING_NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    log "INFO" "Waiting for Grafana deployment..."
    kubectl rollout status deployment/grafana -n "$MONITORING_NAMESPACE" --timeout=300s
}

# Function to verify monitoring setup
verify_monitoring() {
    log "INFO" "Verifying monitoring setup..."
    
    # Check Prometheus health
    if ! kubectl get pods -n "$MONITORING_NAMESPACE" -l app=prometheus -o jsonpath='{.items[0].status.phase}' | grep -q "Running"; then
        log "ERROR" "Prometheus is not running"
        return 1
    fi

    # Check Alertmanager health
    if ! kubectl get pods -n "$MONITORING_NAMESPACE" -l app=alertmanager -o jsonpath='{.items[0].status.phase}' | grep -q "Running"; then
        log "ERROR" "Alertmanager is not running"
        return 1
    fi

    # Check Grafana health
    if ! kubectl get pods -n "$MONITORING_NAMESPACE" -l app=grafana -o jsonpath='{.items[0].status.phase}' | grep -q "Running"; then
        log "ERROR" "Grafana is not running"
        return 1
    fi

    # Verify metrics collection
    local prometheus_pod=$(kubectl get pods -n "$MONITORING_NAMESPACE" -l app=prometheus -o jsonpath='{.items[0].metadata.name}')
    if ! kubectl exec -n "$MONITORING_NAMESPACE" "$prometheus_pod" -- wget -qO- localhost:9090/-/healthy | grep -q "Prometheus"; then
        log "ERROR" "Prometheus metrics collection is not working"
        return 1
    fi

    log "INFO" "All monitoring components are healthy"
    return 0
}

# Main setup function
main() {
    log "INFO" "Starting monitoring setup..."
    
    # Check prerequisites
    check_prerequisites
    
    # Setup components
    setup_prometheus
    setup_alertmanager
    setup_grafana
    
    # Verify setup
    verify_monitoring
    
    log "INFO" "Monitoring setup completed successfully"
}

# Execute main function
main "$@"