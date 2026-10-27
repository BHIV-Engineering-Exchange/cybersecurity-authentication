# Monitoring Dashboard Setup Guide

## 🔍 Overview

This guide will help you set up comprehensive monitoring for the Fraud Evidence System backend using Prometheus and Grafana.

## 📊 Monitoring Stack

- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization dashboards
- **Node Exporter** - System metrics
- **MongoDB Exporter** - Database metrics

## 🚀 Quick Setup with Docker Compose

### 1. Create Monitoring Configuration

Create `Backend/monitoring/docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  # Prometheus for metrics collection
  prometheus:
    image: prom/prometheus:latest
    container_name: fraud-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    networks:
      - monitoring
    restart: unless-stopped

  # Grafana for visualization
  grafana:
    image: grafana/grafana:latest
    container_name: fraud-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    networks:
      - monitoring
    restart: unless-stopped
    depends_on:
      - prometheus

  # Node Exporter for system metrics
  node-exporter:
    image: prom/node-exporter:latest
    container_name: fraud-node-exporter
    ports:
      - "9100:9100"
    networks:
      - monitoring
    restart: unless-stopped

  # MongoDB Exporter for database metrics
  mongodb-exporter:
    image: percona/mongodb_exporter:latest
    container_name: fraud-mongodb-exporter
    ports:
      - "9216:9216"
    environment:
      - MONGODB_URI=mongodb://host.docker.internal:27017
    networks:
      - monitoring
    restart: unless-stopped

volumes:
  prometheus-data:
  grafana-data:

networks:
  monitoring:
    driver: bridge
```

### 2. Create Prometheus Configuration

Create `Backend/monitoring/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'fraud-evidence-system'
    environment: 'production'

# Alerting configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: []

# Rule files
rule_files:
  - 'alerts.yml'

# Scrape configurations
scrape_configs:
  # Backend API metrics
  - job_name: 'fraud-backend'
    static_configs:
      - targets: ['host.docker.internal:5050']
    metrics_path: '/metrics'
    scrape_interval: 10s

  # Node Exporter (system metrics)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # MongoDB Exporter
  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # BHIV Core Services (if running)
  - job_name: 'bhiv-core'
    static_configs:
      - targets: ['host.docker.internal:8004']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'bhiv-webhooks'
    static_configs:
      - targets: ['host.docker.internal:8005']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### 3. Create Alert Rules

Create `Backend/monitoring/prometheus/alerts.yml`:

```yaml
groups:
  - name: backend_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      # Database connection issues
      - alert: DatabaseDown
        expr: up{job="mongodb"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB is down"
          description: "MongoDB has been down for more than 2 minutes"

      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }} seconds"

      # Kafka queue building up
      - alert: KafkaQueueBacklog
        expr: kafka_fallback_queue_size > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Kafka fallback queue is building up"
          description: "Queue size is {{ $value }} events"

      # Low disk space
      - alert: LowDiskSpace
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space"
          description: "Only {{ $value | humanizePercentage }} disk space remaining"

      # High memory usage
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"
```

### 4. Add Metrics Endpoint to Backend

Install required package:

```bash
cd Backend
npm install prom-client
```

Create `Backend/middleware/metrics.js`:

```javascript
const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const evidenceUploadsTotal = new promClient.Counter({
  name: 'evidence_uploads_total',
  help: 'Total number of evidence uploads',
  labelNames: ['status', 'storage_type']
});

const blockchainAnchorsTotal = new promClient.Counter({
  name: 'blockchain_anchors_total',
  help: 'Total number of blockchain anchors',
  labelNames: ['status']
});

const rlPredictionsTotal = new promClient.Counter({
  name: 'rl_predictions_total',
  help: 'Total number of RL predictions',
  labelNames: ['action']
});

const kafkaFallbackQueueSize = new promClient.Gauge({
  name: 'kafka_fallback_queue_size',
  help: 'Current size of Kafka fallback queue'
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(evidenceUploadsTotal);
register.registerMetric(blockchainAnchorsTotal);
register.registerMetric(rlPredictionsTotal);
register.registerMetric(kafkaFallbackQueueSize);

// Middleware to track HTTP requests
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );
    
    httpRequestTotal.inc({
      method: req.method,
      route,
      status: res.statusCode >= 400 ? 'error' : 'success'
    });
  });
  
  next();
}

// Metrics endpoint
function metricsEndpoint(req, res) {
  res.set('Content-Type', register.contentType);
  register.metrics().then(data => res.send(data));
}

module.exports = {
  register,
  metricsMiddleware,
  metricsEndpoint,
  metrics: {
    evidenceUploadsTotal,
    blockchainAnchorsTotal,
    rlPredictionsTotal,
    kafkaFallbackQueueSize
  }
};
```

Update `Backend/server.js` to include metrics:

```javascript
const { metricsMiddleware, metricsEndpoint } = require('./middleware/metrics');

// Add metrics middleware (before routes)
app.use(metricsMiddleware);

// Add metrics endpoint
app.get('/metrics', metricsEndpoint);
```

### 5. Create Grafana Dashboards

Create `Backend/monitoring/grafana/provisioning/datasources/prometheus.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

