# 📘 Module 2: Node.js et npm - Comprendre l'Environnement

## 🎯 Objectifs du Module

À la fin de ce module, vous serez capable de:

- ✅ Comprendre ce qu'est Node.js et son rôle
- ✅ Utiliser npm pour gérer les dépendances
- ✅ Comprendre le fichier package.json
- ✅ Comprendre la structure du projet ALOVE

**Durée estimée**: 1 jour (3-4 heures)

---

## 📖 Partie 1: Qu'est-ce que Node.js ?

### Node.js Expliqué Simplement

**Avant Node.js**:

- JavaScript ne fonctionnait QUE dans les navigateurs (Chrome, Firefox, etc.)
- Pour le backend, on utilisait Java, PHP, Python, etc.

**Avec Node.js**:

- JavaScript peut maintenant fonctionner **sur le serveur** (backend)!
- C'est comme la JVM (Java Virtual Machine), mais pour JavaScript

> 💡 **Analogie**:
>
> - Java → JVM → Exécute du bytecode Java
> - JavaScript → Node.js → Exécute du code JavaScript
> - TypeScript → compilé en JavaScript → Node.js l'exécute

### Pourquoi Node.js est Populaire ?

1. **Un seul langage** (frontend ET backend)
2. **Asynchrone par nature** (très performant pour les I/O)
3. **npm** (gestionnaire de packages immense)
4. **Communauté énorme**

### Architecture Node.js

```
┌─────────────────────────────────────┐
│   Votre Code TypeScript/JavaScript  │
│   (auth.service.ts, etc.)           │
└─────────────────┬───────────────────┘
                  │ compilé en
                  ↓
┌─────────────────────────────────────┐
│        Code JavaScript              │
└─────────────────┬───────────────────┘
                  │ exécuté par
                  ↓
┌─────────────────────────────────────┐
│          Node.js Runtime            │
│     (V8 Engine de Chrome)           │
└─────────────────┬───────────────────┘
                  │
                  ↓
┌─────────────────────────────────────┐
│      Système d'Exploitation         │
│      (macOS, Linux, Windows)        │
└─────────────────────────────────────┘
```

---

## 📖 Partie 2: npm - Le Gestionnaire de Packages

### Qu'est-ce que npm ?

> 💡 **Analogie Java**: npm = Maven + Maven Central Repository

**npm** = Node Package Manager

- **Gestionnaire de dépendances** (comme Maven en Java)
- **Repository** = bibliothèque de packages (comme Maven Central)
- **Ligne de commande** pour installer, mettre à jour, supprimer des packages

### Commandes npm Essentielles

```bash
# Installer toutes les dépendances d'un projet
npm install
# Raccourci: npm i

# Installer un package spécifique
npm install express
npm install --save-dev typescript  # Pour le développement seulement

# Installer globalement (accessible partout)
npm install -g typescript

# Mettre à jour un package
npm update express

# Désinstaller un package
npm uninstall express

# Voir la liste des packages installés
npm list

# Exécuter un script défini dans package.json
npm run start
npm run build
npm run test
```

### 🔍 Dans ALOVE

```bash
# Installation des dépendances API
cd apps/api
npm install

# Installation des dépendances Web
cd apps/web
npm install
```

---

## 📖 Partie 3: Le Fichier package.json

### Qu'est-ce que package.json ?

> 💡 **Analogie Java**: package.json = pom.xml (Maven) ou build.gradle (Gradle)

C'est le **fichier de configuration** du projet Node.js. Il contient:

1. Informations sur le projet (nom, version, etc.)
2. Liste des dépendances
3. Scripts pour automatiser des tâches

### Structure Complète

Analysons le `package.json` de l'API ALOVE:

```json
{
  "name": "alove-api",
  "version": "0.1.0",
  "private": true,

  "scripts": {
    "start": "node dist/main.js",
    "start:dev": "ts-node-dev --respawn --transpile-only src/main.ts",
    "build": "tsc -p tsconfig.build.json",
    "lint": "eslint .",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },

  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "bcrypt": "^5.1.1"
  },

  "devDependencies": {
    "typescript": "^5.9.3",
    "jest": "^29.7.0"
  }
}
```

**Explication section par section**:

#### 1. Métadonnées

