# 📘 Module 5: Docker - Containeriser Votre Application

## 🎯 Objectifs

Après ce module, vous saurez:

- Qu'est-ce qu'un container Docker
- Créer une image Docker
- Utiliser docker-compose pour orchestrer plusieurs services
- Debugger les containers

---

## 1️⃣ Conceptes Fondamentaux

### Le Problème sans Docker

Imaginez que vous développez ALOVE sur votre Mac:

```
Votre Mac
├── Node.js v20
├── PostgreSQL 16
├── Redis 7
└── Code ALOVE

"Ça fonctionne sur mon ordi!" 💻
```

Mais quand un collègue le clone:

```
Son PC Windows
├── Node.js v18 (différent!)
├── PostgreSQL 15 (vieille version)
├── Redis 6 (vieille version)
└── Code ALOVE

"Ça ne marche pas chez moi!" 😭
```

### Docker = Boîte Hermétique

```
┌─────────────────────────────────────────────┐
│         Container Docker (Linux)             │
├─────────────────────────────────────────────┤
│ ├─ Node.js v20 (exact)                      │
│ ├─ npm packages (exact)                     │
│ ├─ Code ALOVE                               │
│ └─ Configuration (exact)                    │
└─────────────────────────────────────────────┘
        Fonctionne pareil partout!
```

**Docker = Garantie de reproductibilité.**

---

## 2️⃣ Image Docker vs Container

### Analogie Objets

```
Java:
  Class   = Image Docker
  Object  = Container Docker

Différence:
  Class est la définition (fichier Dockerfile)
  Object est l'instance en cours d'exécution (docker run)
```

### Image = Recette

```dockerfile
# Dockerfile = Recette pour créer une image

FROM node:20-alpine         # [1] Base: Linux + Node.js

WORKDIR /app                # [2] Dossier de travail

COPY package*.json ./       # [3] Copie package.json et package-lock.json

RUN npm install             # [4] Installe les dépendances

COPY . .                    # [5] Copie le code entier

RUN npm run build           # [6] Compile TypeScript

EXPOSE 3001                 # [7] Port à exposer

CMD ["node", "dist/main"]   # [8] Commande au démarrage
```

**Chaque ligne crée une "couche" dans l'image.**

### Container = Instance en Cours

```bash
docker build -t alove-api:1.0 .     # Crée l'image
docker run -p 3001:3001 alove-api:1.0  # Lance un container
```

---

## 3️⃣ Dockerfile ALOVE

### apps/api/Dockerfile

```dockerfile
# ===== ÉTAPE 1: BUILD (Compiler TypeScript) =====
FROM node:20-alpine AS builder

WORKDIR /app

# Copie les fichiers de dépendances
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Installe
RUN npm ci  # Equivalent exact de npm install avec package-lock.json

# Copie le code source
COPY ./src ./src
COPY ./prisma ./prisma

# Compile TypeScript → JavaScript
RUN npm run build

# ===== ÉTAPE 2: RUNTIME (Image finale) =====
FROM node:20-alpine

WORKDIR /app

# Copie seulement node_modules (plus petit)
COPY --from=builder /app/node_modules ./node_modules

# Copie le code compilé
COPY --from=builder /app/dist ./dist

# Copie Prisma
COPY --from=builder /app/prisma ./prisma

# Copie package.json (pour les infos de version)
COPY package.json ./

# Pour Prisma
RUN npm install -g @prisma/cli

# Port
EXPOSE 3001

# Commande de démarrage
CMD ["node", "dist/main.js"]
```

**Pourquoi 2 étapes (builder + runtime)?**

- Étape 1: Crée l'image de build (grosse, avec TypeScript compiler)
- Étape 2: Crée l'image de runtime (petite, seulement le JavaScript)
- Résultat: Image finale petite et rapide ✅

### apps/web/Dockerfile

```dockerfile
# ===== BUILD =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===== RUNTIME (Next.js) =====
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json ./

EXPOSE 3000

CMD ["npm", "start"]
```

---

## 4️⃣ docker-compose.yml - Orchestration

### Qu'est-ce que Docker Compose ?

**Problème**: Vous avez besoin de 4 services:

