# 📘 Module 10: Patterns & Best Practices

## 🎯 Objectifs

Après ce module, vous saurez:

- Principes SOLID
- Architecture hexagonale
- Patterns de conception
- Bonnes pratiques NestJS/TypeScript

---

## 1️⃣ Principes SOLID

### Analogie Construction

**Mauvais**: Construire une maison en versant du béton partout
**Bon**: Fondations solides, murs structurés, électricité séparée

### S - Single Responsibility Principle

**Une classe = une responsabilité**

```typescript
// ❌ MAUVAIS: AuthService fait tout
@Injectable()
export class AuthService {
  // Authentification
  async register(email, password) { ... }
  async login(email, password) { ... }

  // Envoi d'emails
  async sendWelcomeEmail(email) { ... }

  // Logging
  async logLoginAttempt(userId) { ... }

  // Stockage des clés
  async generateApiKey(userId) { ... }
}

// ✓ BON: Services séparés
@Injectable()
export class AuthService {
  // Seulement authentification
  async register(email, password) { ... }
  async login(email, password) { ... }
}

@Injectable()
export class EmailService {
  // Seulement emails
  async sendWelcomeEmail(email) { ... }
}

@Injectable()
export class LoggingService {
  // Seulement logging
  async logLoginAttempt(userId) { ... }
}
```

**Bénéfices**: Testable, maintenable, réutilisable.

### O - Open/Closed Principle

**Ouvert à l'extension, fermé à la modification**

```typescript
// ❌ MAUVAIS: Ajouter un type d'email = modifier la classe
@Injectable()
export class EmailService {
  async send(type: string, email: string) {
    if (type === 'welcome') {
      return this.sendWelcome(email);
    } else if (type === 'reset') {
      return this.sendReset(email);
    } else if (type === 'reminder') {
      return this.sendReminder(email);
    }
    // Besoin de modifier la classe à chaque nouveau type!
  }
}

// ✓ BON: Utiliser des stratégies
interface EmailStrategy {
  send(email: string): Promise<void>;
}

@Injectable()
export class WelcomeEmailStrategy implements EmailStrategy {
  async send(email: string) { ... }
}

@Injectable()
export class ResetEmailStrategy implements EmailStrategy {
  async send(email: string) { ... }
}

@Injectable()
export class EmailService {
  constructor(
    @Inject('EMAIL_STRATEGIES')
    private strategies: Map<string, EmailStrategy>
  ) {}

  async send(type: string, email: string) {
    const strategy = this.strategies.get(type);
    return strategy?.send(email);
  }
}
```

**Bénéfice**: Ajouter un nouveau type sans modifier le code existant.

### L - Liskov Substitution Principle

**Chaque sous-classe peut remplacer sa classe parent**

```typescript
// ❌ MAUVAIS: Square ne peut pas remplacer Rectangle
class Rectangle {
  width: number;
  height: number;

  setWidth(w: number) {
    this.width = w;
  }
  setHeight(h: number) {
    this.height = h;
  }
}

class Square extends Rectangle {
  setWidth(w: number) {
    this.width = w;
    this.height = w; // ← Casse le contrat de Rectangle!
  }
}

// Utilisation:
function testRectangle(rect: Rectangle) {
  rect.setWidth(5);
  rect.setHeight(10);
  return rect.width === 5 && rect.height === 10; // Faux pour Square!
}

// ✓ BON: Utiliser des interfaces appropriées
interface Shape {
  area(): number;
}

class Rectangle implements Shape {
  constructor(private width: number, private height: number) {}
  area() {
    return this.width * this.height;
  }
}

class Square implements Shape {
  constructor(private side: number) {}
  area() {
    return this.side * this.side;
  }
}

// Les deux implémentent Shape correctement
```

### I - Interface Segregation Principle

**Meilleur avoir plusieurs interfaces spécifiques qu'une grosse générique**

