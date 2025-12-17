# 📘 Module 3: Architecture Backend avec NestJS

## 🎯 Objectifs

- ✅ Comprendre NestJS et son architecture
- ✅ Maîtriser Modules, Contrôleurs, Services
- ✅ Comprendre l'Injection de Dépendances
- ✅ Analyser l'architecture d'ALOVE

**Durée**: 2 jours

---

## 📖 Qu'est-ce que NestJS ?

> 💡 **Analogie Java**: NestJS = Spring Boot pour Node.js/TypeScript !

**NestJS** est un framework backend qui apporte:

- **Architecture structurée** (comme Spring)
- **Injection de dépendances** (comme Spring IoC)
- **Décorateurs** (@Controller, @Injectable, etc.)
- **Modularité** (découpage en modules)

### Comparaison avec Spring Boot

| Spring Boot (Java) | NestJS (TypeScript)            |
| ------------------ | ------------------------------ |
| `@RestController`  | `@Controller()`                |
| `@Service`         | `@Injectable()`                |
| `@Autowired`       | `constructor(private service)` |
| `@RequestMapping`  | `@Get(), @Post()`              |
| `@PathVariable`    | `@Param()`                     |
| `@RequestBody`     | `@Body()`                      |

---

## 📖 Les 3 Piliers de NestJS

### 1. Modules (Organisation)

**Qu'est-ce qu'un Module ?**

Un module = un **conteneur logique** qui regroupe:

- Contrôleurs
- Services (providers)
- Imports d'autres modules

```typescript
// auth.module.ts
@Module({
  imports: [PrismaModule], // Modules dont on dépend
  controllers: [AuthController], // Contrôleurs de ce module
  providers: [AuthService], // Services de ce module
  exports: [AuthService], // Ce qu'on expose aux autres
})
export class AuthModule {}
```

**Architecture Modulaire d'ALOVE**:

```
AppModule (racine)
├── PrismaModule (base de données)
├── RedisModule (cache)
├── AuthModule
│   └── dépend de: PrismaModule
├── OtpModule
│   └── dépend de: RedisModule, PrismaModule
└── PartsModule
    └── dépend de: PrismaModule
```

### 2. Contrôleurs (Routes HTTP)

**Qu'est-ce qu'un Contrôleur ?**

Un contrôleur = **gestionnaire de routes HTTP**

> 💡 **Analogie Java**: `@RestController` en Spring

```typescript
@Controller("auth") // Préfixe: /auth
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register") // POST /auth/register
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Get("me") // GET /auth/me
  @UseGuards(JwtAuthGuard) // Protection par JWT
  async getProfile(@Request() req) {
    return this.authService.validateUser(req.user.sub);
  }
}
```

**Décorateurs HTTP**:

```typescript
@Get()      // GET
@Post()     // POST
@Put()      // PUT
@Patch()    // PATCH
@Delete()   // DELETE

// Avec paramètres
@Get(':id')  // GET /parts/123
getOne(@Param('id') id: string) {}

// Avec query params
@Get()  // GET /parts?page=1&limit=10
getAll(@Query('page') page: number) {}

// Avec body
@Post()
create(@Body() dto: CreatePartDto) {}
```

### 3. Services (Logique Métier)

**Qu'est-ce qu'un Service ?**

Un service = **logique métier réutilisable**

> 💡 **Analogie Java**: `@Service` en Spring

```typescript
@Injectable() // Peut être injecté
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(email: string, password: string) {
    // Vérifier si l'utilisateur existe
    const exists = await this.prisma.user.findUnique({
      where: { email },
    });

    if (exists) {
      throw new ConflictException("User already exists");
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword },
    });

    return user;
  }
}
```

---

## 📖 Injection de Dépendances

### Concept

> 💡 **Analogie Java**: Exactement comme `@Autowired` en Spring !

**Sans injection** (mauvais):

```typescript
class AuthService {
  private prisma = new PrismaService(); // ❌ Couplage fort
}
```

**Avec injection** (bon):

```typescript
@Injectable()
class AuthService {
  constructor(private prisma: PrismaService) {} // ✅ NestJS injecte
}
```

**Comment NestJS fait l'injection ?**

1. Vous déclarez les providers dans le module:

```typescript
@Module({
  providers: [AuthService, PrismaService],
})
```

2. NestJS crée les instances et les injecte automatiquement

3. Vous les utilisez via le constructeur

### Cycle de Vie

```
1. NestJS démarre
    ↓
2. Lit tous les @Module()
    ↓
3. Construit le graphe de dépendances
    ↓
4. Crée les instances (singletons par défaut)
    ↓
5. Injecte les dépendances
    ↓
6. Application prête !
```

---

