# 📘 Module 4: Prisma & Base de Données

## 🎯 Objectifs

Après ce module, vous saurez:

- Définir un schéma Prisma
- Écrire des migrations
- Querier une base de données
- Gérer les relations (1:N, N:N, etc.)

---

## 1️⃣ Qu'est-ce que Prisma ?

### Analogie Java

En Java, vous utiliseriez **Hibernate** ou **JPA**:

```java
// Java Hibernate
@Entity
public class User {
    @Id
    @GeneratedValue
    private Long id;

    @Column(unique = true)
    private String email;

    @OneToMany
    private List<Order> orders;
}

Session session = sessionFactory.openSession();
User user = session.find(User.class, 1L);
```

**En TypeScript avec Prisma**, c'est plus simple et plus lisible:

```typescript
// TypeScript Prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  orders Order[]
}

const user = await prisma.user.findUnique({ where: { id: 1 } });
```

### Prisma = 3 outils

```
┌─────────────────────────────────┐
│     Prisma Data Layer           │
├─────────────────────────────────┤
│ 1. Prisma Client (TypeScript)   │  Interroger la DB
│ 2. Prisma Migrate              │  Contrôler les versions du schéma
│ 3. Prisma Studio               │  UI pour explorer les données
└─────────────────────────────────┘
```

---

## 2️⃣ Le Schéma Prisma

### Exemple Complet (schema.prisma)

```prisma
// Connexion à PostgreSQL
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Génère le client TypeScript
generator client {
  provider = "prisma-client-js"
}

// ===== MODÈLES =====

model User {
  id    String   @id @default(cuid())        // ID unique auto-généré
  email String   @unique                     // Email unique
  name  String?                              // Nullable (optionnel)
  password String                            // Hashé

  // Relations
  orders      Order[]
  addresses   Address[]

  // Audit
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Order {
  id        String   @id @default(cuid())
  orderNumber Int     @unique @default(autoincrement())
  total     Decimal  @db.Decimal(10, 2)     // Montant exact
  status    OrderStatus @default(PENDING)    // Enum

  // Relation inverse (Foreign Key)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Relation 1:N
  items     OrderItem[]

  createdAt DateTime @default(now())

  @@index([userId])  // Index pour les requêtes rapides
  @@unique([userId, orderNumber])  // Unique combiné
}

model OrderItem {
  id      String @id @default(cuid())
  quantity Int
  price   Decimal @db.Decimal(10, 2)

  // Relations
  orderId String
  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)

  partId  String
  part    Part    @relation(fields: [partId], references: [id])
}

model Part {
  id    String  @id @default(cuid())
  title String
  price Decimal @db.Decimal(10, 2)
  stock Int     @default(0)

  // Relation inverse
  orderItems OrderItem[]
}

model Address {
  id      String @id @default(cuid())
  street  String
  city    String
  country String

  userId  String
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ===== ENUMS =====

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}
```

### Types Prisma → PostgreSQL

| Prisma     | PostgreSQL  | TypeScript | Exemple            |
| ---------- | ----------- | ---------- | ------------------ |
| `String`   | `TEXT`      | `string`   | `"hello"`          |
| `Int`      | `INTEGER`   | `number`   | `42`               |
| `Decimal`  | `DECIMAL`   | `Decimal`  | `9.99`             |
| `Boolean`  | `BOOLEAN`   | `boolean`  | `true`             |
| `DateTime` | `TIMESTAMP` | `Date`     | `new Date()`       |
| `Bytes`    | `BYTEA`     | `Buffer`   | `Buffer.from(...)` |
| `Json`     | `JSONB`     | `any`      | `{ key: "value" }` |

### Attributs Spéciaux

```prisma
id          String  @id              // Clé primaire
            String  @unique          // Valeur unique
            String  @default("ok")   // Valeur par défaut
            String  @updatedAt       // Auto-mis à jour

            Int     @autoincrement() // Auto-incrément
            String  @map("user_id")  // Nom différent en DB

            String?                  // Nullable (optionnel)

            @db.Decimal(10, 2)       // Spécificité DB
```

---

## 3️⃣ Les Migrations

### Qu'est-ce qu'une Migration ?

**Analogie**: Comme un **commit Git** pour votre base de données.

