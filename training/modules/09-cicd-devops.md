# 📘 Module 9: CI/CD - Automatiser le Pipeline

## 🎯 Objectifs

Après ce module, vous saurez:

- Qu'est-ce que CI/CD
- Comment configurer GitHub Actions
- Tester et builder automatiquement
- Déployer sur chaque push

---

## 1️⃣ Qu'est-ce que CI/CD ?

### Le Problème

```
Sans CI/CD:

Développeur:  git push
              ↓
   ? "Ça compile chez moi!"
   ? "Les tests passent?"
   ? "Le linter est ok?"
   ? "Le code est propre?"
              ↓
     Peut-être... ou pas! 💥
```

### Avec CI/CD

```
Avec CI/CD:

Développeur:  git push
              ↓
   GitHub Actions (automatisé):
   ├─ Compile TypeScript
   ├─ Lint (ESLint)
   ├─ Format (Prettier)
   ├─ Run tests
   ├─ Build Docker image
   └─ Deploy si tout passe ✓
              ↓
     Garantie que tout fonctionne! 🎉
```

### Analogie Chaîne de Montage

```
Voiture à fabriquer:
  1. Soudure (Compiler)
  2. Inspection (Tests)
  3. Peinture (Format)
  4. Vérification finale (Lint)
  5. Livraison (Deploy)

Si une étape échoue → Stop immédiatement, pas de déploiement
```

---

## 2️⃣ GitHub Actions - Workflows

### Qu'est-ce qu'un Workflow ?

Fichier YAML qui décrit une suite d'actions automatisées.

```yaml
# .github/workflows/ci.yml

# Nom du workflow
name: CI/CD Pipeline

# Quand déclencher ce workflow?
on:
  push:
    branches: [main, develop] # Sur push vers main ou develop
  pull_request:
    branches: [main] # Sur une PR vers main

# Les jobs à exécuter
jobs:
  # Job 1: Test et Lint
  test-and-lint:
    runs-on: ubuntu-latest # Sur Ubuntu

    services:
      # Services nécessaires pour les tests
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: alove_test
          POSTGRES_USER: alove
          POSTGRES_PASSWORD: alove
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    # Étapes à exécuter
    steps:
      # Étape 1: Récupérer le code
      - uses: actions/checkout@v3

      # Étape 2: Setup Node.js
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "npm" # Cache node_modules

      # Étape 3: Installer les dépendances
      - name: Install dependencies
        run: npm ci # Equivalent de npm install avec package-lock.json

      # Étape 4: Linter
      - name: Run ESLint
        run: npm run lint

      # Étape 5: Formatteur
      - name: Check formatting
        run: npm run format:check

      # Étape 6: Build TypeScript
      - name: Build
        run: npm run build

      # Étape 7: Prisma
      - name: Setup database
        run: npm run prisma:migrate
        env:
          DATABASE_URL: postgresql://alove:alove@localhost:5432/alove_test

      # Étape 8: Tests
      - name: Run tests
        run: npm run test:cov
        env:
          DATABASE_URL: postgresql://alove:alove@localhost:5432/alove_test
          REDIS_URL: redis://localhost:6379

      # Étape 9: Upload coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # Job 2: Build Docker (seulement sur main)
  docker-build:
    needs: test-and-lint # ← Dépend que test-and-lint passe
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' # Seulement si push vers main

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push API image
        uses: docker/build-push-action@v4
        with:
          context: ./apps/api
          file: ./apps/api/Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/alove-api:latest
            ${{ secrets.DOCKER_USERNAME }}/alove-api:${{ github.sha }}

      - name: Build and push Web image
        uses: docker/build-push-action@v4
        with:
          context: ./apps/web
          file: ./apps/web/Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/alove-web:latest
            ${{ secrets.DOCKER_USERNAME }}/alove-web:${{ github.sha }}
```

---

## 3️⃣ Flux d'Exécution Détaillé

### Exemple: Push vers main

```
Événement: Développeur pousse du code vers main

         ↓

GitHub Actions lance le workflow

         ↓

Job: test-and-lint
  Step 1: Récupère le code
  Step 2: Setup Node v20
  Step 3: npm ci (installe dépendances)
  Step 4: npm run lint
          ✗ Erreur ESLint → Stop immédiatement, job échoue
          ↓
  Job marked as FAILED ❌

         ↓

Job: docker-build
  Condition: needs test-and-lint (échoué) → Skip ce job

         ↓

Workflow FAILED
Status du commit: ❌ (badge rouge sur GitHub)
Développeur notifié: "Lint failed"
Pas de déploiement
```

### Cas Optimal: Tout Passe

```
Event: Push

         ↓

Job: test-and-lint
  ✓ npm ci
  ✓ npm run lint
  ✓ npm run format:check
  ✓ npm run build
  ✓ npm run test:cov
  Job: SUCCESS ✓

         ↓

Job: docker-build
  Condition: needs test-and-lint (réussi) ✓
  ✓ Build API Docker image
  ✓ Build Web Docker image
  ✓ Push à Docker Hub
  Job: SUCCESS ✓

         ↓

Workflow: SUCCESS ✓
Status du commit: ✓ (badge vert)
Images disponibles sur Docker Hub
```

