# 🟢 Getting Started — Onboarding Guide

**Learn how to set up your development environment and understand the project in 30 minutes.**

---

## ⚡ 5-Minute Quick Start

### Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ (for local development)
- Git configured
- Code editor (VS Code recommended)

### Setup

```bash
# Clone repository
git clone https://github.com/alove/alove.git
cd alove

# Start all services (Docker)
docker compose -f infra/docker-compose.yml up -d

# Check if running
docker compose -f infra/docker-compose.yml ps
# Should show 6 containers: api, web, db, redis, meilisearch, minio

# Open in browser
# Frontend: http://localhost:3000
# API Docs: http://localhost:3001/v1 (or use Postman)
```

✅ **You're running!** Now understand what's happening.

---

## 📖 30-Minute Learning Path

### Step 1: Project Overview (5 min)

Read the top-level [README.md](../../README.md) to understand:

- What is ALOVE? (marketplace for used auto parts)
- Who is it for? (West African customers)
- What tech stack? (NestJS + Next.js + PostgreSQL + Redis)

### Step 2: Architecture (5 min)

Open [docs_dev/backend/ARCHITECTURE.md](backend/ARCHITECTURE.md) and understand:

- Module structure (Auth, OTP, Parts, etc.)
- Data flow (Request → Controller → Service → Database)
- How modules communicate

### Step 3: Run Your First Request (5 min)

```bash
# Register a user
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Response (save the tokens!)
# {
#   "user": {"id":"uuid","email":"user@example.com","createdAt":"2025-12-16T..."},
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc..."
# }
```

See [docs_dev/backend/API_REFERENCE.md](backend/API_REFERENCE.md) for more endpoints.

### Step 4: Understand the Code (10 min)

Pick the module that interests you:

- **Authentication?** → Read [docs_dev/backend/modules/authentication.md](backend/modules/authentication.md)
- **OTP?** → Read [docs_dev/backend/modules/otp.md](backend/modules/otp.md)
- **Catalog Search?** → Read [docs_dev/backend/modules/catalog.md](backend/modules/catalog.md)

Then look at the actual code:

- **Controller** (HTTP routes): `apps/api/src/modules/[module]/[module].controller.ts`
- **Service** (business logic): `apps/api/src/modules/[module]/[module].service.ts`
- **Module** (DI setup): `apps/api/src/modules/[module]/[module].module.ts`

### Step 5: Explore the Frontend (5 min)

Open frontend: http://localhost:3000

- Try registering
- Try logging in (use email from Step 3)
- Browse the pages

Then read [docs_dev/frontend/README.md](frontend/README.md) to understand what you're seeing.

---

## 🗂️ Project Structure

```
alove/
├─ apps/
│  ├─ api/                     ← NestJS backend (Node.js)
│  │  ├─ src/
│  │  │  ├─ main.ts            ← Server bootstrap
│  │  │  ├─ app.module.ts       ← Module orchestration
│  │  │  └─ modules/            ← Features (auth, otp, parts, etc.)
│  │  └─ prisma/               ← Database schema & migrations
│  │
│  └─ web/                     ← Next.js frontend (React)
│     ├─ pages/                ← 7 pages (index, auth, catalog, etc.)
│     └─ public/               ← Static assets
│
├─ infra/
│  └─ docker-compose.yml       ← All services defined here
│
├─ docs/                       ← User-facing docs (in French & English)
│  ├─ en/                      ← English documentation
│  └─ fr/                      ← French documentation (Francophone Africa)
│
├─ docs_dev/                   ← Developer documentation (YOU ARE HERE)
│  ├─ backend/                 ← API implementation
│  ├─ frontend/                ← UI implementation
│  ├─ infrastructure/          ← DevOps & deployment
│  └─ guides/                  ← How-to guides
│
└─ README.md                   ← Project overview
```

---

## 🔗 Key Services & URLs