```typescript
// ❌ MAUVAIS: Une grosse interface
interface User {
  id: string;
  email: string;
  password: string;

  // Seulement pour admins:
  deleteUser(): Promise<void>;
  suspendUser(): Promise<void>;

  // Seulement pour vendeurs:
  createListing(): Promise<void>;
  updateInventory(): Promise<void>;

  // Seulement pour acheteurs:
  placeOrder(): Promise<void>;
  leaveReview(): Promise<void>;
}

// ✓ BON: Interfaces spécifiques
interface User {
  id: string;
  email: string;
  password: string;
}

interface AdminUser extends User {
  deleteUser(): Promise<void>;
  suspendUser(): Promise<void>;
}

interface SellerUser extends User {
  createListing(): Promise<void>;
  updateInventory(): Promise<void>;
}

interface BuyerUser extends User {
  placeOrder(): Promise<void>;
  leaveReview(): Promise<void>;
}
```

### D - Dependency Inversion Principle

**Dépendre d'abstractions, pas d'implémentations concrètes**

```typescript
// ❌ MAUVAIS: Couplage fort à PostgreSQL
@Injectable()
export class AuthService {
  constructor(
    private db: PostgreSqlDatabase  // ← Dépend d'une implémentation concrète
  ) {}

  async getUser(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

// ✓ BON: Dépendre d'une abstraction
interface UserRepository {
  findById(id: string): Promise<User>;
  save(user: User): Promise<void>;
}

@Injectable()
export class PostgresUserRepository implements UserRepository {
  async findById(id: string) { ... }
  async save(user: User) { ... }
}

@Injectable()
export class AuthService {
  constructor(
    @Inject('USER_REPOSITORY')
    private userRepository: UserRepository  // ← Dépend d'une abstraction
  ) {}

  async getUser(id: string) {
    return this.userRepository.findById(id);
  }
}

// Maintenant, on peut facilement changer la DB:
@Injectable()
export class MongoUserRepository implements UserRepository {
  async findById(id: string) { ... }
  async save(user: User) { ... }
}

// AuthService fonctionne avec les deux!
```

---

## 2️⃣ Architecture Hexagonale (Ports & Adapters)

### Concept

```
                   ╔════════════════════╗
                   ║     Core Logic     ║
                   ║  (AuthService)     ║
                   ╚════════════════════╝
                         ▲  ▲  ▲
        ┌────────────────┼──┼──┼────────────────┐
        │                │  │  │                │
   ┌────┴────┐     ┌─────┴──┴──┴─────┐   ┌─────┴────┐
   │ REST    │     │   Ports         │   │  gRPC   │
   │Adapter  │     │ (Interfaces)    │   │Adapter  │
   └─────────┘     │                 │   └─────────┘
        │          │  - UserPort     │        │
        │          │  - EmailPort    │        │
        │          └─────────────────┘        │
        │                  ▲                  │
        │          ┌───────┼───────┐          │
        │          │       │       │          │
   ┌────┴─────┐  ┌┴──────┴┐   ┌──┴───────┐ ┌┴─────┐
   │Database  │  │ Email  │   │ Redis   │ │Cache │
   │Adapter   │  │Adapter │   │Adapter  │ │Layer │
   └──────────┘  └────────┘   └─────────┘ └──────┘

Core Logic reste indépendant des details techniques!
```

### Exemple ALOVE

