# 📘 Module 6: JWT Authentication - Sécuriser Votre API

## 🎯 Objectifs

Après ce module, vous saurez:

- Comment fonctionne JWT (JSON Web Token)
- La différence access token / refresh token
- Comment implémenter Passport.js dans NestJS
- Comment protéger les routes avec @UseGuards

---

## 1️⃣ Le Problème de l'Authentification

### Comment Vérifier l'Identité ?

**Scenario**: Alice accède à `/api/orders` (ses commandes privées).

**Problème**: Comment le serveur sait-il que c'est réellement Alice?

```
Client (navigateur Alice)
    │
    ├─ "Je suis Alice" ← Facile à usurper!
    │
    └─ Comment prouver?
```

### Solutions Historiques

#### 1. Session + Cookie (Ancienne)

```
Alice:      POST /login { email, password }
            ↓
Serveur:    ✓ Valide
            ├─ Crée une session en mémoire/DB: sessions = { abc123: { userId: alice } }
            └─ Envoie cookie: "sessionId=abc123"

Alice:      GET /orders
            Header: Cookie: sessionId=abc123
            ↓
Serveur:    ✓ Cherche abc123 dans les sessions
            └─ Retourne les commandes d'Alice

Problème: Serveur doit stocker TOUTES les sessions en mémoire/DB
```

#### 2. JWT (Moderne)

```
Alice:      POST /login { email, password }
            ↓
Serveur:    ✓ Valide
            ├─ Crée un token: "eyJhbGc..."
            └─ Envoie token (pas d'état serveur!)

Alice:      GET /orders
            Header: Authorization: Bearer eyJhbGc...
            ↓
Serveur:    ✓ Décode et valide le token
            └─ Retourne les commandes d'Alice

Avantage: Pas d'état serveur, scalable
```

---

## 2️⃣ JWT - Structure et Fonctionnement

### Qu'est-ce qu'un JWT ?

**JWT** = **J**son **W**eb **T**oken

C'est une chaîne composée de 3 parties séparées par des points:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### 3 Parties

#### 1. Header (Encodé en Base64)

```json
{
  "alg": "HS256", // Algorithme de signature
  "typ": "JWT" // Type
}

// Encodé: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

#### 2. Payload (Les Données)

```json
{
  "sub": "user123", // Subject (user ID)
  "email": "alice@example.com",
  "iat": 1516239022, // Issued at (timestamp)
  "exp": 1516242622, // Expiration (15 min après)
  "type": "access" // Access ou Refresh
}

// Encodé: eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIiwiaWF0IjoxNTE2MjM5MDIyfQ
```

#### 3. Signature (Sécurité)

```
HMACSHA256(
  base64(header) + "." + base64(payload),
  "ma-clé-secrète"
)

// Résultat: SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**La signature garantit que le payload n'a pas été modifié.**

### Validation d'un JWT

```
Client envoie:
  eyJhbGc...
  .eyJzdWI...
  .SflKxw...

Serveur:
  1. Récupère la signature fournie: SflKxw...
  2. Recalcule la signature avec sa clé secrète
  3. Compare
     ✓ Identiques  → Token valide, utilisateur authentifié
     ✗ Différentes → Token modifié, rejeté
```

**Important**: Le serveur est le SEUL qui connaît la clé secrète!

---

## 3️⃣ Access Token vs Refresh Token

### Le Dilemme

```
Short-lived access token (15 min):
  ✓ Sûr: expire vite
  ✗ Inconvenient: l'utilisateur doit se reconnecter souvent

Long-lived refresh token (7 jours):
  ✓ Pratique: longue session
  ✗ Risqué: si le token s'échappe, accès long terme
```

### Solution: 2 Tokens

```
╔════════════════════════════════════════════════════════╗
║                    LOGIN FLOW                          ║
╚════════════════════════════════════════════════════════╝

Alice: POST /auth/login { email, password }
       ↓
Serveur:
  ✓ Valide email/password
  ├─ Crée accessToken (15 min)
  ├─ Crée refreshToken (7 jours) → Stocke en DB/Redis
  └─ Envoie: { accessToken, refreshToken, expiresIn }

╔════════════════════════════════════════════════════════╗
║                  REQUÊTES QUOTIDIENNES                ║
╚════════════════════════════════════════════════════════╝

Alice: GET /api/orders
       Header: Authorization: Bearer <accessToken>
       ↓
Serveur:
  ✓ Valide accessToken (rapide, pas de DB)
  └─ Retourne les commandes

╔════════════════════════════════════════════════════════╗
║          L'ACCESS TOKEN EXPIRE (15 MIN)               ║
╚════════════════════════════════════════════════════════╝

Alice: GET /api/orders
       Header: Authorization: Bearer <accessToken (expiré)>
       ↓
Serveur:
  ✗ Token expiré → Retourne 401 Unauthorized

Alice: POST /auth/refresh
       Header: Authorization: Bearer <refreshToken>
       ↓
Serveur:
  ✓ Valide refreshToken (en DB/Redis)
  ├─ Crée nouveau accessToken (15 min)
  └─ Envoie: { accessToken, expiresIn }

Alice: GET /api/orders (avec nouveau accessToken)
       ↓
Serveur:
  ✓ Succès
```