| Service     | Port | URL                      | What?                                   |
| ----------- | ---- | ------------------------ | --------------------------------------- |
| Frontend    | 3000 | http://localhost:3000    | React/Next.js web app                   |
| Backend API | 3001 | http://localhost:3001/v1 | NestJS REST API                         |
| PostgreSQL  | 5432 | -                        | Database (can't visit in browser)       |
| Redis       | 6379 | -                        | Cache/sessions (can't visit in browser) |
| Meilisearch | 7700 | http://localhost:7700    | Search engine (for future use)          |
| MinIO       | 9000 | http://localhost:9000    | Object storage (S3-compatible)          |

---

## 🛠️ Common Development Tasks

### Start Everything

```bash
cd infra
docker compose up -d
```

### Stop Everything

```bash
cd infra
docker compose stop
```

### View Logs

```bash
# API logs (live)
docker compose logs -f api

# Web logs (live)
docker compose logs -f web

# All services
docker compose logs -f
```

### Database

```bash
# Reset database (⚠️ deletes all data)
docker compose exec api npx prisma migrate reset --force

# Seed test data
docker compose exec api npx prisma db seed

# Open Prisma Studio (GUI for database)
docker compose exec api npx prisma studio
# Opens at http://localhost:5555
```

### Environment Variables

Create `.env.development` in `apps/api/`:

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

---

## 🧪 Testing Your Setup

### Test Backend

```bash
# Try an endpoint
curl http://localhost:3001/v1/health

# Should return: {"status":"ok"}
```

### Test Frontend

1. Open http://localhost:3000
2. Should see login page
3. Try: Register → Login → Browse catalog

### Test Database

```bash
# Open Prisma Studio
docker compose exec api npx prisma studio

# Explore tables visually
```

### Test Redis

```bash
# Connect to Redis
docker exec -it alove_redis redis-cli

# Try a command
> PING
PONG

# Exit
> exit
```

---

## 📚 Documentation Roadmap

After this quick start, dive deeper:

### Understanding Authentication

1. Read [docs_dev/backend/modules/authentication.md](backend/modules/authentication.md)
2. Look at code: `apps/api/src/modules/auth/`
3. Check security: [docs_dev/backend/SECURITY.md](backend/SECURITY.md)

### Understanding OTP Flow

1. Read [docs_dev/backend/modules/otp.md](backend/modules/otp.md)
2. Look at code: `apps/api/src/modules/otp/`
3. Test it: Register → See OTP code in terminal logs (dev mode)

### Understanding Search

1. Read [docs_dev/backend/modules/catalog.md](backend/modules/catalog.md)
2. Look at code: `apps/api/src/modules/parts/`
3. Test it: POST /auth/login → GET /parts?search=battery

### Understanding Frontend

1. Read [docs_dev/frontend/README.md](frontend/README.md)
2. Open browser DevTools (F12)
3. Check localStorage (Ctrl+Shift+K)
4. Trace API calls in Network tab

---

## 🐛 Troubleshooting

### "Port 3000 or 3001 already in use"

```bash
# Kill process using port 3001
lsof -i :3001
kill -9 <PID>
```

### "Docker containers not starting"

```bash
# Check logs
docker compose logs api
docker compose logs web

# Restart everything
docker compose down -v
docker compose up -d
```

### "Database migration failed"

```bash
# Reset and re-seed
docker compose exec api npx prisma migrate reset --force
```

### "Can't connect to frontend/API"

```bash
# Check if containers are running
docker compose ps

# Should show 6 containers with "Up" status
```

More troubleshooting: See [docs_dev/guides/DEBUGGING.md](guides/DEBUGGING.md)

---

## 🎯 Next Steps

- [ ] Run `docker compose up -d`
- [ ] Make first API request (Step 3 above)
- [ ] Explore frontend (http://localhost:3000)
- [ ] Pick a module and read its docs
- [ ] Modify the code slightly and test
- [ ] Check out [docs_dev/guides/ADDING_FEATURE.md](guides/ADDING_FEATURE.md) to add your feature

---

## 📞 Getting Help

- **Code errors?** → Check [docs_dev/guides/DEBUGGING.md](guides/DEBUGGING.md)
- **Architecture questions?** → Read [docs_dev/backend/ARCHITECTURE.md](backend/ARCHITECTURE.md)
- **API questions?** → See [docs_dev/backend/API_REFERENCE.md](backend/API_REFERENCE.md)
- **Frontend questions?** → Read [docs_dev/frontend/README.md](frontend/README.md)
- **DevOps questions?** → Check [docs_dev/infrastructure/DOCKER.md](infrastructure/DOCKER.md)

---

**Estimated Time:** 30 minutes  
**Next Read:** [docs_dev/backend/README.md](backend/README.md) or [docs_dev/frontend/README.md](frontend/README.md)  
**Questions?** Open an issue or ask in the team chat.

---

_Last Updated: December 16, 2025_
