# 🚀 Infrastructure & DevOps Documentation

**Docker, deployment, environment variables, monitoring, and CI/CD configuration.**

---

## 📖 Infrastructure Overview

ALOVE runs on **Docker Compose** with 6 services in development:

| Service      | Port | Technology    | Purpose                   |
| ------------ | ---- | ------------- | ------------------------- |
| **API**      | 3001 | NestJS        | REST API server           |
| **Web**      | 3000 | Next.js       | Frontend application      |
| **Database** | 5432 | PostgreSQL 16 | Primary data store        |
| **Cache**    | 6379 | Redis         | OTP, sessions, caching    |
| **Search**   | 7700 | Meilisearch   | Full-text search (future) |
| **Storage**  | 9000 | MinIO         | S3-compatible storage     |

---

## 🐳 Docker & Docker Compose

### Quick Start

```bash
cd infra
docker compose up -d          # Start all services
docker compose ps             # Check status
docker compose logs -f api    # View logs
docker compose stop           # Stop all services
docker compose down -v        # Remove all data
```

### Service Management

```bash
# Start specific service
docker compose up -d api

# Restart a service
docker compose restart api

# View logs
docker compose logs -f web

# Execute command in container
docker compose exec api npm run build
```

---

## 🔧 Environment Configuration

### API Environment Variables (.env.development)

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/alove

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production

# OTP
OTP_TTL_SECONDS=300

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Frontend Environment Variables (.env.local)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/v1
```

### Docker Compose Overrides

Create `docker-compose.override.yml` for local variations:

```yaml
version: "3.8"
services:
  api:
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug
```

---

## 📦 Services & Configuration

### PostgreSQL Database

```bash
# Connection details
Host: localhost (or db in Docker)
Port: 5432
User: postgres
Password: postgres
Database: alove

# Connect from host
psql -h localhost -U postgres -d alove

# Connect from container
docker compose exec db psql -U postgres -d alove
```

### Redis Cache

```bash
# Connection details
Host: localhost (or redis in Docker)
Port: 6379
Database: 0

# Connect from host
redis-cli

# Connect from container
docker exec -it alove_redis redis-cli

# Common commands
PING              # Test connection
KEYS *            # List all keys
GET key_name      # Get value
DEL key_name      # Delete key
```

### Meilisearch Search

```bash
# Web UI (future use)
http://localhost:7700

# Configuration (future)
# Index automotive parts
# Fields: title, description, make, model, year
```

### MinIO Storage

```bash
# Web UI
http://localhost:9000

# Credentials
Access Key: minioadmin
Secret Key: minioadmin

# Use for: Part images, user avatars, documents
```

---

## 📊 Database & Migrations

### Schema Management

```bash
# View schema
docker compose exec api npx prisma studio
# Opens http://localhost:5555

# Create migration
docker compose exec api npx prisma migrate dev --name add_new_feature

# Apply migrations
docker compose exec api npx prisma migrate deploy

# Reset database (⚠️ DELETES DATA)
docker compose exec api npx prisma migrate reset --force
```

### Database Seeding

```bash
# Run seed script
docker compose exec api npx prisma db seed

# Seed script location
apps/api/prisma/seed.ts

# What it creates:
# - Test users
# - Sample parts
# - Sample vendors
# - Sample orders
```

---

## 🔐 Security in Infrastructure

### Production Checklist

- [ ] Change JWT_SECRET to strong random value
- [ ] Set NODE_ENV=production
- [ ] Use PostgreSQL SSL connection
- [ ] Enable HTTPS/TLS
- [ ] Set CORS_ORIGIN to production domain
- [ ] Use environment variable vault (AWS Secrets Manager, HashiCorp Vault)
- [ ] Enable database backups
- [ ] Monitor error logs and alerts
- [ ] Rate limiting on API endpoints
- [ ] DDoS protection (Cloudflare, AWS Shield)

### Password Management

```bash
# Never commit secrets
# Use .env files (add to .gitignore)
# Use environment variable management tools