```
Version 1: Créer table User
        ↓
Version 2: Ajouter colonne email
        ↓
Version 3: Créer table Order
        ↓
Version 4 (actuelle): Ajouter index sur userId
```

### Créer une Migration

**Workflow**:

```bash
# 1. Modifiez schema.prisma
# Exemple: changez name String? en name String (requis)

# 2. Créez la migration
npx prisma migrate dev --name make_name_required
# Prisma:
# - Détecte les changements dans schema.prisma
# - Génère SQL automatiquement
# - Crée un dossier prisma/migrations/TIMESTAMP_make_name_required/
# - Applique la migration à la DB locale

# 3. Validez dans Prisma Studio
npx prisma studio
```

### Fichier Migration (.sql)

```sql
-- prisma/migrations/20241216123456_make_name_required/migration.sql

-- Ajouter colonne name (non NULL)
ALTER TABLE "User"
ADD COLUMN "name" TEXT NOT NULL DEFAULT '';

-- Mettre à jour les utilisateurs existants
UPDATE "User" SET "name" = 'Unknown' WHERE "name" IS NULL;

-- Retirer la valeur par défaut temporaire
ALTER TABLE "User"
ALTER COLUMN "name" DROP DEFAULT;
```

### Commandes Essentielles

```bash
# Créer et appliquer une migration
npx prisma migrate dev --name add_user_table

# Voir le status des migrations
npx prisma migrate status

# Appliquer les migrations sans en créer
npx prisma migrate deploy  # En production

# Réinitialiser la DB (DANGER: perte de données)
npx prisma migrate reset

# Générer le client sans migration
npx prisma generate
```

---

## 4️⃣ Querying avec Prisma Client

### CRUD de Base

```typescript
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ===== CREATE =====
const user = await prisma.user.create({
  data: {
    email: "alice@example.com",
    name: "Alice",
    password: "hashed",
  },
});
// Retourne: { id: "cuid123", email: "alice@...", ... }

// ===== READ (un) =====
const user = await prisma.user.findUnique({
  where: { email: "alice@example.com" },
});

// Ou par ID
const user = await prisma.user.findUnique({
  where: { id: "cuid123" },
});

// Si non trouvé, retourne null (pas d'erreur)
// Pour une erreur, utilisez findUniqueOrThrow()
const user = await prisma.user.findUniqueOrThrow({
  where: { id: "invalid" }, // Lève une exception
});

// ===== READ (plusieurs) =====
const users = await prisma.user.findMany({
  where: {
    // Filtres
    email: { contains: "@example.com" }, // LIKE '%@example.com%'
    createdAt: { gte: new Date("2024-01-01") }, // >= date
  },
  orderBy: { createdAt: "desc" }, // Tri
  take: 10, // Limite
  skip: 0, // Offset (pagination)
  select: {
    // Colonnes à retourner
    id: true,
    email: true,
    // Exclut les autres champs
  },
});

// ===== UPDATE =====
const user = await prisma.user.update({
  where: { id: "cuid123" },
  data: {
    name: "Alice Updated",
    email: "newemail@example.com",
  },
});

// Ou updateMany
await prisma.user.updateMany({
  where: { email: { endsWith: "@old-domain.com" } },
  data: { email: "newdomain@example.com" },
});

// ===== DELETE =====
await prisma.user.delete({
  where: { id: "cuid123" },
});

// Ou deleteMany
await prisma.user.deleteMany({
  where: { createdAt: { lt: new Date("2020-01-01") } },
});

// ===== COUNT =====
const count = await prisma.user.count({
  where: { email: { contains: "@gmail.com" } },
});
// Retourne: 42
```

### Relations

```typescript
// ===== INCLUDE (Charger relations) =====
const order = await prisma.order.findUnique({
  where: { id: "order123" },
  include: {
    user: true, // Inclut l'utilisateur
    items: true, // Inclut les OrderItems
    items: {
      include: { part: true }, // Imbriqué: OrderItem.part
    },
  },
});

// Résultat:
// {
//   id: "order123",
//   total: 99.99,
//   user: { id: "user1", email: "..." },  // Objet User
//   items: [
//     { id: "item1", quantity: 2, part: { id: "part1", ... } }
//   ]
// }

// ===== SELECT (Exclure relations) =====
const order = await prisma.order.findUnique({
  where: { id: "order123" },
  select: {
    id: true,
    total: true,
    // user et items sont exclus
  },
});

// ===== CRÉER avec relations =====
const order = await prisma.order.create({
  data: {
    total: 99.99,
    status: "PENDING",
    user: {
      connect: { id: "user123" }, // Lier à un user existant
    },
    items: {
      create: [
        // Créer en même temps
        {
          quantity: 2,
          price: 49.99,
          part: { connect: { id: "part123" } },
        },
      ],
    },
  },
  include: { user: true, items: true }, // Retourner les relations
});
```

