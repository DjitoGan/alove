# 🎓 Formation ALOVE - Du Novice à l'Expert

## 👋 Bienvenue dans votre parcours d'apprentissage !

Cette formation est conçue pour vous faire passer de novice à développeur capable de comprendre et maintenir le projet ALOVE. Elle est progressive, détaillée et appliquée directement au code du projet.

---

## 📚 Structure de la Formation

### 🎯 Niveau Débutant (Semaine 1-2)

#### Module 1: TypeScript - Les Bases

- **Fichier**: [01-typescript-basics.md](./modules/01-typescript-basics.md)
- Concepts: Types, interfaces, classes, génériques
- Application ALOVE: DTOs, services, contrôleurs

#### Module 2: Node.js et npm

- **Fichier**: [02-nodejs-npm.md](./modules/02-nodejs-npm.md)
- Concepts: Runtime, modules, package.json, dépendances
- Application ALOVE: Structure du projet, scripts

#### Module 3: Architecture Backend avec NestJS

- **Fichier**: [03-nestjs-architecture.md](./modules/03-nestjs-architecture.md)
- Concepts: Modules, contrôleurs, services, injection de dépendances
- Application ALOVE: Structure des modules Auth, OTP, Parts

---

### 🎯 Niveau Intermédiaire (Semaine 3-4)

#### Module 4: Base de Données avec Prisma

- **Fichier**: [04-prisma-database.md](./modules/04-prisma-database.md)
- Concepts: ORM, migrations, relations, requêtes
- Application ALOVE: Schema User/Vendor/Part/Order

#### Module 5: Docker et Conteneurisation

- **Fichier**: [05-docker-containers.md](./modules/05-docker-containers.md)
- Concepts: Images, conteneurs, Docker Compose, volumes
- Application ALOVE: PostgreSQL, Redis, Meilisearch, MinIO

#### Module 6: Authentification JWT

- **Fichier**: [06-jwt-authentication.md](./modules/06-jwt-authentication.md)
- Concepts: JWT, hash bcrypt, guards, strategies
- Application ALOVE: Module Auth complet

---

### 🎯 Niveau Avancé (Semaine 5-6)

#### Module 7: Redis et Cache

- **Fichier**: [07-redis-cache.md](./modules/07-redis-cache.md)
- Concepts: Cache, TTL, sessions, pub/sub
- Application ALOVE: OTP storage, rate limiting

#### Module 8: Tests E2E

- **Fichier**: [08-testing-e2e.md](./modules/08-testing-e2e.md)
- Concepts: Jest, Supertest, fixtures, mocks
- Application ALOVE: Tests OTP et Auth

#### Module 9: CI/CD et DevOps

- **Fichier**: [09-cicd-devops.md](./modules/09-cicd-devops.md)
- Concepts: GitHub Actions, pipelines, déploiement
- Application ALOVE: Workflow CI/CD complet

---

### 🎯 Pratique Avancée (Semaine 7+)

#### Module 10: Patterns et Best Practices

- **Fichier**: [10-patterns-best-practices.md](./modules/10-patterns-best-practices.md)
- Concepts: SOLID, DRY, Design patterns
- Application ALOVE: Architecture du projet

#### Guide Pratique: Comprendre le Code ALOVE

- **Fichier**: [guide-pratique-alove.md](./guide-pratique-alove.md)
- Analyse ligne par ligne du code
- Exercices pratiques
- Challenges de modification

---

## 🎮 Comment Utiliser Cette Formation

### 1. **Suivez l'Ordre des Modules**

Chaque module construit sur les concepts précédents. Ne sautez pas d'étapes !

### 2. **Théorie → Pratique**

Chaque module comporte:

- 📖 Théorie expliquée simplement
- 💻 Exemples de code isolés
- 🔍 Application dans ALOVE
- ✏️ Exercices pratiques
- ✅ Quiz de validation

### 3. **Testez le Code**

Après chaque module, vous aurez des exercices à faire dans le projet ALOVE.

### 4. **Posez des Questions**

Notez vos questions dans `training/questions.md` et nous les traiterons.

---

## 📅 Planning Suggéré

### Semaine 1: Fondations

- Lundi-Mardi: Module 1 (TypeScript)
- Mercredi-Jeudi: Module 2 (Node.js)
- Vendredi: Module 3 (NestJS) - Partie 1

### Semaine 2: Backend Basics

- Lundi-Mardi: Module 3 (NestJS) - Partie 2
- Mercredi-Jeudi: Module 4 (Prisma)
- Vendredi: Révisions + Exercices

### Semaine 3: Infrastructure

- Lundi-Mercredi: Module 5 (Docker)
- Jeudi-Vendredi: Module 6 (Auth JWT)

### Semaine 4: Features Avancées

- Lundi-Mardi: Module 7 (Redis)
- Mercredi-Jeudi: Module 8 (Tests)
- Vendredi: Module 9 (CI/CD)

### Semaine 5-6: Maîtrise

- Module 10 + Guide Pratique
- Projets personnels
- Contributions au code

---

## 🎯 Objectifs d'Apprentissage

À la fin de cette formation, vous serez capable de:

✅ Lire et comprendre tout le code TypeScript/NestJS  
✅ Créer de nouveaux endpoints API  
✅ Modifier le schéma de base de données  
✅ Écrire des tests E2E  
✅ Débugger les problèmes  
✅ Comprendre Docker et les déploiements  
✅ Contribuer activement au projet ALOVE  
✅ Expliquer l'architecture à quelqu'un d'autre

---

## 📝 Ressources Complémentaires

### Documentation Officielle

- [TypeScript](https://www.typescriptlang.org/docs/)
- [NestJS](https://docs.nestjs.com/)
- [Prisma](https://www.prisma.io/docs)
- [Docker](https://docs.docker.com/)

### Outils Pratiques

- VS Code avec extensions TypeScript
- Postman/Insomnia pour tester l'API
- Prisma Studio pour voir la DB
- Docker Desktop

---

## 🆘 Besoin d'Aide ?

1. **Questions Théoriques**: Consultez le module concerné
2. **Problèmes Code**: Voir `guide-pratique-alove.md`
3. **Erreurs**: Voir `training/troubleshooting.md`
4. **Exercices**: Solutions dans `training/solutions/`

---

## 🏆 Progression

Cochez au fur et à mesure:

- [ ] Module 1: TypeScript Basics
- [ ] Module 2: Node.js et npm
- [ ] Module 3: NestJS Architecture
- [ ] Module 4: Prisma Database
- [ ] Module 5: Docker
- [ ] Module 6: JWT Authentication
- [ ] Module 7: Redis & Cache
- [ ] Module 8: Tests E2E
- [ ] Module 9: CI/CD DevOps
- [ ] Module 10: Patterns & Best Practices
- [ ] Guide Pratique ALOVE - Complet

---

**Bon apprentissage ! 🚀**

_N'oubliez pas: La programmation s'apprend en pratiquant. Codez chaque jour, même 30 minutes !_
