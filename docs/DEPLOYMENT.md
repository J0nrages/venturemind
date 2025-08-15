# Syna Deployment Guide

## Overview

Syna offers two deployment models to serve different user needs:

1. **Open-Source Self-Hosted** - For developers and teams who want full control
2. **Managed Cloud** - For enterprises and users who prefer a managed solution

Both versions use the same codebase and feature set. The only difference is who manages the infrastructure.

## Deployment Models

### 🛠️ Self-Hosted (Developer Edition)

Perfect for developers, small teams, and organizations with specific compliance requirements.

#### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourorg/syna
cd syna

# Copy environment configuration
cp .env.example .env

# Edit .env with your settings
# Required: Set Supabase credentials or use local PostgreSQL

# Start all services
docker-compose up -d

# Access at http://localhost:3000
```

#### What's Included

- **Frontend**: React application with Vite
- **Backend**: FastAPI with WebSocket support
- **Database**: PostgreSQL (local or Supabase self-hosted)
- **Cache**: Redis/Valkey for sessions
- **Real-time**: WebSocket and SSE support

#### System Requirements

- Docker & Docker Compose
- 4GB RAM minimum (8GB recommended)
- 10GB disk space
- Ports 3000 (frontend) and 8000 (backend) available

#### Configuration

Create a `.env` file with:

```env
# Supabase (use cloud or self-hosted)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Backend API (optional, defaults to same origin)
VITE_API_URL=http://localhost:8000

# Backend secrets (CHANGE THESE!)
JWT_SECRET=your-secret-key-change-this
GEMINI_API_KEY=your_gemini_key
```

#### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://backend:8000
    depends_on:
      - backend
  
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: syna
      POSTGRES_USER: syna
      POSTGRES_PASSWORD: change_this_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: valkey/valkey:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

#### Scaling Limits

The self-hosted version is designed for:
- **Users**: Up to 100 concurrent users
- **Events**: Up to 100k events/month
- **WebSocket Connections**: Up to 1000 concurrent
- **Storage**: Limited by your disk space

For larger deployments, consider:
1. Upgrading to our managed cloud version
2. Deploying with Kubernetes (see Advanced section)
3. Using dedicated hardware

#### Security Considerations

⚠️ **Important Security Steps:**

1. **Change all default passwords and secrets**
2. **Use HTTPS in production** (see SSL Setup below)
3. **Keep Docker images updated**
4. **Regular backups** of PostgreSQL data
5. **Monitor logs** for suspicious activity

#### SSL/HTTPS Setup

For production self-hosted deployments:

```bash
# Using Caddy (recommended for simplicity)
docker-compose -f docker-compose.yml -f docker-compose.caddy.yml up -d
```

Or with nginx-proxy and Let's Encrypt:

```yaml
# docker-compose.ssl.yml
services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - certs:/etc/nginx/certs
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
  
  letsencrypt:
    image: nginxproxy/acme-companion
    volumes_from:
      - nginx-proxy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - DEFAULT_EMAIL=your-email@example.com
```

---

### ☁️ Managed Cloud (Enterprise/Personal Edition)

Fully managed solution with automatic updates, scaling, and support.

#### One-Click Deployment

Deploy to your preferred platform:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/syna)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourorg/syna)

#### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CDN/Edge  │────▶│   Backend   │────▶│  Supabase   │
│  (Frontend) │     │   (APIs)    │     │  (Database) │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                    │
    Vercel/           Railway/Fly          Supabase
   Cloudflare          Container            Cloud
```

#### Deployment Options

##### Option 1: Integrated Platform (Recommended)

**Railway or Render** - Everything in one platform:
- Automatic SSL/TLS
- WebSocket support built-in
- Built-in PostgreSQL and Redis
- One-click deployments from GitHub

```bash
# Railway CLI deployment
railway login
railway init
railway up
```

##### Option 2: Separated Services

**Frontend**: Vercel or Netlify
```bash
# Vercel deployment
npm i -g vercel
vercel --prod
```

**Backend**: Fly.io or Railway
```bash
# Fly.io deployment
fly launch
fly deploy
```

**Database**: Supabase Cloud (already integrated)

#### Environment Variables

Set these in your cloud platform:

```env
# Frontend (Vercel/Netlify)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_API_URL=https://your-backend-url.com

# Backend (Railway/Fly/Render)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
JWT_SECRET=generate-strong-secret
GEMINI_API_KEY=xxx
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

#### Scaling & Performance

The managed cloud version automatically handles:
- **Auto-scaling** based on traffic
- **Global CDN** for frontend assets
- **Database connection pooling**
- **WebSocket load balancing**
- **Automatic SSL/TLS**
- **DDoS protection**

#### Monitoring & Support

Included with managed cloud:
- 24/7 uptime monitoring
- Automatic error tracking (Sentry)
- Performance metrics
- Email support (Enterprise)
- Automatic backups

---

## Migration Between Deployment Types

### Self-Hosted → Cloud

1. Export your data:
```bash
docker-compose exec postgres pg_dump -U syna syna > backup.sql
```

2. Import to Supabase Cloud:
```bash
psql -h your-supabase-url.supabase.co -U postgres -d postgres < backup.sql
```

3. Update environment variables to point to cloud services

### Cloud → Self-Hosted

1. Export from Supabase:
```bash
pg_dump postgresql://[user]:[password]@[host]/[database] > backup.sql
```

2. Import to local PostgreSQL:
```bash
docker-compose exec -T postgres psql -U syna syna < backup.sql
```

3. Update `.env` to use local services

---

## Advanced Configurations

### Kubernetes Deployment

For large-scale self-hosted deployments:

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: syna-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: syna-backend
  template:
    metadata:
      labels:
        app: syna-backend
    spec:
      containers:
      - name: backend
        image: syna/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: syna-secrets
              key: database-url
```

### High Availability Setup

For mission-critical deployments:

1. **Database**: PostgreSQL with streaming replication
2. **Cache**: Redis Sentinel for failover
3. **Backend**: Multiple instances with load balancer
4. **Frontend**: Multi-region CDN deployment

---

## Troubleshooting

### Common Issues

#### WebSocket Connection Failed
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:8000/ws/test/123
```

#### Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U syna -d syna -c "SELECT 1"
```

#### Port Conflicts
```bash
# Find process using port
lsof -i :3000
lsof -i :8000

# Kill process or change ports in docker-compose.yml
```

### Getting Help

- **Documentation**: Check `/docs` folder
- **Self-Hosted Issues**: GitHub Issues (community support)
- **Cloud Issues**: support@syna.ai (SLA-based)
- **Security Issues**: security@syna.ai

---

## Comparison Matrix

| Feature | Self-Hosted | Managed Cloud |
|---------|------------|---------------|
| **Cost** | Free (your infrastructure) | Usage-based pricing |
| **Setup Time** | 5-10 minutes | 1 minute |
| **Maintenance** | Your responsibility | Fully managed |
| **Updates** | Manual | Automatic |
| **Scaling** | Manual | Automatic |
| **Support** | Community | Professional |
| **Data Control** | Full control | Compliant hosting |
| **Customization** | Unlimited | Configuration only |
| **SSL/TLS** | Self-configured | Automatic |
| **Backups** | Self-managed | Automatic |
| **Uptime SLA** | None | 99.9% |

---

## Best Practices

### For Self-Hosted

1. **Regular Updates**: Pull latest Docker images monthly
2. **Monitoring**: Set up Prometheus/Grafana
3. **Backups**: Daily automated PostgreSQL backups
4. **Security**: Use firewall rules and VPN access
5. **Documentation**: Document your customizations

### For Cloud

1. **Environment Separation**: Use separate projects for dev/staging/prod
2. **Secret Management**: Use platform secret managers
3. **CI/CD**: Set up automated deployments
4. **Monitoring**: Enable platform monitoring tools
5. **Cost Management**: Set up billing alerts

---

## Next Steps

### Self-Hosted
1. Clone repository
2. Configure `.env`
3. Run `docker-compose up`
4. Access at `http://localhost:3000`

### Cloud
1. Click deployment button
2. Configure environment variables
3. Deploy
4. Access at your cloud URL

For detailed API documentation, see [API.md](./API.md).
For development setup, see [DEVELOPMENT.md](./DEVELOPMENT.md).