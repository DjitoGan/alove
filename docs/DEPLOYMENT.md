# 🚀 Guide de Déploiement ALOVE API

## Options de déploiement recommandées

### 1. **Render.com** (Recommandé - Gratuit pour commencer)

#### Avantages

- ✅ Tier gratuit généreux (750h/mois)
- ✅ Déploiement automatique depuis Git
- ✅ PostgreSQL managé gratuit
- ✅ SSL automatique
- ✅ Logs et monitoring intégrés

#### Configuration

```yaml
# render.yaml
services:
  - type: web
    name: alove-api
    env: docker
    dockerfilePath: ./apps/api/Dockerfile
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: alove-db
          property: connectionString
      - key: REDIS_HOST
        value: redis
      - key: MEILISEARCH_HOST
        value: http://meilisearch:7700
      - key: JWT_SECRET
        generateValue: true

  - type: pserv
    name: alove-db
    plan: free
    databaseName: alove
    databaseUser: alove

  - type: redis
    name: alove-redis
    plan: free
```

**URL de déploiement**: `https://alove-api.onrender.com`

---

### 2. **Railway.app** (Simple et rapide)

#### Avantages

- ✅ $5 de crédit gratuit/mois
- ✅ Déploiement ultra-rapide (1 clic)
- ✅ Support Docker natif
- ✅ Variables d'environnement faciles
- ✅ Logs temps réel

#### Étapes

1. Connecter le repo GitHub à Railway
2. Ajouter services: PostgreSQL, Redis, Meilisearch
3. Configurer les variables d'environnement
4. Railway génère automatiquement une URL

**URL de déploiement**: `https://alove-api.up.railway.app`

---

### 3. **Fly.io** (Performance optimale)

#### Avantages

- ✅ Tier gratuit (3 VMs)
- ✅ Déploiement global (edge locations)
- ✅ Faible latence
- ✅ Support Docker excellent

#### Configuration

```toml
# fly.toml
app = "alove-api"
primary_region = "cdg" # Paris pour Afrique de l'Ouest

[build]
  dockerfile = "apps/api/Dockerfile"

[env]
  PORT = "3001"
  NODE_ENV = "production"

[[services]]
  http_checks = []
  internal_port = 3001
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

**Commandes**

```bash
fly launch
fly deploy
fly open
```

**URL de déploiement**: `https://alove-api.fly.dev`

---

### 4. **Vercel** (Pour le frontend Next.js)

#### Déploiement Web

```bash
cd apps/web
vercel --prod
```

**URL**: `https://alove.vercel.app`

---

## 🔧 Configuration Recommandée

### Variables d'environnement (Production)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/alove

# Redis
REDIS_HOST=redis-host.com
REDIS_PORT=6379

# Meilisearch
MEILISEARCH_HOST=https://meilisearch.example.com
MEILISEARCH_KEY=your-production-key

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://alove.vercel.app,https://admin.alove.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

---

## 📊 Comparaison des options

| Service     | Gratuit     | Facilité   | Performance | Support DB        | Recommandé pour  |
| ----------- | ----------- | ---------- | ----------- | ----------------- | ---------------- |
| **Render**  | ✅ 750h     | ⭐⭐⭐⭐   | ⭐⭐⭐      | PostgreSQL inclus | MVP, Prototypes  |
| **Railway** | $5/mois     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐    | Tous DB           | Démarrage rapide |
| **Fly.io**  | ✅ 3 VMs    | ⭐⭐⭐     | ⭐⭐⭐⭐⭐  | Via extensions    | Production       |
| **Vercel**  | ✅ Illimité | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐    | Via Postgres      | Frontend         |

---

## 🎯 Déploiement Recommandé pour ALOVE

### Stack Production

```
Frontend (Web)    → Vercel
API (NestJS)      → Railway / Render
Database (Postgres) → Render / Neon
Redis             → Railway / Upstash
Meilisearch       → Meilisearch Cloud / Railway
```

### Coût mensuel estimé

- **Gratuit**: Render + Vercel + Neon (free tier)
- **$10-20**: Railway + Vercel + Upstash
- **$50-100**: Fly.io + services managés premium

---

## 🚀 Démarrage rapide (Render)

1. **Créer compte**: https://render.com
2. **Connecter GitHub**: Autoriser l'accès au repo
3. **Nouveau service Web**:
   - Environment: Docker
   - Build: Auto-detect Dockerfile
   - Instance Type: Free
4. **Ajouter PostgreSQL**: New → PostgreSQL (Free)
5. **Variables d'environnement**: Copier depuis `.env.example`
6. **Déployer**: Render build et démarre automatiquement

**URL finale**: `https://alove-api-xyz.onrender.com`

---

## 📝 Checklist avant déploiement

- [ ] Migrer la base de données (`npx prisma migrate deploy`)
- [ ] Configurer les variables d'environnement
- [ ] Activer CORS pour le domaine frontend
- [ ] Configurer le monitoring (Sentry)
- [ ] Tester les endpoints critiques
- [ ] Configurer les backups DB
- [ ] Documenter l'URL de production

---

## 🔗 Liens utiles

- **Render**: https://render.com
- **Railway**: https://railway.app
- **Fly.io**: https://fly.io
- **Vercel**: https://vercel.com
- **Meilisearch Cloud**: https://www.meilisearch.com/cloud
- **Neon (Postgres)**: https://neon.tech
- **Upstash (Redis)**: https://upstash.com