```typescript
// === PORTS (Abstractions) ===

interface UserPort {
  findById(id: string): Promise<User>;
  create(user: User): Promise<void>;
  update(id: string, data: Partial<User>): Promise<void>;
}

interface EmailPort {
  send(to: string, subject: string, body: string): Promise<void>;
}

interface CachePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
}

// === ADAPTERS (Implémentations) ===

@Injectable()
export class PrismaUserAdapter implements UserPort {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(user: User) {
    return this.prisma.user.create({ data: user });
  }

  async update(id: string, data: Partial<User>) {
    return this.prisma.user.update({ where: { id }, data });
  }
}

@Injectable()
export class SendGridEmailAdapter implements EmailPort {
  constructor(private sendGrid: SendGridService) {}

  async send(to: string, subject: string, body: string) {
    return this.sendGrid.send({
      to,
      from: "noreply@alove.com",
      subject,
      html: body,
    });
  }
}

@Injectable()
export class RedisAdapter implements CachePort {
  constructor(private redis: RedisService) {}

  async get(key: string) {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl: number) {
    return this.redis.set(key, value, ttl);
  }
}

// === CORE LOGIC (Indépendant de l'implémentation) ===

@Injectable()
export class AuthService {
  constructor(
    @Inject("USER_PORT") private userPort: UserPort,
    @Inject("EMAIL_PORT") private emailPort: EmailPort,
    @Inject("CACHE_PORT") private cachePort: CachePort
  ) {}

  async register(email: string, password: string) {
    // Logique métier
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userPort.create({
      email,
      password: hashedPassword,
    });

    // Envoie email (peu importe si c'est SendGrid, Mailgun, etc.)
    await this.emailPort.send(email, "Welcome to ALOVE", "Welcome aboard!");

    // Cache l'utilisateur (peu importe si Redis, Memcached, etc.)
    await this.cachePort.set(`user:${user.id}`, JSON.stringify(user), 3600);

    return user;
  }
}

// === INJECTION DE DÉPENDANCES ===

@Module({
  providers: [
    AuthService,
    { provide: "USER_PORT", useClass: PrismaUserAdapter },
    { provide: "EMAIL_PORT", useClass: SendGridEmailAdapter },
    { provide: "CACHE_PORT", useClass: RedisAdapter },
  ],
})
export class AuthModule {}

// Si on change de fournisseur d'email:
// { provide: 'EMAIL_PORT', useClass: MailgunEmailAdapter }
// AuthService ne change pas!
```

---

## 3️⃣ Patterns de Conception NestJS

### Repository Pattern

```typescript
// user.repository.ts
export interface IUserRepository {
  findById(id: string): Promise<User>;
  findByEmail(email: string): Promise<User>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async save(user: User) {
    const { id, ...data } = user;
    return this.prisma.user.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  async delete(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }
}

// Utilisation
@Injectable()
export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async register(email: string, password: string) {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw new ConflictException();

    const user = new User(email, password);
    return this.userRepository.save(user);
  }
}
```

### DTO (Data Transfer Object) Pattern

```typescript
// Validation automatique des inputs
import { IsEmail, IsStrongPassword, IsOptional } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsOptional()
  @IsString()
  firstName?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;
}

// Utilisation
@Controller("auth")
export class AuthController {
  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    // registerDto est automatiquement validé!
    // Si email n'est pas valide → 400 Bad Request
    return this.authService.register(registerDto.email, registerDto.password);
  }
}
```

### Interceptor Pattern

```typescript
// logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    console.log(`[${request.method}] ${request.path}`);

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - startTime;
        console.log(`[${request.method}] ${request.path} - ${duration}ms`);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        console.error(
          `[${request.method}] ${request.path} - ERROR - ${duration}ms`
        );
        throw error;
      })
    );
  }
}

// Configuration globale
app.useGlobalInterceptors(new LoggingInterceptor());
```

### Guard Pattern (Autorisation)

```typescript
// admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Injecté par JwtAuthGuard

    // Vérifie que l'utilisateur est admin
    return user && user.role === "ADMIN";
  }
}

// Utilisation
@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard) // Auth ET admin
export class AdminController {
  @Delete("users/:id")
  async deleteUser(@Param("id") id: string) {
    return this.userService.delete(id);
  }
}
```

---

## 4️⃣ Bonnes Pratiques TypeScript/NestJS

### 1. Typing Strict

```typescript
// ❌ MAUVAIS
async getUserData(userId) {
  const user = await this.db.find(userId);
  return user;
}

// ✓ BON
async getUserData(userId: string): Promise<User | null> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });
  return user;
}
```

### 2. Validation Entrée

```typescript
// ❌ MAUVAIS
@Post('login')
async login(@Body() data: any) {
  // data peut être n'importe quoi
  return this.authService.login(data.email, data.password);
}

// ✓ BON
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // loginDto validé automatiquement par class-validator
  return this.authService.login(loginDto.email, loginDto.password);
}
```

### 3. Gestion d'Erreurs

