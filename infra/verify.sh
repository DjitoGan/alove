#!/bin/bash

# ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
# ║                    ALOVE DOCKER VERIFICATION SCRIPT                                               ║
# ║  Checks: All containers running, API responding, Database connected, Redis available              ║
# ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝

set -e

echo "🐳 ALOVE Docker Verification Starting..."
echo ""

# [1] CHECK DOCKER COMPOSE STATUS
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Checking Docker Compose Status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CONTAINERS=$(docker compose ps --services 2>/dev/null || echo "")

if [ -z "$CONTAINERS" ]; then
  echo "❌ Docker Compose not running. Starting containers..."
  docker compose -f infra/docker-compose.yml up -d
  sleep 5
fi

# [2] VERIFY ALL CONTAINERS
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Verifying Container Status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker compose -f infra/docker-compose.yml ps

# [3] CHECK API ENDPOINT
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Checking API Endpoint (http://localhost:3001/v1)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "✅ API is responding on port 3001"
else
  echo "⏳ Waiting for API to start (usually 5-10 seconds)..."
  sleep 10
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ API is now responding"
  else
    echo "❌ API is not responding. Check logs with: docker compose logs api"
    exit 1
  fi
fi

# [4] CHECK DATABASE CONNECTION
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Checking Database Connection..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker compose exec -T db psql -U postgres -d alove -c "SELECT 1" > /dev/null 2>&1; then
  echo "✅ PostgreSQL is connected and database 'alove' exists"
else
  echo "⚠️  Database check failed (may need migrations)"
fi

# [5] CHECK REDIS CONNECTION
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Checking Redis Connection..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis is responding to PING"
else
  echo "⚠️  Redis check failed"
fi

# [6] CHECK WEB ENDPOINT
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Checking Web Frontend (http://localhost:3000)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "✅ Next.js frontend is running on port 3000"
else
  echo "⚠️  Frontend is not responding (may be building)"
fi

# [7] API ENDPOINTS TEST
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  Testing API Endpoints..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test health endpoint
echo ""
echo "Testing GET /v1/health..."
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/v1/health)
if [ "$HEALTH_CODE" -eq 200 ]; then
  echo "✅ Health endpoint responding (HTTP $HEALTH_CODE)"
else
  echo "❌ Health endpoint failed (HTTP $HEALTH_CODE)"
fi

# Test catalog endpoint
echo ""
echo "Testing GET /v1/catalog/search..."
CATALOG_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/v1/catalog/search?q=oil)
if [ "$CATALOG_CODE" -eq 200 ]; then
  echo "✅ Catalog search endpoint responding (HTTP $CATALOG_CODE)"
else
  echo "⚠️  Catalog endpoint returned HTTP $CATALOG_CODE"
fi

# Test Swagger docs
echo ""
echo "Testing GET /api/docs (Swagger)..."
SWAGGER_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/docs)
if [ "$SWAGGER_CODE" -eq 200 ] || [ "$SWAGGER_CODE" -eq 301 ] || [ "$SWAGGER_CODE" -eq 302 ]; then
  echo "✅ Swagger docs available (HTTP $SWAGGER_CODE)"
else
  echo "⚠️  Swagger docs returned HTTP $SWAGGER_CODE"
fi

# [8] SUMMARY
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALOVE Docker Verification Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Quick Links:"
echo "  🌐 API:                http://localhost:3001/v1"
echo "  📖 Swagger Docs:       http://localhost:3001/api/docs"
echo "  🎨 Web Frontend:       http://localhost:3000"
echo "  🗄️  Database:           localhost:5432 (postgres/postgres)"
echo "  🔴 Redis:              localhost:6379"
echo ""
echo "📝 Common Commands:"
echo "  docker compose logs -f api        # Watch API logs"
echo "  docker compose exec api npx prisma studio  # View database"
echo "  docker compose down               # Stop all containers"
echo ""
