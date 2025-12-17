# 🚀 Guide Déploiement Render - Étape par étape

## 📋 Étape 1: Créer un compte Render

1. **Ouvrir** https://render.com
2. **Cliquer** "Sign up" (en haut à droite)
3. **Choisir** "Sign up with GitHub"
4. **Autoriser** Render à accéder à votre compte GitHub
5. **Confirmer** votre email (vérification)

> ✅ Vous êtes maintenant connecté à Render

---

## 🔗 Étape 2: Connecter le repo GitHub

1. **Sur Render Dashboard**, cliquer **"New"** (bouton bleu)
2. **Cliquer** "Web Service"
3. **Voir la liste** de vos repos GitHub
4. **Chercher** "alove" dans la recherche
5. **Cliquer** le bouton **"Connect"** pour `alove`

> ℹ️ Si vous ne voyez pas le repo, cliquer "Configure account" → "Grant access to more repositories"

---

## ⚙️ Étape 3: Configurer le service Web (API)

Remplir les champs:

### Nom du service

```
alove-api
```

### Root Directory

```
apps/api
```

### Build Command

```
npm install && npm run build && npx prisma migrate deploy
```

### Start Command

```
npm run start
```

### Environment (important!)

```
Select "Docker" (Dockerfile auto-detected)
```

### Plan

```
Select "Free" (gratuit)
```

### Cliquer "Create Web Service"

> ⏳ Render construit et déploie automatiquement (5-10 min)

---

## 🗄️ Étape 4: Ajouter PostgreSQL

1. **Voir le Dashboard Render**
2. **Cliquer** "New" → "PostgreSQL"
3. **Configurer**:
   - Name: `alove-db`
   - Database: `alove`
   - User: `alove`
   - Region: **Europe** (Paris CDG pour Afrique de l'Ouest)
   - Plan: **Free** (gratuit)
4. **Cliquer** "Create Database"

> ✅ Render génère automatiquement `DATABASE_URL`

---

## 🗃️ Étape 5: Ajouter Redis

1. **Cliquer** "New" → "Redis"
2. **Configurer**:
   - Name: `alove-redis`
   - Region: **Europe** (même que PostgreSQL)
   - Plan: **Free**
3. **Cliquer** "Create Redis"

> ✅ Render génère `REDIS_URL`

---

## 🔐 Étape 6: Ajouter Meilisearch (Docker Compose local)

> ℹ️ Meilisearch n'est pas dispo gratuitement sur Render
> **2 options**:
>
> **Option A**: Utiliser Meilisearch Cloud (essai gratuit, puis ~$19/mois)
> **Option B**: Ajouter Meilisearch dans un service Docker séparé sur Render (~$7/mois)
>
> Pour l'instant, on va le **passer** et utiliser Meilisearch local (en dev)

---

## 🌍 Étape 7: Configurer les variables d'environnement

1. **Sur le service API (`alove-api`)**
2. **Cliquer** "Environment"
3. **Render a auto-généré**:

   - ✅ `DATABASE_URL` (depuis PostgreSQL)
   - ✅ `REDIS_URL` (depuis Redis)

4. **Ajouter manuellement**:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secret-key-generate-this
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://alove.vercel.app

# Meilisearch - pour l'instant local
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=dev-master-key

# Sentry (optionnel, pour monitoring)
# SENTRY_DSN=your-sentry-dsn
```

> 🔑 **JWT_SECRET**: Générer une clé aléatoire
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
>
> Copier le résultat et coller dans la variable

---

## 🔍 Étape 8: Déploiement automatique

1. **Render redéploie** chaque fois que vous **push sur GitHub**
2. **Voir l'état**: Dashboard → `alove-api` → "Logs"
3. **Attendre**: Message `"Your service is live"`

---

## ✅ Résumé des URLs après déploiement

| Service             | URL                                             |
| ------------------- | ----------------------------------------------- |
| **API**             | `https://alove-api-xxxxx.onrender.com`          |
| **Database**        | Connectée automatiquement via `DATABASE_URL`    |
| **Redis**           | Connecté automatiquement via `REDIS_URL`        |
| **Swagger Docs**    | `https://alove-api-xxxxx.onrender.com/api/docs` |
| **Admin Dashboard** | Point vers le frontend Vercel                   |

---

## 🧪 Tester l'API après déploiement

```bash
# Vérifier que l'API est up
curl https://alove-api-xxxxx.onrender.com/v1/health

# Tester un endpoint (liste pièces)
curl https://alove-api-xxxxx.onrender.com/v1/parts?page=1&pageSize=10

# Voir la doc Swagger
open https://alove-api-xxxxx.onrender.com/api/docs
```

---

## 📌 Prochaines étapes

1. ✅ **Après déploiement API**: Déployer le **frontend** sur Vercel

   ```bash
   cd apps/web
   vercel --prod
   ```

2. ✅ **Configurer les variables d'environnement web**:

   - `NEXT_PUBLIC_API_BASE=https://alove-api-xxxxx.onrender.com`

3. ✅ **Ajouter Meilisearch Cloud** (optionnel mais recommandé):
   - Créer compte sur https://www.meilisearch.com/cloud
   - Ajouter les credentials dans Render

---

## ⚠️ Points importants

- **Gratuit pendant 750 heures/mois** (suffisant pour un service)
- **PostgreSQL auto-sleep** après 7 jours d'inactivité (redémarre automatiquement)
- **Logs accessibles** en direct depuis le dashboard
- **SSL automatique** (HTTPS)
- **Domaine personnalisé** payant (~$5/mois)

---

## 🆘 Dépannage courant

### Erreur: "Module not found"

→ Vérifier que `build` compile correctement:

```bash
cd apps/api && npm run build
```

### Erreur: "DATABASE_URL not found"

→ Créer PostgreSQL et vérifier qu'elle est connectée dans Environment

### Erreur: "Port 3001 not available"

→ Render utilise le `PORT` env var automatiquement (ne pas hardcoder)

### Déploiement lent

→ Normal pour la première fois (build Docker complet)
Redéploiement suivant: 30-60 sec

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **GitHub Issues**: Votre repo
- **Slack/Community**: https://render.com/community