```
Service 1: PostgreSQL (port 5432)
Service 2: Redis (port 6379)
Service 3: API (port 3001, dépend de DB et Redis)
Service 4: Web (port 3000, dépend de API)
```

**Solution**: Un fichier YAML qui décrit tout.

### Exemple ALOVE

```yaml
# infra/docker-compose.yml

version: "3.9"

services:
  # ===== POSTGRESQL =====
  db:
    image: postgres:16
    container_name: alove-db

    environment:
      POSTGRES_DB: alove # Crée cette DB
      POSTGRES_USER: alove # Username
      POSTGRES_PASSWORD: alove # Password (dev seulement!)

    ports:
      - "5432:5432" # Port host:container

    volumes:
      - alove_pg:/var/lib/postgresql/data # Persistance des données

    healthcheck:
      test: ["CMD", "pg_isready", "-U", "alove"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ===== REDIS =====
  redis:
    image: redis:7-alpine
    container_name: alove-redis

    command: ["redis-server", "--appendonly", "yes"]
    # --appendonly: Sauvegarde les données sur disque

    ports:
      - "6379:6379"

    volumes:
      - alove_redis:/data # Persistance

    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ===== API NESTJS =====
  api:
    build:
      context: ../apps/api # Chemin du Dockerfile
      dockerfile: Dockerfile

    container_name: alove-api

    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://alove:alove@db:5432/alove
      # Note: @db (nom du service) au lieu de localhost
      REDIS_URL: redis://redis:6379
      JWT_SECRET: super-secret-key
      PORT: 3001

    ports:
      - "3001:3001"

    depends_on:
      db:
        condition: service_healthy # Attend que DB soit prête
      redis:
        condition: service_healthy

    volumes:
      - ../apps/api:/usr/src/app # Hot reload
      - /usr/src/app/node_modules # Exclut node_modules

    command: npm run start:dev # Démarrage avec nodemon

  # ===== WEB NEXT.JS =====
  web:
    build:
      context: ../apps/web
      dockerfile: Dockerfile

    container_name: alove-web

    environment:
      NEXT_PUBLIC_API_BASE: http://api:3001/v1
      # Note: http://api (nom du service) au lieu de localhost

    ports:
      - "3000:3000"

    depends_on:
      - api

    volumes:
      - ../apps/web:/usr/src/app
      - /usr/src/app/node_modules
      - /usr/src/app/.next

volumes:
  alove_pg: # Volume pour PostgreSQL
  alove_redis: # Volume pour Redis
```

---

## 5️⃣ Commandes Docker Essentielles

### Démarrer et Arrêter

```bash
cd infra/

# Démarrer tous les services en arrière-plan
docker compose up -d
# -d = détaché (run in background)

# Voir le statut
docker compose ps

# Arrêter tous les services
docker compose stop

# Arrêter ET supprimer les containers
docker compose down

# Arrêter, supprimer, et nettoyer les volumes (DANGER!)
docker compose down -v
# -v = supprime aussi les volumes (données perdues!)
```

### Logs et Debugging

```bash
# Voir les logs d'un service
docker compose logs api
# -f = follow (temps réel)
docker compose logs -f api

# Voir les logs de tous les services
docker compose logs -f

# Exécuter une commande dans un container
docker compose exec api npx prisma migrate dev
docker compose exec api npx prisma studio
docker compose exec db psql -U alove -d alove
```

### Rebuild et Nettoyage

```bash
# Rebuild une image (changements dans le code)
docker compose build api
docker compose up -d

# Nettoyer les ressources non utilisées
docker system prune        # Supprime les images/containers non utilisés
docker system prune -v     # Inclut aussi les volumes
```

---

## 6️⃣ Comment Ça Marche Concrètement

### Démarrage Pas à Pas

```bash
# 1. Lancez les services
docker compose up -d

# 2. Docker:
# - Crée un réseau virtuel "alove" pour la communication
# - Démarre PostgreSQL
# - Démarre Redis
# - Attend que db et redis soient "healthy"
# - Démarre l'API
# - Démarre le Web

# 3. Réseau Docker
# ┌──────────────────────────────────────────┐
# │   Réseau virtuel "alove"                 │
# ├──────────────────────────────────────────┤
# │  db:5432        (accessible via "db")    │
# │  redis:6379     (accessible via "redis") │
# │  api:3001       (accessible via "api")   │
# │  web:3000       (accessible via "web")   │
# └──────────────────────────────────────────┘
#
# Depuis API:
#   - DB: postgresql://alove:alove@db:5432/alove
#   - Redis: redis://redis:6379
#
# Depuis Web (navigateur):
#   - API: http://localhost:3001/v1
```