---

## 4️⃣ Passport.js dans NestJS

### Qu'est-ce que Passport ?

Framework d'authentification pour Node.js qui gère:

- Stratégies d'authentification (JWT, OAuth, etc.)
- Guards (protection des routes)
- Sérialisation/désérialisation

### Structure NestJS + Passport

```typescript
// ===== 1. DÉFINIR LES STRATÉGIES =====
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Appelé si le token est valide
    return { sub: payload.sub, email: payload.email };
  }
}

// ===== 2. CRÉER LES GUARDS =====
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// ===== 3. UTILISER LE GUARD =====
// auth.controller.ts
@Get('me')
@UseGuards(JwtAuthGuard)  // Protège cette route
async getProfile(@Request() req) {
  // Si on arrive ici, le token est valide
  return req.user;
}
```

---

## 5️⃣ Implémentation Détaillée (ALOVE)

### auth.module.ts

```typescript
@Module({
  imports: [
    PrismaModule,
    PassportModule, // Passive (pas de stratégie par défaut)

    // JWT Module Configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "15m" },
      }),
    }),
  ],

  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // ← Stratégie pour access token
    JwtRefreshStrategy, // ← Stratégie pour refresh token
  ],
  exports: [AuthService],
})
export class AuthModule {}
```

### jwt.strategy.ts - Accès Token

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private configService: ConfigService) {
    super({
      // Comment extraire le token de la requête?
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Exemple: Authorization: Bearer eyJhbGc...
      //                         ^^^^^^

      // Ne pas ignorer l'expiration
      ignoreExpiration: false,

      // Clé pour vérifier la signature
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: any) {
    // Appelé automatiquement si le token est valide
    // payload = contenu du JWT (sub, email, iat, exp, type)

    console.log("✓ JWT valide:", payload);

    // Retourne l'objet utilisateur injecté dans req.user
    return {
      sub: payload.sub,
      email: payload.email,
      type: payload.type,
    };
  }
}
```

### jwt-refresh.strategy.ts - Refresh Token

```typescript
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh"
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      // Clé différente pour refresh token
      secretOrKey: configService.get<string>("JWT_REFRESH_SECRET"),
    });
  }

  async validate(payload: any) {
    console.log("✓ Refresh token valide:", payload);

    return {
      sub: payload.sub,
      email: payload.email,
      type: payload.type,
    };
  }
}
```

### Guards (Protéger les Routes)

```typescript
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  // 'jwt' = utilise la stratégie JwtStrategy
}

// jwt-refresh.guard.ts
@Injectable()
export class JwtRefreshGuard extends AuthGuard("jwt-refresh") {
  // 'jwt-refresh' = utilise la stratégie JwtRefreshStrategy
}
```

### auth.controller.ts - Utilisation

```typescript
@Controller("auth")
@UseGuards(JwtAuthGuard) // Protège tout le contrôleur
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /auth/register (sans protection)
  @Post("register")
  @UseGuards() // Annule la protection globale
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto.email, registerDto.password);
  }

  // POST /auth/login (sans protection)
  @Post("login")
  @UseGuards() // Annule la protection globale
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  // POST /auth/refresh (refresh token requis)
  @Post("refresh")
  @UseGuards(JwtRefreshGuard) // Utilise la stratégie refresh
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: any) {
    return this.authService.refreshToken(req.user.sub, req.user.email);
  }

  // GET /auth/me (access token requis)
  @Get("me")
  @UseGuards(JwtAuthGuard) // Utilise la stratégie access
  async getProfile(@Request() req: any) {
    // req.user = { sub, email, type } (injecté par JwtStrategy.validate)
    return this.authService.getUser(req.user.sub);
  }
}
```

### auth.service.ts - Logique

```typescript
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  // ===== REGISTER =====
  async register(email: string, password: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException("User already exists");
    }

    // Hash du password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword },
      select: { id: true, email: true, createdAt: true },
    });

    return {
      user,
      ...this.generateTokens(user.id, user.email),
    };
  }

  // ===== LOGIN =====
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Vérifie le password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return {
      user: { id: user.id, email: user.email },
      ...this.generateTokens(user.id, user.email),
    };
  }

  // ===== GÉNÉRER TOKENS =====
  private generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    // Access Token (court)
    const accessToken = this.jwtService.sign(
      { ...payload, type: "access" },
      {
        secret: this.configService.get<string>("JWT_SECRET"),
        expiresIn: "15m", // 15 minutes
      }
    );

    // Refresh Token (long)
    const refreshToken = this.jwtService.sign(
      { ...payload, type: "refresh" },
      {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
        expiresIn: "7d", // 7 jours
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 min en secondes (pour le frontend)
    };
  }

  // ===== REFRESH TOKENS =====
  async refreshToken(userId: string, email: string) {
    return this.generateTokens(userId, email);
  }

  // ===== OBTENIR L'UTILISATEUR =====
  async getUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true },
    });
  }
}
```

---

## 6️⃣ Test Pratique avec Postman/cURL

### 1. S'Inscrire

```bash
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!"
  }'

