# Deployment Guide - Iranian Legal Archive System

This guide covers various deployment options for the Iranian Legal Archive System.

## 🚀 Quick Start

### Local Development
```bash
# Clone repository
git clone <repository-url>
cd iranian-legal-archive

# Install dependencies
cd backend
pip install -r requirements.txt

# Start the system
python start.py
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t iranian-legal-archive .
docker run -p 8000:8000 iranian-legal-archive
```

## ☁️ Cloud Deployment

### Vercel Deployment

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables**
   ```
   DATABASE_URL=sqlite:///data/legal_archive.db
   HUGGINGFACE_API_KEY=your_huggingface_key
   PYTHONPATH=/var/task/backend
   ```

3. **Deploy**
   - Vercel will automatically detect the `vercel.json` configuration
   - The system will be deployed and accessible at your Vercel URL

### Railway Deployment

1. **Connect Repository**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Connect your GitHub repository

2. **Configure Environment Variables**
   ```
   DATABASE_URL=sqlite:///data/legal_archive.db
   HUGGINGFACE_API_KEY=your_huggingface_key
   PYTHONPATH=/app/backend
   ```

3. **Deploy**
   - Railway will automatically detect the `railway.toml` configuration
   - The system will be deployed and accessible at your Railway URL

### AWS Deployment

1. **EC2 Instance Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Python 3.9
   sudo apt install python3.9 python3.9-pip python3.9-venv -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Clone repository
   git clone <repository-url>
   cd iranian-legal-archive
   
   # Setup Python environment
   python3.9 -m venv venv
   source venv/bin/activate
   pip install -r backend/requirements.txt
   
   # Install frontend dependencies
   npm install
   npm run build
   ```

2. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Setup Systemd Service**
   ```ini
   [Unit]
   Description=Iranian Legal Archive System
   After=network.target
   
   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/home/ubuntu/iranian-legal-archive
   Environment=PATH=/home/ubuntu/iranian-legal-archive/venv/bin
   ExecStart=/home/ubuntu/iranian-legal-archive/venv/bin/python start.py
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```

### Google Cloud Platform

1. **App Engine Deployment**
   ```yaml
   # app.yaml
   runtime: python39
   
   env_variables:
     DATABASE_URL: "sqlite:///data/legal_archive.db"
     HUGGINGFACE_API_KEY: "your_huggingface_key"
     PYTHONPATH: "/app/backend"
   
   handlers:
   - url: /.*
     script: auto
   ```

2. **Deploy**
   ```bash
   gcloud app deploy
   ```

### Azure Deployment

1. **Container Instances**
   ```bash
   # Build and push to Azure Container Registry
   az acr build --registry myregistry --image iranian-legal-archive .
   
   # Deploy to Container Instances
   az container create \
     --resource-group myResourceGroup \
     --name iranian-legal-archive \
     --image myregistry.azurecr.io/iranian-legal-archive \
     --ports 8000 \
     --environment-variables \
       DATABASE_URL=sqlite:///data/legal_archive.db \
       HUGGINGFACE_API_KEY=your_huggingface_key
   ```

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=sqlite:///data/legal_archive.db

# AI Models
HUGGINGFACE_API_KEY=your_huggingface_key

# Security
SECRET_KEY=your_secret_key_here
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com

# Rate Limiting
RATE_LIMIT_CALLS=100
RATE_LIMIT_PERIOD=60

# Logging
LOG_LEVEL=INFO
LOG_FILE=iranian_legal_archive.log
```

### Optional Environment Variables

```bash
# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=your_sentry_dsn

# Analytics
GOOGLE_ANALYTICS_ID=your_ga_id
```

## 📊 Monitoring & Maintenance

### Health Checks

The system provides several health check endpoints:

```bash
# Basic health check
curl http://localhost:8000/api/health

# System statistics
curl http://localhost:8000/api/system/stats

# Proxy health
curl http://localhost:8000/api/proxy/health
```

### Log Monitoring

```bash
# View logs
tail -f iranian_legal_archive.log

# Monitor errors
grep "ERROR" iranian_legal_archive.log

# Monitor scraping activity
grep "scraping" iranian_legal_archive.log
```

### Database Maintenance

```bash
# Clear cache
curl -X POST http://localhost:8000/api/system/clear-cache

# Reset proxy failures
curl -X POST http://localhost:8000/api/proxy/reset

# Check database size
sqlite3 backend/legal_archive.db "SELECT COUNT(*) FROM documents;"
```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Change default SECRET_KEY
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS/TLS
- [ ] Set up rate limiting
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Backup database regularly

### SSL/TLS Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📈 Performance Optimization

### Database Optimization

```sql
-- Analyze database performance
ANALYZE;

-- Rebuild FTS5 index
INSERT INTO documents_fts(documents_fts) VALUES('rebuild');

-- Optimize database
VACUUM;
```

### Caching Configuration

```python
# Redis caching (optional)
import redis
redis_client = redis.Redis(host='localhost', port=6379, db=0)

# Cache frequently accessed data
def cache_search_results(query, results):
    redis_client.setex(f"search:{query}", 3600, json.dumps(results))
```

### Load Balancing

```nginx
upstream iranian_legal_archive {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
}

server {
    location / {
        proxy_pass http://iranian_legal_archive;
    }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database file permissions
   ls -la backend/legal_archive.db
   
   # Recreate database
   rm backend/legal_archive.db
   python backend/startup.py
   ```

2. **AI Model Loading Failures**
   ```bash
   # Check available memory
   free -h
   
   # Check disk space
   df -h
   
   # Test model loading
   python -c "from transformers import pipeline; print('Models OK')"
   ```

3. **Proxy Connection Issues**
   ```bash
   # Test proxy health
   curl http://localhost:8000/api/proxy/health
   
   # Reset proxy failures
   curl -X POST http://localhost:8000/api/proxy/reset
   ```

4. **WebSocket Connection Problems**
   ```bash
   # Check WebSocket endpoint
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:8000/ws
   ```

### Performance Issues

1. **Slow Search Queries**
   - Check database indexes
   - Clear search cache
   - Optimize FTS5 queries

2. **High Memory Usage**
   - Monitor AI model memory usage
   - Implement model caching
   - Use smaller model variants

3. **Scraping Failures**
   - Check proxy health
   - Verify target website accessibility
   - Adjust scraping delays

## 📞 Support

For deployment issues:
1. Check the logs for error messages
2. Verify environment variables
3. Test individual components
4. Create an issue in the GitHub repository

---

**Happy Deploying! 🚀**