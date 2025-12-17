# 📘 Guide Pratique ALOVE - Comprendre Tout le Code

## 🎯 Objectif

Ce guide vous fait faire un **tour complet** du code ALOVE en expliquant chaque fichier important.

---

## 📂 Structure Complète du Projet

```
alove/
├── apps/
│   ├── api/                          # Backend NestJS
│   │   ├── src/
│   │   │   ├── main.ts               # 🔵 Point d'entrée
│   │   │   ├── app.module.ts         # 🔵 Module racine
│   │   │   ├── common/               # Code partagé
│   │   │   │   ├── filters/          # Gestion d'erreurs
│   │   │   │   └── interceptors/     # Logging
│   │   │   └── modules/              # Modules métier
│   │   │       ├── auth/             # 🟢 Authentification
│   │   │       ├── otp/              # 🟢 OTP (One-Time Password)
│   │   │       ├── parts/            # 🟢 Pièces auto
│   │   │       ├── prisma/           # 🟢 Base de données
│   │   │       ├── redis/            # 🟢 Cache
│   │   │       └── health/           # 🟢 Health check
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # 🔵 Schéma DB
│   │   │   └── seed.ts               # 🔵 Données de test
│   │   ├── test/                     # Tests E2E
│   │   └── package.json
│   │
│   └── web/                          # Frontend Next.js
│       ├── pages/
│       │   └── index.tsx             # Page d'accueil
│       ├── lib/
│       │   └── i18n.ts               # Internationalisation
│       └── package.json
│
├── infra/
│   ├── docker-compose.yml            # 🔵 Services Docker
│   └── .env                          # Variables d'environnement
│
├── docs/                             # Documentation projet
└── training/                         # Cette formation
```

**Légende**:

- 🔵 = Fichiers de configuration
- 🟢 = Modules fonctionnels

---

## 🔍 Analyse Détaillée par Fichier

### 1. main.ts - Le Point de Départ

```typescript
// apps/api/src/main.ts

import "dotenv/config"; // [1] Charge .env
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import helmet from "helmet";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  // [2] Crée l'application NestJS
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || "*",
      credentials: true,
    },
  });

  // [3] Sécurité HTTP
  app.use(helmet());

  // [4] Préfixe global pour toutes les routes
  app.setGlobalPrefix("v1");
  // Toutes les routes seront /v1/xxx

  // [5] Validation automatique des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Convertit les types automatiquement
      whitelist: true, // Supprime les champs non déclarés
      forbidNonWhitelisted: true, // Erreur 400 si champs inconnus
    })
  );

  // [6] Graceful shutdown (arrêt propre)
  app.enableShutdownHooks();

  // [7] Démarre le serveur
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 API listening on http://localhost:${port}/v1`);
}

// [8] Lance tout
bootstrap().catch((err) => {
  console.error("❌ Failed to start:", err);
  process.exit(1);
});
```

**Explication ligne par ligne**:

1. **dotenv/config**: Charge les variables du fichier `.env` dans `process.env`
2. **NestFactory.create()**: Crée l'instance de l'application (comme `SpringApplication.run()`)
3. **helmet()**: Ajoute des headers de sécurité HTTP
4. **setGlobalPrefix("v1")**: Préfixe toutes les routes avec `/v1`
5. **ValidationPipe**: Valide automatiquement tous les DTOs
6. **enableShutdownHooks()**: Permet l'arrêt propre (ferme les connexions DB, etc.)
7. **app.listen()**: Démarre le serveur HTTP
8. **bootstrap()**: Fonction async qui lance tout

---

### 2. app.module.ts - Le Module Racine

```typescript
// apps/api/src/app.module.ts