### Accès aux Services

```bash
# API locale
http://localhost:3001/v1/health

# Web locale
http://localhost:3000

# Prisma Studio
docker compose exec api npx prisma studio
# Accès: http://localhost:5555

# PostgreSQL CLI
docker compose exec db psql -U alove -d alove
# Commandes SQL:
# SELECT * FROM "User";
# \dt  (lister les tables)
```

---

## 7️⃣ Exercices Pratiques

### Exercice 1: Démarrer les Containers

**Énoncé**: Démarrez tous les services, vérifiez qu'ils fonctionnent.

**Solution**:

```bash
cd /Users/amouzou/projects/alove/infra
docker compose up -d
docker compose ps

# Résultat attendu:
# NAME            STATUS
# alove-db        Up (healthy)
# alove-redis     Up (healthy)
# alove-api       Up
# alove-web       Up
```

### Exercice 2: Voir les Logs

**Énoncé**: Regardez les logs de l'API en temps réel.

**Solution**:

```bash
docker compose logs -f api

# Vous verrez:
# alove-api  | [Nest] 1  - 12/16/2024, 10:30:00 AM     LOG [NestFactory] Starting Nest application...
# alove-api  | [Nest] 1  - 12/16/2024, 10:30:01 AM     LOG [InstanceLoader] PrismaModule dependencies initialized
```

### Exercice 3: Exécuter une Migration

**Énoncé**: Exécutez `prisma migrate dev` dans le container API.

**Solution**:

```bash
docker compose exec api npx prisma migrate dev --name add_category

# Prisma vous demandera:
# ✔ Name of migration … add_category
# ✔ Environment variables loaded from .env
# ✔ Prisma schema loaded from prisma/schema.prisma
# ✔ Migration applied
```

---

## 8️⃣ Dépannage Courant

### "Connection refused" à la DB

**Problème**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:

```bash
# 1. Vérifiez que db est en bonne santé
docker compose ps

# 2. Si pas healthy, vérifiez les logs
docker compose logs db

# 3. Redémarrez tout
docker compose down -v
docker compose up -d
```

### "Port already in use"

**Problème**: `Error: listen EADDRINUSE :::3001`

**Solution**:

```bash
# Trouvez quel process utilise le port
lsof -i :3001

# Tuez le process
kill -9 <PID>

# Ou changez le port dans docker-compose.yml
# ports:
#   - "3002:3001"  # Host:Container
```

### "Image build failed"

**Problème**: `ERROR [2/4] COPY package*.json ./`

**Solution**:

```bash
# Rebuild
docker compose build --no-cache api

# Ou supprimez l'image
docker rmi alove-api:latest
docker compose build api
```

---

## 9️⃣ Résumé

| Concept            | Définition                                   |
| ------------------ | -------------------------------------------- |
| **Image**          | Recette pour créer un container (Dockerfile) |
| **Container**      | Instance en cours d'une image                |
| **Dockerfile**     | Script qui décrit comment créer une image    |
| **docker-compose** | Orchestration de plusieurs containers        |
| **Volume**         | Stockage persistant entre containers         |
| **Network**        | Communication entre containers               |

---

## 🎓 Checkpoint

1. Quelle est la différence entre Docker et Docker Compose?
2. Pourquoi utiliser une image multi-étapes (builder + runtime)?
3. Qu'est-ce qu'un volume Docker?
4. Comment accéder à PostgreSQL depuis l'API?

**Réponses**:

1. Docker: un container. Docker Compose: plusieurs containers orchestrés.
2. Pour réduire la taille de l'image finale (pas de compiler TypeScript en prod).
3. Persistance des données entre redémarrages du container.
4. `postgresql://alove:alove@db:5432/alove` (nom du service)

---

**Prochainement: JWT Authentication en détail!** 🔐