Create `Backend/monitoring/grafana/provisioning/dashboards/dashboard.yml`:

```yaml
apiVersion: 1

providers:
  - name: 'Fraud Evidence System'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

Create `Backend/monitoring/grafana/dashboards/fraud-evidence-dashboard.json`:

```json
{
  "dashboard": {
    "title": "Fraud Evidence System - Main Dashboard",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "id": 2,
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=\"error\"}[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "id": 3,
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ],
        "type": "graph"
      },
      {
        "id": 4,
        "title": "Evidence Uploads",
        "targets": [
          {
            "expr": "rate(evidence_uploads_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "id": 5,
        "title": "Blockchain Anchors",
        "targets": [
          {
            "expr": "rate(blockchain_anchors_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "id": 6,
        "title": "RL Predictions",
        "targets": [
          {
            "expr": "rate(rl_predictions_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "id": 7,
        "title": "Kafka Queue Size",
        "targets": [
          {
            "expr": "kafka_fallback_queue_size"
          }
        ],
        "type": "graph"
      },
      {
        "id": 8,
        "title": "CPU Usage",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
          }
        ],
        "type": "graph"
      },
      {
        "id": 9,
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100"
          }
        ],
        "type": "graph"
      },
      {
        "id": 10,
        "title": "MongoDB Operations",
        "targets": [
          {
            "expr": "rate(mongodb_op_counters_total[5m])"
          }
        ],
        "type": "graph"
      }
    ],
    "refresh": "10s",
    "time": {
      "from": "now-1h",
      "to": "now"
    }
  }
}
```

## 🚀 Start Monitoring Stack

```bash
# Navigate to monitoring directory
cd Backend/monitoring

# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Check services are running
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f
```

## 🌐 Access Dashboards

### Grafana
- **URL:** http://localhost:3000
- **Username:** admin
- **Password:** admin123

### Prometheus
- **URL:** http://localhost:9090
- **Query UI:** http://localhost:9090/graph

### Metrics Endpoint
- **Backend:** http://localhost:5050/metrics
- **BHIV Core:** http://localhost:8004/metrics
- **BHIV Webhooks:** http://localhost:8005/metrics

## 📊 Key Metrics to Monitor

### Application Metrics
- Request rate (req/sec)
- Error rate (errors/sec)
- Response time (p50, p95, p99)
- Evidence uploads (uploads/min)
- Blockchain anchors (anchors/min)
- RL predictions (predictions/min)

### System Metrics
- CPU usage (%)
- Memory usage (%)
- Disk usage (%)
- Network I/O (bytes/sec)

### Database Metrics
- MongoDB connections
- Query latency
- Operations per second
- Replication lag (if applicable)

### Queue Metrics
- Kafka queue size
- Message publish rate
- Message consume rate
- Fallback queue size

## 🚨 Alert Configuration

Alerts are configured in `prometheus/alerts.yml`. To receive notifications:

1. **Configure Alertmanager** (optional):
   - Add Alertmanager service to docker-compose
   - Configure notification channels (email, Slack, PagerDuty)

2. **Set up notification channels in Grafana:**
   - Go to Alerting → Notification channels
   - Add Slack, Email, or Webhook

## 📈 Custom Dashboards

To create custom dashboards:

1. Go to Grafana UI
2. Click "+" → Dashboard
3. Add panels with PromQL queries
4. Save dashboard
5. Export JSON and add to `grafana/dashboards/`

## 🔧 Troubleshooting

### Metrics not showing up

```bash
# Check backend metrics endpoint
curl http://localhost:5050/metrics

# Check Prometheus targets
# Open http://localhost:9090/targets
# All targets should show "UP"
```

### Grafana can't connect to Prometheus

```bash
# Check Prometheus is accessible
curl http://prometheus:9090/api/v1/query?query=up

# Restart Grafana
docker-compose -f docker-compose.monitoring.yml restart grafana
```

### High memory usage

```bash
# Adjust Prometheus retention
# Edit prometheus.yml and add:
# --storage.tsdb.retention.time=7d

# Restart Prometheus
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

## 📝 Monitoring Checklist

- [ ] Prometheus collecting metrics from backend
- [ ] Grafana dashboards accessible
- [ ] All Prometheus targets showing "UP"
- [ ] Alerts configured and tested
- [ ] Notification channels set up
- [ ] Dashboard URLs documented
- [ ] Team has access to Grafana
- [ ] Retention period configured (default: 15 days)
- [ ] Backup strategy for metrics data

## 🎯 Production Recommendations

1. **Set up Alertmanager** for proper alert routing
2. **Configure backup** for Grafana dashboards
3. **Set retention period** based on compliance requirements
4. **Add authentication** to Prometheus (use reverse proxy)
5. **Enable HTTPS** for Grafana in production
6. **Set up log aggregation** (ELK stack or similar)
7. **Create runbooks** for common alerts
8. **Schedule regular reviews** of dashboard effectiveness

---

**Setup Time:** 30 minutes  
**Maintenance:** Minimal (check weekly)  
**Cost:** Free (open source stack)  
**Dashboard URL:** http://localhost:3000 (default)

