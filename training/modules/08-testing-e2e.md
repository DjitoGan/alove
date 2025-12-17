# 📘 Module 8: Testing E2E - Tester Votre API

## 🎯 Objectifs

Après ce module, vous saurez:

- Écrire des tests E2E (End-to-End)
- Utiliser Jest et Supertest
- Tester des routes protégées
- Voir la couverture de tests

---

## 1️⃣ Types de Tests

### Analogie Pyramide

```
        ▲
       /│\
      / │ \
     /  │  \    E2E Tests (1 test)
    ┌───┼───┐   Lents, complets, vrais APIs
    │   │   │
   /│   │   │\
  / │   │   │ \  Integration Tests (10 tests)
 ┌──┼───┼───┼──┐ Testent plusieurs modules ensemble
 │  │   │   │  │
/│  │   │   │  │\ Unit Tests (100 tests)
─┼──┼───┼───┼──┼─ Rapides, isolés, une fonction
 │  │   │   │  │ /
 └──┼───┼───┼──┘
    │   │   │ /
    └───┼───┘
        │
        V
```

**ALOVE uses**: E2E Tests (avec Supertest + Jest)

---

## 2️⃣ Jest - Framework de Test

### Configuration

```json
{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/src", "<rootDir>/test"],
  "testMatch": ["**/*.spec.ts", "**/*.e2e-spec.ts"],
  "collectCoverageFrom": ["src/**/*.ts", "!src/**/*.module.ts", "!src/main.ts"],
  "coverageThreshold": {
    "global": {
      "branches": 60,
      "functions": 60,
      "lines": 60,
      "statements": 60
    }
  }
}
```

### Anatomie d'un Test

```typescript
// auth.service.spec.ts

describe("AuthService", () => {
  // ===== SETUP =====
  let authService: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    // Avant chaque test, initialise les services
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, PrismaService],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // ===== TEST UNITAIRE =====
  it("should hash password during register", async () => {
    // ARRANGE (Préparer)
    const email = "test@example.com";
    const password = "SecurePass123!";

    // ACT (Exécuter)
    const user = await authService.register(email, password);

    // ASSERT (Vérifier)
    expect(user.email).toBe(email);
    expect(user.password).not.toBe(password); // Doit être hashé
  });

  // ===== TEST AVEC MOCK =====
  it("should throw error if email exists", async () => {
    // Mock: simule que l'utilisateur existe déjà
    jest.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
      id: "user123",
      email: "test@example.com",
      password: "hashed",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const email = "test@example.com";
    const password = "SecurePass123!";

    // Doit lancer une exception
    await expect(authService.register(email, password)).rejects.toThrow(
      ConflictException
    );
  });
});
```

---

## 3️⃣ Supertest - Tester les Routes HTTP

### Qu'est-ce que Supertest ?

Librairie qui simule des requêtes HTTP sans serveur réel.

```typescript
import * as request from "supertest";

// Avant: Requête réelle avec Postman
// POST http://localhost:3001/v1/auth/register
// Besoin d'un serveur en cours d'exécution

// Avec Supertest: Requête simulée
request(app).post("/v1/auth/register").send({ email, password }).expect(201);
```

### Test E2E Complet (ALOVE)