```json
"name": "alove-api",        // Nom du projet
"version": "0.1.0",         // Version (suivant Semantic Versioning)
"private": true,            // Ne pas publier sur npm
```

#### 2. Scripts

```json
"scripts": {
  "start": "node dist/main.js",
  // Lance l'application compilée
  // Équivalent: java -jar myapp.jar

  "start:dev": "ts-node-dev --respawn --transpile-only src/main.ts",
  // Lance en mode développement avec rechargement automatique
  // Équivalent: Maven Spring Boot DevTools

  "build": "tsc -p tsconfig.build.json",
  // Compile TypeScript → JavaScript
  // Équivalent: mvn compile

  "test": "jest",
  // Lance les tests
  // Équivalent: mvn test
}
```

**Utilisation des scripts**:

```bash
npm run start      # Lance l'app en production
npm run start:dev  # Lance en développement
npm run build      # Compile le projet
npm run test       # Lance les tests
```

#### 3. Dependencies (Dépendances de Production)

```json
"dependencies": {
  "@nestjs/common": "^10.0.0",  // Framework NestJS
  "bcrypt": "^5.1.1",           // Hachage de mots de passe
  "prisma": "^5.18.0"           // ORM pour la base de données
}
```

**Explication des versions**:

```
"bcrypt": "^5.1.1"
           │ │ │ │
           │ │ │ └─ Patch (corrections de bugs)
           │ │ └─── Minor (nouvelles features compatibles)
           │ └───── Major (breaking changes)
           └─────── ^ = accepte les mises à jour minor et patch
```

Exemples:

- `^5.1.1` accepte : 5.1.2, 5.2.0, 5.9.9 mais PAS 6.0.0
- `~5.1.1` accepte : 5.1.2, 5.1.9 mais PAS 5.2.0
- `5.1.1` accepte : SEULEMENT 5.1.1 (version exacte)

#### 4. DevDependencies (Dépendances de Développement)

```json
"devDependencies": {
  "typescript": "^5.9.3",     // Compilateur TypeScript
  "jest": "^29.7.0",          // Framework de tests
  "@types/node": "^20.19.23"  // Définitions de types pour Node.js
}
```

**Différence dependencies vs devDependencies**:

```
dependencies:
  - Nécessaires en PRODUCTION
  - Exemples: express, bcrypt, prisma
  - Installées avec: npm install

devDependencies:
  - Nécessaires seulement en DÉVELOPPEMENT
  - Exemples: typescript, jest, eslint
  - Installées avec: npm install (en dev)
  - PAS installées en production avec: npm install --production
```

---

## 📖 Partie 4: node_modules - Le Dossier des Dépendances

### Qu'est-ce que node_modules ?

```
apps/api/
├── node_modules/         ← TOUS les packages installés (peut être énorme!)
│   ├── @nestjs/
│   ├── bcrypt/
│   ├── express/
│   └── ... (des centaines de dossiers)
├── src/
├── package.json
└── package-lock.json
```

> ⚠️ **Important**: Ne JAMAIS commiter `node_modules/` dans Git !

**Pourquoi ?**

- Peut contenir des milliers de fichiers (100+ MB)
- Peut être régénéré avec `npm install`
- C'est pour ça qu'on a `.gitignore`

### package-lock.json

Ce fichier:

- **Verrouille** les versions exactes de TOUTES les dépendances
- Assure que tout le monde a les mêmes versions
- **À commiter** dans Git

> 💡 **Analogie Java**: package-lock.json = Maven's effective-pom.xml

---

## 📖 Partie 5: Modules Node.js (import/export)

### Système de Modules

Node.js utilise deux systèmes:

#### CommonJS (Ancien)

```javascript
// Exporter
module.exports = function add(a, b) {
  return a + b;
};

// Importer
const add = require("./add");
```

#### ES Modules (Moderne - ce qu'on utilise)

```typescript
// Exporter
export function add(a: number, b: number): number {
  return a + b;
}

// Ou export par défaut
export default class User {
  // ...
}

// Importer
import { add } from "./math";
import User from "./user";
```

### 🔍 Dans ALOVE