@Module({
  imports: [
    // [1] Configuration globale (variables d'environnement)
    ConfigModule.forRoot({
      isGlobal: true, // Accessible dans tous les modules
      envFilePath:
        process.env.NODE_ENV === "production" ? ".env" : ".env.development",
    }),

    // [2] Modules métier
    PrismaModule, // Base de données
    RedisModule, // Cache
    AuthModule, // Authentification
    OtpModule, // OTP
    PartsModule, // Pièces
  ],

  // [3] Contrôleurs du module racine
  controllers: [HealthController],

  // [4] Providers globaux
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalHttpExceptionFilter, // Gère toutes les erreurs
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // Log toutes les requêtes
    },
  ],
})
export class AppModule {}
```

**Pourquoi ce design ?**

- **ConfigModule.forRoot({ isGlobal: true })**: Évite de ré-importer ConfigModule partout
- **APP_FILTER**: Toutes les exceptions passent par ce filtre
- **APP_INTERCEPTOR**: Toutes les requêtes passent par cet interceptor

---

### 3. Module Auth - Authentification Complète

#### auth.module.ts

```typescript
@Module({
  imports: [
    PrismaModule, // Pour accéder aux users
    PassportModule, // Framework d'authentification
    JwtModule.registerAsync({
      // Configuration JWT asynchrone
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "15m" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, // Logique métier
    JwtStrategy, // Valide les access tokens
    JwtRefreshStrategy, // Valide les refresh tokens
  ],
  exports: [AuthService], // Autres modules peuvent l'utiliser
})
export class AuthModule {}
```

#### auth.service.ts - La Logique

```typescript
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  // [1] INSCRIPTION
  async register(email: string, password: string) {
    // Vérifie si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException("User already exists");
    }

    // Hash le mot de passe (10 rounds de bcrypt)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crée l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    // Génère les tokens JWT
    return {
      user,
      ...this.generateTokens(user.id, user.email),
    };
  }

  // [2] CONNEXION
  async login(email: string, password: string) {
    // Trouve l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Vérifie le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      ...this.generateTokens(user.id, user.email),
    };
  }

  // [3] GÉNÉRATION DE TOKENS
  private generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    // Access token: court (15 min)
    const accessToken = this.jwtService.sign(
      { ...payload, type: "access" },
      {
        secret: this.configService.get<string>("JWT_SECRET"),
        expiresIn: "15m",
      }
    );

    // Refresh token: long (7 jours)
    const refreshToken = this.jwtService.sign(
      { ...payload, type: "refresh" },
      {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
        expiresIn: "7d",
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes en secondes
    };
  }
}
```

**Pourquoi deux types de tokens ?**

- **Access Token** (court): Utilisé pour chaque requête. Si compromis, expire vite.
- **Refresh Token** (long): Utilisé seulement pour renouveler l'access token.

#### auth.controller.ts - Les Routes

```typescript
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /v1/auth/register
  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto.email, registerDto.password);
  }

  // POST /v1/auth/login
  @Post("login")
  @HttpCode(HttpStatus.OK) // 200 au lieu de 201
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  // POST /v1/auth/refresh
  @Post("refresh")
  @UseGuards(JwtRefreshGuard) // Seulement avec refresh token
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: any) {
    return this.authService.refreshToken(req.user.sub, req.user.email);
  }

  // GET /v1/auth/me
  @Get("me")
  @UseGuards(JwtAuthGuard) // Protégé: nécessite access token
  async getProfile(@Request() req: any) {
    return this.authService.validateUser(req.user.sub);
  }
}
```

**Flow d'authentification**:

```
1. Client → POST /auth/register { email, password }
       ↓
2. AuthController.register() valide le DTO
       ↓
3. AuthService.register()
       ↓ vérifie email non existant
       ↓ hash password
       ↓ créé user en DB
       ↓ génère tokens JWT
       ↓
4. Client ← { user, accessToken, refreshToken }

5. Client → GET /auth/me
   Header: Authorization: Bearer <accessToken>
       ↓
6. JwtAuthGuard vérifie le token
       ↓
7. Si valide → AuthController.getProfile()
       ↓