```typescript
// auth.e2e-spec.ts

describe("Auth E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // ===== SETUP =====
  beforeAll(async () => {
    // Crée l'application NestJS pour les tests
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // Importe tout le module
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Configure la validation
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      })
    );

    await app.init();
  });

  // ===== CLEANUP =====
  afterAll(async () => {
    // Nettoie après les tests
    await prisma.user.deleteMany({});
    await app.close();
  });

  // ===== TEST 1: REGISTER =====
  it("should register a new user", async () => {
    const registerDto = {
      email: "alice@example.com",
      password: "SecurePass123!",
    };

    const response = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send(registerDto)
      .expect(201); // Attendu: 201 Created

    // Vérifications
    expect(response.body.user).toEqual(
      expect.objectContaining({
        email: "alice@example.com",
      })
    );
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
  });

  // ===== TEST 2: LOGIN =====
  it("should login with valid credentials", async () => {
    // D'abord, s'inscrire
    await request(app.getHttpServer()).post("/v1/auth/register").send({
      email: "bob@example.com",
      password: "SecurePass123!",
    });

    // Puis, se connecter
    const response = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .send({
        email: "bob@example.com",
        password: "SecurePass123!",
      })
      .expect(200); // OK (non 201)

    expect(response.body.accessToken).toBeDefined();
  });

  // ===== TEST 3: ACCÈS PROTÉGÉ =====
  it("should access /me with valid token", async () => {
    // S'inscrire
    const registerRes = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({
        email: "charlie@example.com",
        password: "SecurePass123!",
      });

    const { accessToken } = registerRes.body;

    // Accéder à /me avec le token
    const response = await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`) // ← Token dans header
      .expect(200);

    expect(response.body.email).toBe("charlie@example.com");
  });

  // ===== TEST 4: SANS TOKEN =====
  it("should deny access to /me without token", async () => {
    await request(app.getHttpServer()).get("/v1/auth/me").expect(401); // Unauthorized
  });

  // ===== TEST 5: REFRESH TOKEN =====
  it("should refresh token", async () => {
    // S'inscrire
    const registerRes = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({
        email: "diana@example.com",
        password: "SecurePass123!",
      });

    const { refreshToken } = registerRes.body;

    // Renouveler
    const response = await request(app.getHttpServer())
      .post("/v1/auth/refresh")
      .set("Authorization", `Bearer ${refreshToken}`)
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
  });

  // ===== TEST 6: EMAIL INVALIDE =====
  it("should reject invalid email", async () => {
    const response = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({
        email: "not-an-email", // ← Invalide
        password: "SecurePass123!",
      })
      .expect(400); // Bad Request

    expect(response.body.message).toContain("email");
  });

  // ===== TEST 7: PASSWORD FAIBLE =====
  it("should reject weak password", async () => {
    const response = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({
        email: "eve@example.com",
        password: "123", // ← Trop faible
      })
      .expect(400);

    expect(response.body.message).toContain("password");
  });

  // ===== TEST 8: EMAIL DÉJÀ UTILISÉ =====
  it("should reject duplicate email", async () => {
    const dto = {
      email: "frank@example.com",
      password: "SecurePass123!",
    };

    // Première inscription
    await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send(dto)
      .expect(201);

    // Deuxième inscription (même email)
    const response = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send(dto)
      .expect(409); // Conflict

    expect(response.body.message).toContain("already exists");
  });
});
```

---

## 4️⃣ Test OTP (ALOVE)

```typescript
// otp.e2e-spec.ts

describe("OTP E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    redis = moduleFixture.get<RedisService>(RedisService);

    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true })
    );
    await app.init();
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User"');
    await app.close();
  });

  // ===== TEST 1: GÉNÉRER OTP =====
  it("should generate OTP for registration", async () => {
    const response = await request(app.getHttpServer())
      .post("/v1/otp/generate")
      .send({
        email: "newuser@example.com",
        purpose: "registration",
      })
      .expect(201);

    expect(response.body.expiresIn).toBe(300); // 5 min
    // En dev, le OTP est retourné; en prod, non
  });

  // ===== TEST 2: VÉRIFIER OTP VALIDE =====
  it("should verify valid OTP", async () => {
    const email = "user2@example.com";

    // Génère
    const genRes = await request(app.getHttpServer())
      .post("/v1/otp/generate")
      .send({ email, purpose: "registration" })
      .expect(201);

    const otp = genRes.body.otp;

    // Vérifie
    const verifyRes = await request(app.getHttpServer())
      .post("/v1/otp/verify")
      .send({
        email,
        otp,
        purpose: "registration",
      })
      .expect(200);

    expect(verifyRes.body.valid).toBe(true);
  });

  // ===== TEST 3: VÉRIFIER OTP INVALIDE =====
  it("should reject invalid OTP", async () => {
    const email = "user3@example.com";

    // Génère
    await request(app.getHttpServer())
      .post("/v1/otp/generate")
      .send({ email, purpose: "registration" })
      .expect(201);

    // Vérifie avec mauvais code
    const response = await request(app.getHttpServer())
      .post("/v1/otp/verify")
      .send({
        email,
        otp: "000000", // ← Mauvais
        purpose: "registration",
      })
      .expect(401); // Unauthorized

    expect(response.body.message).toContain("Invalid OTP");
  });

  // ===== TEST 4: LIMITE DE TENTATIVES =====
  it("should block after 3 failed attempts", async () => {
    const email = "user4@example.com";

    // Génère
    await request(app.getHttpServer())
      .post("/v1/otp/generate")
      .send({ email, purpose: "registration" })
      .expect(201);

    // 3 tentatives invalides
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post("/v1/otp/verify")
        .send({ email, otp: "000000", purpose: "registration" })
        .expect(401);
    }

    // 4ème tentative: bloquée
    const response = await request(app.getHttpServer())
      .post("/v1/otp/verify")
      .send({ email, otp: "000000", purpose: "registration" })
      .expect(401);

    expect(response.body.message).toContain("Too many");
  });

  // ===== TEST 5: OTP EXPIRÉ =====
  it("should reject expired OTP", async () => {
    const email = "user5@example.com";

    // Génère
    await request(app.getHttpServer())
      .post("/v1/otp/generate")
      .send({ email, purpose: "registration" })
      .expect(201);

    // Supprime du Redis (simule expiration)
    await redis.del(`otp:registration:${email}`);

    // Essaie de vérifier
    const response = await request(app.getHttpServer())
      .post("/v1/otp/verify")
      .send({
        email,
        otp: "123456",
        purpose: "registration",
      })
      .expect(401);

    expect(response.body.message).toContain("expired");
  });
});
```

---

## 5️⃣ Exécuter les Tests

### Commandes

```bash
# Tous les tests
npm run test

