# Sprint 3 Planning - Authentication (Epic A) 🔐

## 📋 Overview

Sprint 3 implémente **JWT Authentication & User Management** pour sécuriser l'API et les endpoints.

---

## 🎯 User Stories

### US-AUTH-101: User Registration

```
As a new user
I want to register with email/password
So that I can create an account

Acceptance Criteria:
- POST /v1/auth/register { email, password, name }
- Hash password with bcrypt
- Create user in database
- Return JWT token
- Validate email format
- Prevent duplicate emails
- Return user object { id, email, name, role }
```

### US-AUTH-102: User Login

```
As a registered user
I want to login with email/password
So that I can access my account

Acceptance Criteria:
- POST /v1/auth/login { email, password }
- Validate credentials
- Return JWT token + refresh token
- Return user object
- 401 on invalid credentials
```

### US-AUTH-103: JWT Token Validation

```
As an API
I want to validate JWT tokens
So that I can protect endpoints

Acceptance Criteria:
- JwtStrategy for Passport
- Guard @UseGuards(JwtAuthGuard)
- Extract userId from token
- Return 401 if invalid/expired
- Support refresh tokens
```

### US-AUTH-104: Current User Info

```
As an authenticated user
I want to get my profile
So that I can see my data

Acceptance Criteria:
- GET /v1/auth/me (protected)
- Return current user info
- Include role, preferences
- Return 401 if not authenticated
```

### US-AUTH-105: Update Profile

```
As a user
I want to update my profile
So that I can change my info

Acceptance Criteria:
- PATCH /v1/auth/profile
- Update name, email, preferences
- Validate changes
- Return updated user
```

### US-AUTH-106: Role-Based Access Control (RBAC)

```
As an admin
I want to restrict endpoints by role
So that only authorized users access them

Acceptance Criteria:
- Roles: CUSTOMER, VENDOR, ADMIN
- Protect endpoints with @Roles(ADMIN)
- Cart: CUSTOMER only
- Create parts: VENDOR only
- Admin endpoints: ADMIN only
```

---

## 🏗️ Architecture

### Backend Structure

```
apps/api/src/modules/
└── auth/
    ├── auth.service.ts
    │   ├── register()
    │   ├── login()
    │   ├── validateUser()
    │   └── refreshToken()
    ├── auth.controller.ts
    │   ├── POST /register
    │   ├── POST /login
    │   ├── GET /me
    │   ├── PATCH /profile
    │   └── POST /refresh
    ├── strategies/
    │   ├── jwt.strategy.ts
    │   └── local.strategy.ts
    ├── guards/
    │   ├── jwt-auth.guard.ts
    │   ├── roles.guard.ts
    │   └── optional-jwt.guard.ts
    ├── decorators/
    │   ├── current-user.decorator.ts
    │   └── roles.decorator.ts
    └── dto/
        ├── register.dto.ts
        ├── login.dto.ts
        └── update-profile.dto.ts
```

### Token Structure

```typescript
JWT Payload:
{
  sub: "user-id",        // subject (user ID)
  email: "user@test.com",
  role: "CUSTOMER",
  iat: 1234567890,       // issued at
  exp: 1234567890 + 3600 // expires in 1 hour
}

Refresh Token:
{
  sub: "user-id",
  type: "refresh",
  iat: 1234567890,
  exp: 1234567890 + 604800 // expires in 7 days
}
```

---

## 🔧 Implementation Steps

### Step 1: Install Dependencies

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local bcrypt
npm install --save-dev @types/bcrypt
```

### Step 2: Create Auth Service

```typescript
// auth.service.ts
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(dto: RegisterDto) {
    // 1. Check if user exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException("Email already exists");

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3. Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: "CUSTOMER",
      },
    });

    // 4. Generate tokens
    const tokens = this.generateTokens(user);

    // 5. Return
    return {
      user: this.formatUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // 1. Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    // 2. Check password
    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) throw new UnauthorizedException("Invalid credentials");

    // 3. Generate tokens
    const tokens = this.generateTokens(user);

    // 4. Return
    return {
      user: this.formatUser(user),
      ...tokens,
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  private generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: "1h" }),
      refreshToken: this.jwtService.sign(
        { ...payload, type: "refresh" },
        { expiresIn: "7d" }
      ),
    };
  }

  private formatUser(user: User) {
    const { password, ...rest } = user;
    return rest;
  }
}
```

### Step 3: Create JWT Strategy

```typescript
// strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
```

### Step 4: Create JWT Guard & Decorators

```typescript
// guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

// guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      "roles",
      context.getHandler()
    );

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

// decorators/roles.decorator.ts
export const Roles = (...roles: string[]) => SetMetadata("roles", roles);

// decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
```

### Step 5: Create Auth Controller

```typescript
// auth.controller.ts
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register new user" })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @ApiOperation({ summary: "Login user" })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get current user" })
  async getMe(@CurrentUser() user: User) {
    return user;
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update profile" })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh token" })
  async refreshToken(@Body("refreshToken") refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }
}
```

### Step 6: Update Controllers

```typescript
// Example: cart.controller.ts
@UseGuards(JwtAuthGuard)
@Roles("CUSTOMER")
@Controller("cart")
export class CartController {
  // The @CurrentUser() decorator replaces req.user?.id || 'test-user-id'