```typescript
// ❌ MAUVAIS
async getUser(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id } });
  return user;  // Peut être null, pas clair pour le caller
}

// ✓ BON
async getUser(id: string): Promise<User> {
  const user = await this.prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new NotFoundException(`User ${id} not found`);
  }

  return user;
}

// Ou avec Optional
async getUserOptional(id: string): Promise<User | null> {
  return this.prisma.user.findUnique({ where: { id } });
}
```

### 4. Enums pour les Constantes

```typescript
// ❌ MAUVAIS
async updateStatus(userId: string, status: string) {
  if (status === 'active' || status === 'suspended') {
    // ...
  }
}

// ✓ BON
enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

async updateStatus(userId: string, status: UserStatus) {
  // TypeScript garantit que status est valide
}
```

### 5. Immutabilité

```typescript
// ❌ MAUVAIS
function updateUser(user: User) {
  user.email = "new@email.com"; // Mutation!
  return user;
}

// ✓ BON
function updateUser(user: User, newEmail: string): User {
  return { ...user, email: newEmail }; // Copie
}
```

---

## 5️⃣ Structure de Dossiers

### Recommandée

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── dto/
│   │   │   ├── register.dto.ts
│   │   │   └── login.dto.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-refresh.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── jwt-refresh.guard.ts
│   │   └── repositories/
│   │       └── user.repository.ts
│   │
│   ├── parts/
│   │   ├── parts.controller.ts
│   │   ├── parts.service.ts
│   │   ├── parts.module.ts
│   │   └── dto/
│   │
│   └── ...
│
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   ├── guards/
│   │   └── admin.guard.ts
│   └── decorators/
│       └── current-user.decorator.ts
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── config/
│   ├── database.config.ts
│   └── jwt.config.ts
│
├── app.module.ts
└── main.ts
```

---

## 6️⃣ Checklist de Code Review

Avant de committer:

- [ ] Types stricts (pas de `any`)
- [ ] Pas de DTOs mixés avec entities
- [ ] Logging approprié
- [ ] Gestion d'erreurs
- [ ] Tests unitaires pour la logique métier
- [ ] Tests E2E pour les cas critiques
- [ ] Pas de secrets en dur
- [ ] Documentation pour le complexe
- [ ] Conventions de nommage respectées
- [ ] Pas de dépendances circulaires

---

## 7️⃣ Résumé

| Principe                | Bénéfice                            |
| ----------------------- | ----------------------------------- |
| **SOLID**               | Code maintenable et flexible        |
| **Hexagonal**           | Indépendance des détails techniques |
| **Repository**          | Abstraction de la persistance       |
| **DTO**                 | Validation et sérialisation         |
| **Guards/Interceptors** | Concerns transversaux               |

---

## 🎓 Checkpoint

1. Pourquoi utiliser des Repositories?
2. Quelle est la différence User entity et UserDto?
3. Comment implémenter une interface?
4. Pourquoi les Enums plutôt que des strings?

**Réponses**:

1. Abstraction de la persistance, testabilité.
2. Entity = modèle DB, Dto = données réseau.
3. `class MyClass implements MyInterface`
4. TypeScript garantit les valeurs valides.

---

## 🎓 Félicitations! 🎉

Vous avez complété toute la formation ALOVE! Vous comprendre maintenant:

- ✅ TypeScript et la syntaxe moderne
- ✅ Node.js et npm
- ✅ Architecture NestJS
- ✅ Prisma et les bases de données
- ✅ Docker et les containers
- ✅ JWT et l'authentification
- ✅ Redis et le cache
- ✅ Tests E2E
- ✅ CI/CD avec GitHub Actions
- ✅ Patterns et best practices

**Prochaines étapes**:

1. **Explorez le code ALOVE**: Relisez chaque fichier avec ce que vous avez appris
2. **Faites des exercices**: Modifiez le code, ajoutez des features
3. **Déployez**: Utilisez Docker Compose et GitHub Actions
4. **Approfondissez**: GraphQL, Microservices, Event-Driven Architecture

**Ressources**:

- [NestJS Docs](https://docs.nestjs.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

Bon courage! 🚀