## 📖 Décorateurs Essentiels

### Décorateurs de Classe

```typescript
@Controller('users')    // Définit un contrôleur
@Injectable()          // Rend une classe injectable
@Module({})            // Définit un module
@Global()              // Module global (accessible partout)
```

### Décorateurs de Méthode

```typescript
// HTTP Methods
@Get(), @Post(), @Put(), @Delete(), @Patch()

// Codes de statut
@HttpCode(200)
@HttpCode(HttpStatus.CREATED)

// Guards (protection)
@UseGuards(JwtAuthGuard)

// Interceptors
@UseInterceptors(LoggingInterceptor)

// Pipes (transformation/validation)
@UsePipes(ValidationPipe)
```

### Décorateurs de Paramètre

```typescript
async createUser(
  @Body() dto: CreateUserDto,           // Corps de la requête
  @Param('id') id: string,              // Paramètre d'URL
  @Query('page') page: number,          // Query parameter
  @Headers('authorization') auth: string, // Header
  @Request() req,                       // Objet request complet
  @Res() res,                          // Objet response
) {}
```

---

## 🔍 Analyse Architecture ALOVE

### app.module.ts (Module Racine)

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Config globale
    PrismaModule, // Base de données
    RedisModule, // Cache
    AuthModule, // Authentification
    OtpModule, // OTP
    PartsModule, // Pièces
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalHttpExceptionFilter, // Filtre global d'erreurs
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // Logging global
    },
  ],
})
export class AppModule {}
```

**Explication**:

- `imports`: Liste des modules utilisés
- `ConfigModule.forRoot()`: Configuration avec méthode factory
- `isGlobal: true`: Accessible partout sans import
- `APP_FILTER`: Filtre appliqué à toutes les routes
- `APP_INTERCEPTOR`: Interceptor appliqué à toutes les routes

### Module Auth Complet

```typescript
// auth.module.ts
@Module({
  imports: [
    PrismaModule, // Pour accéder à la DB
    PassportModule, // Pour les strategies
    JwtModule.register({
      // Configuration JWT
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "15m" },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, // Service principal
    JwtStrategy, // Strategy JWT
    JwtRefreshStrategy, // Strategy refresh token
  ],
  exports: [AuthService], // Expose AuthService aux autres modules
})
export class AuthModule {}
```

### Flow d'une Requête

```
1. Client → POST /v1/auth/register
                ↓
2. NestJS → Route vers AuthController.register()
                ↓
3. ValidationPipe → Valide RegisterDto
                ↓
4. AuthController → Appelle authService.register()
                ↓
5. AuthService → Logique métier
                ↓
6. PrismaService → Requête base de données
                ↓
7. AuthService → Retourne résultat
                ↓
8. AuthController → Retourne au client
                ↓
9. GlobalHttpExceptionFilter → Gère les erreurs si nécessaire
                ↓
10. Client ← Reçoit la réponse JSON
```

---

## ✏️ Exercices Pratiques

### Exercice 1: Créer un Module Simple

Créez un module "Hello" dans `apps/api/src/modules/hello/`:

1. `hello.module.ts`
2. `hello.controller.ts` avec route GET /hello
3. `hello.service.ts` qui retourne un message

<details>
<summary>Solution</summary>

```typescript
// hello.service.ts
@Injectable()
export class HelloService {
  getMessage(): string {
    return 'Hello from ALOVE API!';
  }
}

// hello.controller.ts
@Controller('hello')
export class HelloController {
  constructor(private helloService: HelloService) {}

  @Get()
  getHello(): string {
    return this.helloService.getMessage();
  }
}

// hello.module.ts
@Module({
  controllers: [HelloController],
  providers: [HelloService],
})
export class HelloModule {}

// Ajouter dans app.module.ts
imports: [..., HelloModule]
```

Tester: http://localhost:3001/v1/hello

</details>

### Exercice 2: Ajouter une Route avec Paramètre

Ajoutez une route GET /hello/:name qui salue la personne.

<details>
<summary>Solution</summary>

```typescript
// hello.controller.ts
@Get(':name')
getHelloName(@Param('name') name: string): string {
  return this.helloService.getPersonalMessage(name);
}

// hello.service.ts
getPersonalMessage(name: string): string {
  return `Hello ${name}, welcome to ALOVE!`;
}
```

</details>

---

## 📚 Points Clés

✅ NestJS = Spring Boot pour TypeScript  
✅ Module = Conteneur logique  
✅ Controller = Routes HTTP  
✅ Service = Logique métier  
✅ Injection de dépendances automatique  
✅ Décorateurs pour tout configurer

---

## ➡️ Prochaine Étape

[Module 4: Base de Données avec Prisma](./04-prisma-database.md)