```typescript
// apps/api/src/modules/auth/auth.module.ts

// Imports
import { Module } from "@nestjs/common"; // Depuis node_modules
import { AuthService } from "./auth.service"; // Depuis notre code
import { PrismaModule } from "../prisma/prisma.module"; // Depuis notre code

// Export
@Module({
  imports: [PrismaModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {} // Exporté pour être utilisé ailleurs
```

**Règles d'import**:

```typescript
// Depuis node_modules (pas de ./ ou ../)
import { Module } from "@nestjs/common";

// Depuis un fichier local (avec ./ ou ../)
import { AuthService } from "./auth.service"; // Même dossier
import { User } from "../models/user"; // Dossier parent

// Types seulement (ne génère pas de code JavaScript)
import type { User } from "./types";
```

---

## 📖 Partie 6: Structure du Projet ALOVE

### Vue d'Ensemble

```
alove/
├── apps/                     # Applications
│   ├── api/                  # Backend NestJS
│   │   ├── node_modules/     # Dépendances (pas dans Git)
│   │   ├── src/              # Code source
│   │   │   ├── main.ts       # Point d'entrée (comme main() en Java)
│   │   │   ├── app.module.ts # Module racine
│   │   │   └── modules/      # Modules métier
│   │   ├── test/             # Tests E2E
│   │   ├── prisma/           # Schéma base de données
│   │   ├── package.json      # Configuration npm
│   │   └── tsconfig.json     # Configuration TypeScript
│   │
│   └── web/                  # Frontend Next.js
│       ├── node_modules/
│       ├── pages/
│       ├── package.json
│       └── tsconfig.json
│
├── infra/                    # Infrastructure Docker
│   ├── docker-compose.yml
│   └── .env
│
├── docs/                     # Documentation
└── training/                 # Cette formation !
```

### Le Fichier main.ts (Point d'Entrée)

```typescript
// apps/api/src/main.ts

import "dotenv/config"; // Charge les variables d'environnement
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  // Crée l'application NestJS (comme Spring Boot)
  const app = await NestFactory.create(AppModule);

  // Configure le serveur
  app.setGlobalPrefix("v1"); // Tous les endpoints commencent par /v1

  // Démarre le serveur sur le port 3001
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`API listening on http://localhost:${port}/v1`);
}

// Lance l'application
bootstrap();
```

**Comparaison avec Java**:

```java
// Java Spring Boot
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

---

## 📖 Partie 7: Variables d'Environnement (.env)

### Qu'est-ce qu'un fichier .env ?

Fichier qui contient des **variables de configuration** qui changent selon l'environnement (dev, prod, test).

> 💡 **Analogie Java**: .env = application.properties (Spring Boot)

### Exemple .env

```env
# apps/api/.env.development

NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://alove:alove@localhost:5432/alove
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-prod
```

### Utilisation dans le Code

```typescript
// Charger les variables d'environnement
import "dotenv/config";

// Les utiliser
const port = process.env.PORT || 3001;
const dbUrl = process.env.DATABASE_URL;

// Avec NestJS ConfigService (recommandé)
import { ConfigService } from "@nestjs/config";

class MyService {
  constructor(private configService: ConfigService) {}

  getPort() {
    return this.configService.get<number>("PORT", 3001); // Valeur par défaut
  }
}
```

### ⚠️ Sécurité

```
NE JAMAIS commiter .env dans Git !

✅ À commiter:   .env.example (template sans valeurs sensibles)
❌ PAS commiter: .env, .env.local, .env.production
```

---

## ✏️ Exercices Pratiques

### Exercice 1: Comprendre package.json

Ouvrez `apps/api/package.json` et répondez:

1. Combien de dépendances de production y a-t-il ?
2. Quelle commande lance l'application en mode développement ?
3. Quelle est la version de TypeScript utilisée ?
4. Que fait le script `build` ?

<details>
<summary>Réponses</summary>

1. Comptez les entrées dans `dependencies` (environ 13-15)
2. `npm run start:dev`
3. Regardez dans `devDependencies`, ligne `"typescript"`
4. Il compile le TypeScript en JavaScript avec `tsc`
</details>

### Exercice 2: Explorer node_modules

```bash
cd apps/api

# Installer les dépendances si pas déjà fait
npm install

# Explorer
ls node_modules/                    # Liste tous les packages
ls node_modules/@nestjs/            # Packages NestJS
cat node_modules/bcrypt/package.json  # Voir la config de bcrypt
```