8. Client ← { id, email, createdAt }
```

---

### 4. Module OTP - One-Time Password

#### otp.service.ts

```typescript
@Injectable()
export class OtpService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_TTL: number;
  private readonly MAX_ATTEMPTS = 3;

  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
    private configService: ConfigService
  ) {
    this.OTP_TTL = parseInt(
      this.configService.get<string>("OTP_TTL_SECONDS", "300"),
      10
    );
  }

  // [1] GÉNÉRATION OTP
  async generateOtp(
    email: string,
    purpose: "registration" | "login" | "password-reset"
  ) {
    // Vérifie que l'email peut recevoir un OTP
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (purpose === "registration" && user) {
      throw new BadRequestException("Email already registered");
    }

    // Génère un code à 6 chiffres
    const otp = this.generateRandomOtp(); // Ex: "123456"

    // Stocke dans Redis avec TTL
    const key = this.getRedisKey(email, purpose); // Ex: "otp:registration:test@example.com"
    await this.redis.set(key, otp, this.OTP_TTL); // Expire après 300s
    await this.redis.set(`${key}:attempts`, "0", this.OTP_TTL);

    // En dev, on retourne l'OTP (en prod, on l'envoie par SMS/Email)
    return {
      otp: process.env.NODE_ENV === "production" ? undefined : otp,
      expiresIn: this.OTP_TTL,
    };
  }

  // [2] VÉRIFICATION OTP
  async verifyOtp(email: string, otp: string, purpose: string) {
    const key = this.getRedisKey(email, purpose);
    const attemptsKey = `${key}:attempts`;

    // Vérifie le nombre de tentatives
    const attempts = parseInt((await this.redis.get(attemptsKey)) || "0", 10);
    if (attempts >= this.MAX_ATTEMPTS) {
      throw new UnauthorizedException("Too many failed attempts");
    }

    // Récupère l'OTP stocké
    const storedOtp = await this.redis.get(key);

    if (!storedOtp) {
      throw new UnauthorizedException("OTP expired or not found");
    }

    // Compare
    if (storedOtp !== otp) {
      await this.redis.incr(attemptsKey); // Incrémente les tentatives
      throw new UnauthorizedException("Invalid OTP");
    }

    // Succès: supprime l'OTP (usage unique)
    await this.redis.del(key);
    await this.redis.del(attemptsKey);

    return true;
  }

  private generateRandomOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getRedisKey(email: string, purpose: string): string {
    return `otp:${purpose}:${email}`;
  }
}
```

**Pourquoi Redis pour l'OTP ?**

1. **Expiration automatique** (TTL): Redis supprime la clé après X secondes
2. **Rapide**: Redis est en mémoire
3. **Atomique**: Opérations `incr`, `set` sont atomiques (pas de race condition)

---

### 5. Prisma - ORM Base de Données

#### schema.prisma

```prisma
// Base de données
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Générateur du client TypeScript
generator client {
  provider = "prisma-client-js"
}

// Modèle User
model User {
  id        String   @id @default(cuid())  // ID unique auto-généré
  email     String   @unique               // Email unique
  password  String                         // Mot de passe hashé
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  orders    Order[]
  vendors   Vendor[]
}

// Modèle Part (Pièce auto)
model Part {
  id        String   @id @default(cuid())
  title     String
  price     Decimal  @db.Decimal(10,2)  // Précision monétaire
  stock     Int      @default(0)

  vendorId  String
  vendor    Vendor   @relation(fields: [vendorId], references: [id])

  orderItems OrderItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([vendorId])  // Index pour les requêtes
}
```

**Types Prisma → TypeScript**:

| Prisma     | PostgreSQL  | TypeScript               |
| ---------- | ----------- | ------------------------ |
| `String`   | `TEXT`      | `string`                 |
| `Int`      | `INTEGER`   | `number`                 |
| `Decimal`  | `DECIMAL`   | `Decimal` (objet Prisma) |
| `DateTime` | `TIMESTAMP` | `Date`                   |
| `Boolean`  | `BOOLEAN`   | `boolean`                |

#### Utilisation de Prisma

```typescript
// Créer
const user = await prisma.user.create({
  data: {
    email: "test@example.com",
    password: "hashed",
  },
});

// Lire (un)
const user = await prisma.user.findUnique({
  where: { email: "test@example.com" },
});

// Lire (plusieurs)
const users = await prisma.user.findMany({
  where: { email: { contains: "@example.com" } },
  orderBy: { createdAt: "desc" },
  take: 10, // Limite
  skip: 0, // Offset (pagination)
});

// Mettre à jour
const user = await prisma.user.update({
  where: { id: "abc123" },
  data: { email: "newemail@example.com" },
});