  @Get()
  async getCart(@CurrentUser() user: User) {
    return this.cartService.getOrCreateCart(user.id);
  }

  @Post("items")
  async addToCart(@CurrentUser() user: User, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(user.id, dto);
  }
}
```

### Step 7: Environment Variables

```env
# .env.development
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRATION=3600 # 1 hour
JWT_REFRESH_EXPIRATION=604800 # 7 days
```

---

## 📱 Frontend Implementation

### Frontend: Login Page

```typescript
// pages/login.tsx
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const response = await fetch("/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const { accessToken, user } = await response.json();

      // Store token
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(user));

      // Redirect to home
      router.push("/");
    }
  };

  return (
    <div>
      <h1>Connexion</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Se connecter</button>
    </div>
  );
}
```

### Frontend: Protected API Calls

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("accessToken");

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
  }

  return response;
}

// Usage:
const cart = await apiCall("/v1/cart");
const json = await cart.json();
```

---

## 🗄️ Database Updates

### User Model Enhancement

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // hashed
  name      String
  role      Role     @default(CUSTOMER) // CUSTOMER | VENDOR | ADMIN

  // Existing fields
  economyMode Boolean @default(false)
  lang       String  @default("fr")
  country    String  @default("TG")

  // Relations
  carts      Cart[]
  addresses  Address[]
  favorites  Favorite[]
  orders     Order[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}

enum Role {
  CUSTOMER
  VENDOR
  ADMIN
}
```

### Migration Command

```bash
npx prisma migrate dev --name sprint3_auth_implementation
```

---

## 🧪 Testing Scenarios

### Scenario 1: Register New User

```bash
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "password": "SecurePass123!",
    "name": "New User"
  }'

# Response:
{
  "user": {
    "id": "user-123",
    "email": "newuser@test.com",
    "name": "New User",
    "role": "CUSTOMER"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Scenario 2: Login User

```bash
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "password": "SecurePass123!"
  }'
```

### Scenario 3: Access Protected Endpoint

```bash
curl -X GET http://localhost:3001/v1/auth/me \
  -H "Authorization: Bearer eyJhbGc..."
```

### Scenario 4: Cart with Auth

```bash
# Before: Used 'test-user-id' by default
# After: Required valid JWT token, uses authenticated user ID
curl -X GET http://localhost:3001/v1/cart \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## 📊 Implementation Order

| #         | Task                         | Est. Time | Dependencies  |
| --------- | ---------------------------- | --------- | ------------- |
| 1         | Install dependencies         | 5 min     | -             |
| 2         | Create AuthService           | 30 min    | PrismaService |
| 3         | Create JWT Strategy & Guards | 20 min    | AuthService   |
| 4         | Create Auth Controller       | 20 min    | AuthService   |
| 5         | Create Login/Register pages  | 30 min    | Auth API      |
| 6         | Update existing controllers  | 30 min    | AuthService   |
| 7         | Add RBAC decorators          | 15 min    | Roles Guard   |
| 8         | Create Auth middleware       | 15 min    | JwtStrategy   |
| 9         | Update Prisma schema         | 10 min    | -             |
| 10        | Create migration             | 5 min     | Schema        |
| **TOTAL** |                              | **3h**    |               |

---

## ✅ Definition of Done

- [ ] User can register with email/password
- [ ] User can login and receive JWT token
- [ ] GET /v1/auth/me returns current user (protected)
- [ ] PATCH /v1/auth/profile updates user info
- [ ] All protected endpoints require valid JWT
- [ ] 401 returned for invalid/expired tokens
- [ ] RBAC working (CUSTOMER, VENDOR, ADMIN)
- [ ] Refresh token endpoint working
- [ ] Password hashed with bcrypt
- [ ] No 'test-user-id' hardcoding in controllers
- [ ] Tests passing
- [ ] Swagger documentation updated

---

## 🚀 Next Actions

### Immediate (Day 1)

1. [ ] Install JWT dependencies
2. [ ] Create auth.service.ts
3. [ ] Create auth.controller.ts
4. [ ] Create JWT strategy & guards
5. [ ] Update Prisma schema

### Day 2

6. [ ] Create Login/Register pages
7. [ ] Update all controllers to use @CurrentUser()
8. [ ] Add RBAC decorators
9. [ ] Create migration & seed

### Day 3

10. [ ] Test all scenarios
11. [ ] Add refresh token endpoint
12. [ ] Write tests
13. [ ] Update documentation

---

## 📚 Related Documentation

- **Prisma Auth**: https://www.prisma.io/docs/concepts/components/prisma-client
- **NestJS Auth**: https://docs.nestjs.com/security/authentication
- **JWT Best Practices**: https://tools.ietf.org/html/rfc7519
- **RBAC Pattern**: https://en.wikipedia.org/wiki/Role-based_access_control

---

**Status:** 🟢 Ready to Start  
**Created:** 17 December 2025  
**Sprint:** Sprint 3 - Authentication & Authorization
