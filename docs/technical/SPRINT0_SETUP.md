# 🚀 ALOVE - Sprint 0 - Instructions de Démarrage

## 📋 Prérequis

- Node.js 20+ et npm
- Docker et Docker Compose
- Git

## 🔧 Installation

### 1. Cloner le repository

```bash
git clone <votre-repo>
cd alove
```

### 2. Installer les dépendances

```bash
# API
cd apps/api
npm install

# Web
cd ../web
npm install
```

### 3. Démarrer l'infrastructure avec Docker

```bash
cd ../../infra
docker compose up -d
```

Cela démarre :

- PostgreSQL (port 5432)
- Redis (port 6379)
- Meilisearch (port 7700)
- MinIO (port 9000, console 9001)
- API NestJS (port 3001)
- Web Next.js (port 3000)

### 4. Exécuter les migrations Prisma

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma generate
```

### 5. Seed de la base de données

```bash
docker compose exec api npm run seed
```

## 🌐 Accès aux services

- **Frontend** : http://localhost:3000
- **API** : http://localhost:3001/v1
- **API Health** : http://localhost:3001/v1/health
- **Prisma Studio** : Voir la section "Commandes utiles"
- **MinIO Console** : http://localhost:9001 (alove / alovealove)
- **Meilisearch** : http://localhost:7700

## 📝 Commandes utiles

### Docker

```bash
# Démarrer tous les conteneurs
docker compose up -d

# Arrêter tous les conteneurs
docker compose stop

# Voir les logs
docker compose logs -f

# Logs de l'API uniquement
docker compose logs -f api

# Reset complet (DANGER: supprime toutes les données)
docker compose down -v --remove-orphans
```

### Base de données

```bash
# Ouvrir Prisma Studio
docker compose exec api npx prisma studio

# Créer une nouvelle migration
docker compose exec api npx prisma migrate dev --name nom_de_la_migration

# Reset la base de données
docker compose exec api npx prisma migrate reset --force
```

### Tests

```bash
# Tests E2E de l'API
cd apps/api
npm run test:e2e

# Tests avec coverage
npm run test:cov

# Tests en mode watch
npm run test:watch
```

### Linting et Formatage

```bash
# API
cd apps/api
npm run lint
npm run format

# Web
cd apps/web
npm run lint
```

## 🧪 Tests E2E

Le Sprint 0 inclut des tests E2E complets pour :

### OTP (One-Time Password)

- Génération d'OTP
- Vérification d'OTP
- Expiration d'OTP
- Limite de tentatives

### Auth (Authentification)

- Inscription utilisateur
- Connexion
- Refresh token
- Protection des routes

Pour exécuter les tests :

```bash
cd apps/api
npm run test:e2e
```

## 🎯 Endpoints API Disponibles

### Health

- `GET /v1/health` - Check de santé de l'API

### Auth

- `POST /v1/auth/register` - Inscription
- `POST /v1/auth/login` - Connexion
- `POST /v1/auth/refresh` - Rafraîchir le token
- `GET /v1/auth/me` - Profil utilisateur (protégé)

### OTP

- `POST /v1/otp/generate` - Générer un OTP
- `POST /v1/otp/verify` - Vérifier un OTP

### Parts (Pièces)

- `GET /v1/parts` - Liste des pièces
- `GET /v1/parts/:id` - Détails d'une pièce

## 🔒 Variables d'environnement

### API (`apps/api/.env.development`)

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://alove:alove@db:5432/alove
REDIS_URL=redis://redis:6379
JWT_SECRET=dev-secret-change-in-prod
JWT_REFRESH_SECRET=dev-refresh-secret
OTP_TTL_SECONDS=300
SENTRY_DSN=
```

### Web (`apps/web/.env.development`)

```env
NEXT_PUBLIC_API_BASE=http://localhost:3001
NEXT_PUBLIC_DEFAULT_LANG=fr
NEXT_TELEMETRY_DISABLED=1
```

## 🐛 Troubleshooting

### Le conteneur API ne démarre pas

```bash
docker compose logs api
docker compose restart api
```

### Erreur de connexion à la base de données

```bash
docker compose restart db
docker compose exec api npx prisma migrate deploy
```

### Port déjà utilisé

```bash
# Vérifier les ports occupés
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Modifier les ports dans infra/.env
```

### Reset complet

```bash
cd infra
docker compose down -v
docker compose up -d
cd ../apps/api
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run seed
```

## 📚 Structure du Projet

```
alove/
├── apps/
│   ├── api/              # Backend NestJS
│   │   ├── src/
│   │   │   ├── modules/  # Modules fonctionnels
│   │   │   ├── common/   # Filtres, interceptors
│   │   │   └── main.ts
│   │   ├── prisma/       # Schema et migrations
│   │   └── test/         # Tests E2E
│   └── web/              # Frontend Next.js
│       ├── pages/
│       ├── lib/
│       └── styles/
├── docs/                 # Documentation
├── infra/                # Docker Compose
└── .github/workflows/    # CI/CD
```

## ✅ Checklist Sprint 0

- [x] Structure monorepo
- [x] Docker Compose fonctionnel
- [x] Schema Prisma + migrations
- [x] Seed de données
- [x] Module Auth (JWT)
- [x] Module OTP (Redis)
- [x] Tests E2E OTP et Auth
- [x] CI/CD GitHub Actions
- [x] ESLint + Prettier
- [x] Gestion d'erreurs globale
- [x] Logging
- [x] Frontend i18n (FR/EN)
- [x] Configuration Sentry

## 🚀 Prochaines Étapes (Sprint 1)

- Module Catalog complet avec YMM/OEM
- Intégration Meilisearch
- Module Order
- Upload d'images vers MinIO
- PWA configuration
- Tests de performance

## 📞 Support

Consultez la documentation complète dans le dossier `/docs` ou créez une issue sur GitHub.

---

© 2025 ALOVE - Marketplace de Pièces Auto