# Réponse:
# {
#   "user": { "id": "cuid123", "email": "alice@example.com" },
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc...",
#   "expiresIn": 900
# }
```

### 2. Se Connecter

```bash
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Accéder à /me (Protégé)

```bash
# Sans token → Erreur 401
curl http://localhost:3001/v1/auth/me

# Avec token → Succès
curl http://localhost:3001/v1/auth/me \
  -H "Authorization: Bearer eyJhbGc..."
```

### 4. Renouveler le Token

```bash
curl -X POST http://localhost:3001/v1/auth/refresh \
  -H "Authorization: Bearer <refreshToken>"
```

---

## 7️⃣ Configuration Environnement

### .env

```
JWT_SECRET=super-secret-key-keep-it-safe
JWT_REFRESH_SECRET=refresh-secret-key-also-safe
```

**En production**:

- Utilisez des clés très longues et aléatoires
- Stockez-les dans un gestionnaire de secrets (AWS Secrets Manager, etc.)
- Changez-les régulièrement

---

## 8️⃣ Exercices

### Exercice 1: Protéger une Route

**Énoncé**: Protégez la route `GET /api/parts` avec un JWT.

**Solution**:

```typescript
@Controller("parts")
export class PartsController {
  @Get()
  @UseGuards(JwtAuthGuard) // ← Ajouter ceci
  async getParts() {
    return this.partsService.findAll();
  }
}
```

### Exercice 2: Injecter l'Utilisateur

**Énoncé**: Dans `PartsController.getParts()`, obtenez l'ID de l'utilisateur connecté.

**Solution**:

```typescript
@Get()
@UseGuards(JwtAuthGuard)
async getParts(@Request() req: any) {
  const userId = req.user.sub;  // ← Injecté par JwtStrategy.validate()
  console.log('Utilisateur:', userId);
  return this.partsService.findAll();
}
```

### Exercice 3: Créer un Custom Decorator

**Énoncé**: Créez un décorateur `@CurrentUser()` pour simplifier l'accès à l'utilisateur.

**Solution**:

```typescript
// current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Utilisation:
@Get()
@UseGuards(JwtAuthGuard)
async getParts(@CurrentUser() user: any) {
  console.log('Utilisateur:', user.sub);
  return this.partsService.findAll();
}
```

---

## 9️⃣ Résumé

| Concept           | Rôle                                    |
| ----------------- | --------------------------------------- |
| **JWT**           | Token contenant des données + signature |
| **Access Token**  | Court (15 min), pour les requêtes       |
| **Refresh Token** | Long (7 jours), pour renouveler         |
| **Passport**      | Framework d'authentification            |
| **Strategy**      | Comment valider un token                |
| **Guard**         | Protège une route/contrôleur            |

---

## 🎓 Checkpoint

1. Pourquoi 2 tokens (access + refresh)?
2. Comment Passport valide un JWT?
3. Qu'est-ce que le payload d'un JWT?
4. Comment protéger une route?

**Réponses**:

1. Access court = sûr, Refresh long = pratique.
2. Vérifie la signature avec la clé secrète.
3. Les données (sub, email, exp, etc.).
4. `@UseGuards(JwtAuthGuard)` sur la méthode/contrôleur.

---

**Prochainement: Redis et Cache!** ⚡