# Écouter les changements (watch mode)
npm run test:watch

# Seulement E2E
npm run test:e2e

# Avec couverture
npm run test:cov

# Un fichier spécifique
npm run test auth.spec.ts

# Un test spécifique (par description)
npm run test -- --testNamePattern="should register"
```

### Résultats

```
 PASS  test/auth.e2e-spec.ts
  Auth E2E
    ✓ should register a new user (120ms)
    ✓ should login with valid credentials (95ms)
    ✓ should access /me with valid token (87ms)
    ✓ should deny access to /me without token (35ms)
    ✓ should refresh token (102ms)
    ✓ should reject invalid email (45ms)
    ✓ should reject weak password (52ms)
    ✓ should reject duplicate email (78ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Coverage:    73% Statements | 65% Branches | 71% Functions | 72% Lines
```

---

## 6️⃣ Patterns Utiles

### Mock d'une Dépendance

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    AuthService,
    {
      provide: PrismaService,
      useValue: {
        user: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
      },
    },
  ],
}).compile();
```

### Test avec Variables d'Environnement

```typescript
beforeAll(() => {
  process.env.JWT_SECRET = "test-secret";
  process.env.NODE_ENV = "test";
});
```

### Requête avec Body et Headers

```typescript
const response = await request(app.getHttpServer())
  .post("/v1/auth/register")
  .set("Content-Type", "application/json")
  .set("User-Agent", "Test/1.0")
  .send({
    email: "test@example.com",
    password: "SecurePass123!",
  })
  .expect(201);
```

---

## 7️⃣ Exercices

### Exercice 1: Écrire un Test Simple

**Énoncé**: Testez la route `GET /api/health` (retourne 200).

**Solution**:

```typescript
it("should return 200 for /health", async () => {
  const response = await request(app.getHttpServer())
    .get("/v1/health")
    .expect(200);

  expect(response.body.status).toBe("ok");
});
```

### Exercice 2: Test de Données

**Énoncé**: Testez qu'après registration, l'utilisateur existe en DB.

**Solution**:

```typescript
it("should save user to database", async () => {
  const email = "newuser@example.com";
  const password = "SecurePass123!";

  await request(app.getHttpServer())
    .post("/v1/auth/register")
    .send({ email, password })
    .expect(201);

  // Vérifier en DB
  const user = await prisma.user.findUnique({ where: { email } });
  expect(user).toBeDefined();
  expect(user.email).toBe(email);
});
```

---

## 8️⃣ Résumé

| Concept         | Rôle                     |
| --------------- | ------------------------ |
| **describe()**  | Groupe de tests          |
| **it()**        | Un test individuel       |
| **beforeAll()** | Avant TOUS les tests     |
| **afterAll()**  | Après TOUS les tests     |
| **expect()**    | Assertion (vérification) |
| **Supertest**   | Tester les routes HTTP   |

---

## 🎓 Checkpoint

1. Quelle est la différence entre `it()` et `describe()`?
2. Qu'est-ce que Supertest?
3. Comment tester une route protégée?
4. Comment vérifier qu'une exception est levée?

**Réponses**:

1. `describe()` groupe les tests, `it()` = un test.
2. Librairie pour simuler des requêtes HTTP.
3. Inclure le token dans `Authorization` header.
4. `await expect(...).rejects.toThrow()`

---

**Prochainement: CI/CD avec GitHub Actions!** 🚀