---

## 4️⃣ Configuration pour ALOVE

### .github/workflows/ci.yml (Complet)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io # GitHub Container Registry

jobs:
  lint-and-test:
    name: Lint & Test
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: alove_test
          POSTGRES_USER: alove
          POSTGRES_PASSWORD: alove
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies (API)
        run: cd apps/api && npm ci

      - name: Install dependencies (Web)
        run: cd apps/web && npm ci

      - name: Lint API
        run: cd apps/api && npm run lint

      - name: Lint Web
        run: cd apps/web && npm run lint

      - name: Build API
        run: cd apps/api && npm run build
        env:
          DATABASE_URL: postgresql://alove:alove@localhost:5432/alove_test

      - name: Build Web
        run: cd apps/web && npm run build

      - name: Prisma setup
        run: cd apps/api && npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://alove:alove@localhost:5432/alove_test

      - name: Run API tests
        run: cd apps/api && npm run test:cov
        env:
          DATABASE_URL: postgresql://alove:alove@localhost:5432/alove_test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/api/coverage/lcov.info

  build-and-push:
    name: Build & Push Docker Images
    needs: lint-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata for API
        id: meta-api
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ github.repository }}/api
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha

      - name: Build and push API
        uses: docker/build-push-action@v4
        with:
          context: ./apps/api
          push: true
          tags: ${{ steps.meta-api.outputs.tags }}
          labels: ${{ steps.meta-api.outputs.labels }}

      - name: Extract metadata for Web
        id: meta-web
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ github.repository }}/web
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha

      - name: Build and push Web
        uses: docker/build-push-action@v4
        with:
          context: ./apps/web
          push: true
          tags: ${{ steps.meta-web.outputs.tags }}
          labels: ${{ steps.meta-web.outputs.labels }}
```

---

## 5️⃣ Secrets GitHub

### Configuration

Pour stocker des données sensibles (clés API, credentials):

**GitHub → Repository Settings → Secrets and variables → Actions → New repository secret**

```
DOCKER_USERNAME = amouzou
DOCKER_PASSWORD = ghp_xxxxxxxxxxxxx  # Token personal access
REGISTRY_TOKEN = xxxxxxxxxxxx
```

### Utilisation dans YAML

```yaml
- uses: docker/login-action@v2
  with:
    username: ${{ secrets.DOCKER_USERNAME }}
    password: ${{ secrets.DOCKER_PASSWORD }}
```

---

## 6️⃣ Dépannage

### Workflow Failed: "npm: command not found"

**Problème**: Step 2 (setup-node) n'a pas fonctionné.

**Solution**: Vérifiez que `uses: actions/setup-node@v3` est avant le `npm` commands.

### Docker Build: Authentication failed

**Problème**: Credentials Docker incorrects.

**Solution**:

```bash
# Générér un token sur Docker Hub
# Settings → Security → New Access Token

# Copier le token dans GitHub Secrets
```

### Tests Failed: "Connection refused: 5432"

**Problème**: PostgreSQL service pas encore prêt.

**Solution**: Ajouter `options: --health-cmd` dans la définition du service.

---

## 7️⃣ Monitoring et Notifications

### Badge de Status

Ajouter le badge dans README.md:

```markdown
![CI/CD Status](https://github.com/amouzou/alove/workflows/CI%2FCD%20Pipeline/badge.svg)
```

### Notifications Slack

Ajouter un step:

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "ALOVE CI/CD failed on ${{ github.ref }}"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 8️⃣ Exercices

### Exercice 1: Créer un Workflow Simple

**Énoncé**: Créez un workflow qui:

1. Vérifie le code
2. Exécute les tests
3. Sur succès, affiche "All checks passed"

**Solution**:

```yaml
name: Simple CI

on: [push]

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
      - run: echo "All checks passed ✓"
```

### Exercice 2: Ajouter une Condition

**Énoncé**: Deploy Docker seulement si on est sur la branche main.

**Solution**:

```yaml
build-docker:
  needs: test
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main' # ← Condition
  steps:
    - uses: actions/checkout@v3
    # ... build steps
```

---

## 9️⃣ Résumé

| Concept      | Rôle                                   |
| ------------ | -------------------------------------- |
| **Workflow** | Fichier YAML qui définit le CI/CD      |
| **Job**      | Une suite d'étapes                     |
| **Step**     | Une action individuelle                |
| **Service**  | PostgreSQL, Redis, etc. pour les tests |
| **Secret**   | Données sensibles (clés API)           |

---

## 🎓 Checkpoint

1. Quand GitHub Actions exécute-t-il un workflow?
2. Qu'est-ce qu'un `needs` dans un job?
3. Comment stocker une clé API secrète?
4. Pourquoi utiliser `npm ci` au lieu de `npm install`?

**Réponses**:

1. Sur des événements: push, PR, schedule, etc.
2. Dépendance: le job attend que les autres réussissent.
3. GitHub Secrets (Settings → Actions).
4. `ci` utilise le package-lock.json exact.

---

**Prochainement: Patterns & Best Practices!** ⭐