Questions:

1. Combien de dossiers y a-t-il dans node_modules ?
2. Trouvez le package `express` - quelle est sa version ?

### Exercice 3: Créer un Module Simple

Créez un nouveau fichier `training/exercises/calculator.ts`:

```typescript
// TODO:
// 1. Créez une fonction add qui additionne deux nombres
// 2. Créez une fonction multiply qui multiplie deux nombres
// 3. Exportez ces fonctions
// 4. Créez un fichier main.ts qui les importe et les utilise
```

<details>
<summary>Solution</summary>

```typescript
// calculator.ts
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

// main.ts
import { add, multiply } from "./calculator";

console.log(add(5, 3)); // 8
console.log(multiply(4, 7)); // 28
```

Pour tester:

```bash
npx ts-node training/exercises/main.ts
```

</details>

---

## 🎓 Quiz de Validation

1. **Quelle est la différence entre Node.js et JavaScript ?**
2. **À quoi sert npm ?**
3. **Quelle est la différence entre dependencies et devDependencies ?**
4. **Pourquoi ne faut-il pas commiter node_modules ?**
5. **Que signifie le ^ dans "^5.1.1" ?**
6. **À quoi sert le fichier package-lock.json ?**

<details>
<summary>Réponses</summary>

1. Node.js est un environnement d'exécution pour JavaScript côté serveur
2. npm gère les dépendances (installer, mettre à jour, supprimer des packages)
3. dependencies = nécessaires en production, devDependencies = seulement en développement
4. Car c'est très volumineux et peut être régénéré avec npm install
5. Accepte les mises à jour minor et patch, mais pas major
6. Il verrouille les versions exactes de toutes les dépendances
</details>

---

## 🔍 Analyse du Code ALOVE

### Les Scripts du Projet

#### `npm run start:dev`

```json
"start:dev": "ts-node-dev --respawn --transpile-only src/main.ts"
```

**Explication**:

- `ts-node-dev`: Exécute du TypeScript directement (sans compilation préalable)
- `--respawn`: Redémarre automatiquement si le code change
- `--transpile-only`: Compile vite (sans vérification de types complète)
- `src/main.ts`: Fichier à exécuter

**C'est comme**: Lancer votre serveur en mode "hot reload" - vous modifiez le code, il redémarre automatiquement !

#### `npm run build`

```json
"build": "tsc -p tsconfig.build.json"
```

**Explication**:

- `tsc`: TypeScript Compiler
- `-p tsconfig.build.json`: Utilise cette configuration
- Résultat: Crée le dossier `dist/` avec le JavaScript compilé

**Processus**:

```
src/main.ts (TypeScript)
    ↓ tsc compile
dist/main.js (JavaScript)
```

#### `npm run test:e2e`

```json
"test:e2e": "jest --config ./test/jest-e2e.json"
```

**Explication**:

- `jest`: Framework de tests (comme JUnit en Java)
- `--config`: Utilise cette configuration spécifique pour les tests E2E
- Lance tous les fichiers `*.e2e-spec.ts`

---

## 📚 Points Clés à Retenir

✅ **Node.js** = Environnement d'exécution pour JavaScript serveur  
✅ **npm** = Gestionnaire de dépendances (comme Maven)  
✅ **package.json** = Configuration du projet  
✅ **node_modules** = Dossier des dépendances (ne pas commiter)  
✅ **Scripts npm** = Automatisation de tâches  
✅ **.env** = Variables d'environnement (secrets, config)

---

## ➡️ Prochaine Étape

Maintenant que vous comprenez l'environnement Node.js, passez au [Module 3: Architecture Backend avec NestJS](./03-nestjs-architecture.md).

**Prérequis pour continuer**:

- Avoir fait `npm install` dans apps/api et apps/web
- Comprendre package.json et les scripts npm
- Savoir ce que fait `npm run start:dev`

---

## 📖 Ressources Supplémentaires

- [Node.js Official Docs](https://nodejs.org/docs/latest/api/)
- [npm Documentation](https://docs.npmjs.com/)
- [package.json Configuration](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [Semantic Versioning](https://semver.org/)