---

## 5️⃣ Prisma dans NestJS (ALOVE)

### prisma.service.ts (ALOVE)

```typescript
import { Injectable, OnModuleInit, INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Se connecte au démarrage du module
    await this.$connect();
    console.log("✅ Prisma connected to database");
  }

  async enableShutdownHooks(app: INestApplication) {
    // Ferme la connexion au shutdown
    this.$on("beforeExit", async () => {
      await app.close();
    });
  }
}
```

**Usage dans un Service**:

```typescript
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(email: string, password: string) {
    // Vérifie si l'utilisateur existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException("User already exists");
    }

    // Crée l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 10),
      },
      select: { id: true, email: true, createdAt: true }, // Pas le password
    });

    return user;
  }
}
```

---

## 6️⃣ Exercices Pratiques

### Exercice 1: Créer un Schéma

**Énoncé**: Créez un modèle `Category` pour les pièces auto dans schema.prisma.

```prisma
// Propriétés:
// - id (cuid, primaire)
// - name (string, unique, 255 caractères max)
// - description (string, nullable)
// - createdAt (DateTime, défaut maintenant)

// Relation:
// - Une catégorie a PLUSIEURS parts (1:N)
```

**Solution**:

```prisma
model Category {
  id          String   @id @default(cuid())
  name        String   @unique @db.VarChar(255)
  description String?
  parts       Part[]   // Inverse de la relation
  createdAt   DateTime @default(now())
}

model Part {
  id        String   @id @default(cuid())
  title     String
  price     Decimal  @db.Decimal(10, 2)

  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])
}
```

### Exercice 2: Requête Prisma

**Énoncé**: Dans `parts.service.ts`, écrivez une requête pour:

1. Trouver toutes les pièces d'une catégorie
2. Avec pagination (page 1, 10 par page)
3. Triées par prix croissant
4. Inclure l'info de la catégorie

**Solution**:

```typescript
async findByCategory(categoryId: string, page: number = 1) {
  const take = 10;
  const skip = (page - 1) * take;

  return await this.prisma.part.findMany({
    where: { categoryId },
    include: { category: true },
    orderBy: { price: 'asc' },
    take,
    skip,
  });
}
```

### Exercice 3: Migration

**Énoncé**: Modifiez schema.prisma pour rendre le champ `name` de User requis (pas nullable).

**Commandes**:

```bash
# 1. Modifiez schema.prisma
# Changez: name String?
# En:      name String

# 2. Créez la migration
npx prisma migrate dev --name make_user_name_required

# 3. Vérifiez dans Prisma Studio
npx prisma studio
# Accédez à http://localhost:5555 et vérifiez que name n'est plus vide
```

---

## 7️⃣ Résumé

| Concept            | Définition                                                  |
| ------------------ | ----------------------------------------------------------- |
| **Model**          | Représente une table DB                                     |
| **Migration**      | Historique versionné des changements de schéma              |
| **Prisma Client**  | Librairie TypeScript pour querier la DB                     |
| **Relation**       | Lien entre deux modèles (1:N, N:N, etc.)                    |
| **Select/Include** | Include charge les relations, Select exclut certains champs |

---

## 🎓 Checkpoint

Répondez sans regarder:

1. Quelle est la différence entre `@unique` et `@@unique`?
2. À quoi sert `@default(cuid())`?
3. Quelle commande crée une migration?
4. Pourquoi utiliser `include` au lieu de charger manuellement?

**Réponses**:

1. `@unique` = une colonne, `@@unique` = combinaison de colonnes
2. Génère automatiquement un ID unique à la création
3. `npx prisma migrate dev --name <description>`
4. Plus simple et une seule requête DB

---

**Prochainement: Docker pour containeriser votre application!** 🐳