// Supprimer
await prisma.user.delete({
  where: { id: "abc123" },
});

// Requête avec relation
const order = await prisma.order.findUnique({
  where: { id: "order123" },
  include: {
    items: true, // Inclut les OrderItem
    user: true, // Inclut le User
  },
});
```

---

## 🔧 Configuration Docker

### docker-compose.yml

```yaml
services:
  # [1] PostgreSQL - Base de données principale
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: alove
      POSTGRES_USER: alove
      POSTGRES_PASSWORD: alove
    ports:
      - "5432:5432"
    volumes:
      - alove_pg:/var/lib/postgresql/data # Persistance des données

  # [2] Redis - Cache et sessions
  redis:
    image: redis:7
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "6379:6379"
    volumes:
      - alove_redis:/data

  # [3] API - Notre application NestJS
  api:
    build: ../apps/api
    environment:
      DATABASE_URL: postgresql://alove:alove@db:5432/alove
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis
    ports:
      - "3001:3001"
    volumes:
      - ../apps/api:/usr/src/app # Hot reload

  # [4] Web - Frontend Next.js
  web:
    build: ../apps/web
    environment:
      NEXT_PUBLIC_API_BASE: http://localhost:3001
    depends_on:
      - api
    ports:
      - "3000:3000"

volumes:
  alove_pg:
  alove_redis:
```

**Commandes Docker essentielles**:

```bash
# Démarrer tout
docker compose up -d

# Voir les logs
docker compose logs -f api

# Arrêter
docker compose stop

# Supprimer tout (ATTENTION: perte de données)
docker compose down -v

# Exécuter une commande dans un conteneur
docker compose exec api npx prisma migrate dev
```

---

## 📚 Résumé Architecture Complète

```
┌─────────────────────────────────────────────────┐
│                    CLIENT                        │
│            (Browser, Postman, etc.)             │
└────────────────┬────────────────────────────────┘
                 │ HTTP Request
                 ↓
┌─────────────────────────────────────────────────┐
│              NestJS Application                  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │         GlobalHttpExceptionFilter         │  │ Gère les erreurs
│  └──────────────────────────────────────────┘  │
│                      ↓                           │
│  ┌──────────────────────────────────────────┐  │
│  │           LoggingInterceptor              │  │ Log les requêtes
│  └──────────────────────────────────────────┘  │
│                      ↓                           │
│  ┌──────────────────────────────────────────┐  │
│  │            ValidationPipe                 │  │ Valide les DTOs
│  └──────────────────────────────────────────┘  │
│                      ↓                           │
│  ┌──────────────────────────────────────────┐  │
│  │         Controller (AuthController)       │  │ Route HTTP
│  └───────────────────┬──────────────────────┘  │
│                      ↓                           │
│  ┌──────────────────────────────────────────┐  │
│  │          Service (AuthService)            │  │ Logique métier
│  └───────────────────┬──────────────────────┘  │
│                      ↓                           │
│  ┌──────────────────────────────────────────┐  │
│  │          ORM (PrismaService)              │  │
│  └───────────────────┬──────────────────────┘  │
└────────────────────┬─────────────────────────┘
                     │ SQL Query
                     ↓
┌─────────────────────────────────────────────────┐
│              PostgreSQL Database                 │
└─────────────────────────────────────────────────┘
```

---

## 🎓 Checkpoints de Compréhension

Vous devriez maintenant pouvoir répondre:

1. **Que fait main.ts ?** → Démarre l'application NestJS
2. **À quoi sert un Module ?** → Organise le code en unités logiques
3. **Différence Controller/Service ?** → Controller = routes HTTP, Service = logique métier
4. **Comment fonctionne l'injection ?** → NestJS injecte automatiquement via le constructeur
5. **Pourquoi bcrypt ?** → Hasher les mots de passe de manière sécurisée
6. **Pourquoi Redis pour OTP ?** → Expiration automatique (TTL)
7. **Qu'est-ce que Prisma ?** → ORM pour communiquer avec PostgreSQL

---

**Ce guide couvre l'essentiel du code ALOVE. Relisez-le régulièrement !** 🚀