# Good
export JWT_SECRET=super_secret_key_here

# Bad (never do this)
JWT_SECRET=super_secret_key_here  # In code
```

---

## 📊 Monitoring & Logs

### View Logs

```bash
# API logs
docker compose logs -f api

# Web logs
docker compose logs -f web

# Database logs
docker compose logs -f db

# All services
docker compose logs -f

# Last 50 lines
docker compose logs --tail=50
```

### Health Checks

```bash
# API health endpoint
curl http://localhost:3001/v1/health

# Response
{"status":"ok","timestamp":"2025-12-16T..."}

# Frontend health
curl http://localhost:3000

# Response: HTML (Next.js page)
```

### Performance Monitoring

```bash
# Check resource usage
docker stats

# Watch in real-time
docker stats --no-stream

# Database performance (Prisma Studio)
docker compose exec api npx prisma studio
```

---

## 🚀 Deployment Strategies

### Local Development

```bash
docker compose -f infra/docker-compose.yml up -d
# All services with hot reload
```

### Staging Environment

```bash
# Use environment-specific file
docker compose -f infra/docker-compose.staging.yml up -d

# Includes:
# - Healthchecks
# - Logging configuration
# - Resource limits
```

### Production Environment

```bash
# Use Kubernetes (EKS, AKS, GKE)
# Or managed services (Heroku, Railway, Render)

# Environment setup
# - Separate database host
# - Separate Redis (Redis Cloud, ElastiCache)
# - CDN for static assets
# - Reverse proxy (Nginx, HAProxy)
```

---

## 📈 Scaling Considerations

### Horizontal Scaling

```yaml
# Multiple API instances
api:
  deploy:
    replicas: 3
  ports:
    - target: 3001
      published: 3001-3003
```

### Load Balancing

```yaml
# Nginx proxy
services:
  nginx:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### Database Replication

```yaml
# PostgreSQL replica
db-replica:
  image: postgres:16
  environment:
    REPLICATION: true
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Future Setup)

```yaml
name: CI/CD

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: docker compose build
      - name: Run tests
        run: docker compose exec api npm test
      - name: Push to registry
        run: docker push ...
```

### Deployment Steps

1. Push to main branch
2. Run tests automatically
3. Build Docker images
4. Push to Docker registry
5. Deploy to staging
6. Run E2E tests
7. Deploy to production

---

## 🛠️ Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3001
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "3001:3001"  # Change first number
```

### Database Connection Failed

```bash
# Check database is running
docker compose ps | grep db

# Check logs
docker compose logs db

# Reset database
docker compose down -v
docker compose up -d
docker compose exec api npx prisma migrate dev
```

### Out of Memory

```bash
# Check resource usage
docker stats

# Increase Docker memory limit
# In Docker Desktop: Preferences → Resources → Memory
```

### Container Won't Start

```bash
# Check logs
docker compose logs api

# Common issues:
# - Port already in use
# - Database not ready
# - Environment variable missing
# - Insufficient disk space
```

---

## 📚 Documentation Files

- **[DOCKER.md](DOCKER.md)** (Future) — Detailed Docker setup
- **[ENVIRONMENT.md](ENVIRONMENT.md)** (Future) — All environment variables
- **[DATABASE.md](DATABASE.md)** (Future) — PostgreSQL configuration
- **[CACHING.md](CACHING.md)** (Future) — Redis setup
- **[MONITORING.md](MONITORING.md)** (Future) — Logging and monitoring
- **[CI_CD.md](CI_CD.md)** (Future) — GitHub Actions setup

---

## 🔗 Quick Links

- Docker docs: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/documentation
- Meilisearch: https://www.meilisearch.com/docs/
- MinIO: https://docs.min.io/

---

_Last Updated: December 16, 2025_  
_Status: 🔄 In Progress (basic setup complete)_  
_Next: Detailed configuration files for each service_
