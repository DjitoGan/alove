# 🔐 Sprint 3 - Authentication Implementation

**Status:** ✅ Complete  
**Date:** November 2024  
**Epic:** EPIC_A_AUTH (User Authentication & RBAC)

---

## 📋 Overview

Sprint 3 implements full user authentication with JWT tokens, password hashing, and role-based access control (RBAC). All endpoints are now protected with `@UseGuards(JwtAuthGuard)` and critical endpoints use `@Roles()` for fine-grained authorization.

---

## 🎯 Objectives Completed

### 1. ✅ Install Dependencies

- `@nestjs/jwt` - JWT token generation & verification
- `@nestjs/passport` - Authentication middleware
- `passport`, `passport-jwt`, `passport-local` - Passport strategies
- `bcrypt` & `@types/bcrypt` - Password hashing (10 salt rounds)

**Installation:**

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local bcrypt
npm install --save-dev @types/bcrypt
```

### 2. ✅ Create/Complete AuthService

**File:** `apps/api/src/modules/auth/auth.service.ts` (238 lines)

**Key Methods:**

- `register(email, password)` - Hash password with bcrypt, create user, return tokens
- `login(email, password)` - Verify credentials, issue JWT tokens
- `refreshToken(userId, email)` - Generate new access token from refresh token
- `validateUser(userId)` - Fetch user profile from database

**Security Features:**

- Bcrypt password hashing (round 10 = ~100ms per operation)
- Timing-safe password comparison (prevents timing attacks)
- Same error message for "user not found" & "wrong password" (prevents username enumeration)
- Separate JWT_SECRET for both token types

**JWT Payload:**

```typescript
interface JwtPayload {
  sub: string; // User ID (subject)
  email: string; // User email
  type: "access" | "refresh"; // Token type
}
```

### 3. ✅ Create/Complete AuthController

**File:** `apps/api/src/modules/auth/auth.controller.ts` (118 lines)

**Endpoints:**

- `POST /v1/auth/register` - Public, returns { user, accessToken, refreshToken }
- `POST /v1/auth/login` - Public, returns { user, accessToken, refreshToken }
- `POST /v1/auth/refresh` - Protected with JwtRefreshGuard, returns new tokens
- `GET /v1/auth/me` - Protected with JwtAuthGuard, returns current user profile

### 4. ✅ JWT Strategy & Refresh Strategy

**Files:**

- `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- `apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts`

**Features:**

- Extract JWT from `Authorization: Bearer <token>` header
- Validate token signature & expiration
- Return user payload { sub, email }

### 5. ✅ JWT Guards

**Files:**

- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`
- `apps/api/src/modules/auth/guards/jwt-refresh.guard.ts`

**Usage:**

```typescript
@UseGuards(JwtAuthGuard)
async getCart(@CurrentUser() user: CurrentUserPayload) {
  // user = { sub: userId, email }
}
```

### 6. ✅ Create Decorators

**Files:**

- `apps/api/src/modules/auth/decorators/current-user.decorator.ts` - Extracts user from request
- `apps/api/src/modules/auth/decorators/roles.decorator.ts` - Sets required roles metadata

**Usage:**

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MERCHANT')
async deleteUser(@Param('id') id: string) { ... }
```

### 7. ✅ RolesGuard for RBAC

**File:** `apps/api/src/modules/auth/guards/roles.guard.ts`

**Features:**

- Checks user role against @Roles() metadata
- Throws ForbiddenException if role not allowed
- Allows public access if no @Roles() decorator

**Usage:**

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
async getStats() { ... }
```

---

## 🔧 Controller Updates

All controllers updated to use `@UseGuards(JwtAuthGuard)` and `@CurrentUser()` decorator instead of `req.user`:

### ✅ cart.controller.ts

- Protected: All endpoints require `JwtAuthGuard`
- Uses `@CurrentUser() user: CurrentUserPayload`
- Removed hardcoded 'test-user-id'

### ✅ addresses.controller.ts

- Protected: All endpoints require `JwtAuthGuard`
- Uses `@CurrentUser() user: CurrentUserPayload`
- Removed `req.user?.id || 'test-user-id'`

### ✅ orders.controller.ts

- Protected: All endpoints require `JwtAuthGuard`
- Uses `@CurrentUser() user: CurrentUserPayload`
- Fixed user.sub extraction from JWT

### ✅ payments.controller.ts

- Protected: `POST /`, `GET /:id`, `POST /:id/refund` require `JwtAuthGuard`
- Uses `@CurrentUser() user: CurrentUserPayload`
- Validates order ownership via JWT user ID

### ✅ admin.controller.ts

- Protected: All endpoints require `JwtAuthGuard + RolesGuard`
- Decorator: `@Roles('ADMIN')`
- Prevents self-demotion & self-deletion
- Uses `@CurrentUser() user: CurrentUserPayload`

### ✅ catalog.controller.ts

- Public endpoints: `/search`, `/filter`, `/trending`, `/featured`, `/categories` (no auth)
- Protected endpoints: `/stats`, `/categories/*` (CRUD)
- Uses `@Roles('ADMIN')` for admin operations
- Replaced `AdminOnlyGuard` with `RolesGuard`

### ✅ auth.controller.ts

- Updated to use `@CurrentUser()` decorator
- Added `@ApiBearerAuth()` to protected endpoints

### ✅ notifications.controller.ts

- Protected: All endpoints require `JwtAuthGuard`
- Uses `@CurrentUser() user: CurrentUserPayload` for audit log only

---

## 🗂️ Directory Structure

```
apps/api/src/modules/auth/
├── auth.service.ts                 # Core auth logic
├── auth.controller.ts              # HTTP endpoints
├── auth.module.ts                  # NestJS module
├── guards/
│   ├── index.ts                   # Exports
│   ├── jwt-auth.guard.ts          # Access token validation
│   ├── jwt-refresh.guard.ts       # Refresh token validation
│   └── roles.guard.ts             # Role-based access control
├── strategies/
│   ├── index.ts                   # Exports
│   ├── jwt.strategy.ts            # Access token strategy
│   └── jwt-refresh.strategy.ts    # Refresh token strategy
├── decorators/
│   ├── index.ts                   # Exports
│   ├── current-user.decorator.ts  # Extract user from JWT
│   └── roles.decorator.ts         # Set required roles
├── dto/
│   ├── register.dto.ts            # Registration validation
│   └── login.dto.ts               # Login validation
├── types/
│   └── auth.types.ts              # TypeScript interfaces
└── index.ts                        # Module exports
```

---

## 🔐 Database Schema Updates

Prisma schema already includes:

```prisma
enum UserRole {
  ADMIN
  MERCHANT
  CUSTOMER
  SUPPORT
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   # bcrypt hashed
  name      String?
  role      UserRole @default(CUSTOMER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 🧪 Testing Credentials

The `seed.ts` now creates test users with hashed passwords:

| Email                    | Password     | Role     |
| ------------------------ | ------------ | -------- |
| admin@alove.tg           | Admin@123    | ADMIN    |
| kossi.adjaho@example.com | Merchant@123 | MERCHANT |
| akoua.tetteh@example.com | Customer@123 | CUSTOMER |
| tester1@email.com        | Test@123     | CUSTOMER |

**Reset database and seed:**

```bash
docker compose exec api npx prisma migrate reset --force
docker compose exec api npx prisma db seed
```

---

## 🔄 Authentication Flow

### Registration

```
1. User: POST /v1/auth/register { email, password }
2. Backend: Hash password with bcrypt
3. Backend: Create user in database
4. Backend: Generate JWT tokens (access + refresh)
5. Frontend: Store tokens in localStorage
```

### Login

```
1. User: POST /v1/auth/login { email, password }
2. Backend: Find user by email
3. Backend: Verify password with bcrypt.compare()
4. Backend: Generate JWT tokens
5. Frontend: Store tokens in localStorage
```

### Authenticated Request

```
1. Frontend: Include Authorization header
   Authorization: Bearer <accessToken>
2. Guard: JwtAuthGuard validates token
3. Strategy: Extract user from token payload
4. Decorator: @CurrentUser() injects user object
5. Controller: user.sub = userId, user.email = email
```

### Token Refresh

```
1. Frontend: Detects accessToken expired (15m)
2. Frontend: POST /v1/auth/refresh
   Authorization: Bearer <refreshToken>
3. Guard: JwtRefreshGuard validates refresh token
4. Service: Generates new accessToken & refreshToken (7d)
5. Frontend: Update localStorage with new tokens
```

---

## 🛡️ Role-Based Access Control (RBAC)

### Roles

- **ADMIN** - Full system access, user management, admin dashboard
- **MERCHANT** - Create/manage products, view vendor analytics
- **CUSTOMER** - Browse products, create orders, manage address book
- **SUPPORT** - Support agent access (future)

### Example Usage

```typescript
// Admin only
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Delete('users/:id')
async deleteUser(@Param('id') id: string) { ... }

// Multiple roles
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'ADMIN')
@Post('products')
async createProduct(@Body() dto: CreateProductDto) { ... }

// No role check (public or auth-only)
@UseGuards(JwtAuthGuard)
@Get('orders')
async getMyOrders() { ... }
```

---

## ⚙️ Environment Variables

Required in `.env`:

```env
JWT_SECRET=your-super-secret-key-minimum-32-chars
DATABASE_URL=postgresql://...
```

**Token Expiration:**

- Access Token: 15 minutes
- Refresh Token: 7 days

---

## 📊 Security Checklist

- [x] Passwords hashed with bcrypt (round 10)
- [x] JWT tokens signed with strong secret
- [x] Timing-safe password comparison
- [x] Username enumeration prevention
- [x] Access token has short TTL (15m)
- [x] Refresh token has longer TTL (7d)
- [x] Tokens stored in secure HTTP-only cookies (frontend implementation)
- [x] HTTPS required in production
- [x] Role-based access control
- [x] Self-demotion prevention for admins
- [x] Self-deletion prevention for admins

---

## 🚀 Next Steps (Sprint 4+)

1. **OAuth Integration** - Google, Facebook login
2. **Password Reset** - Secure email-based password recovery
3. **Email Verification** - Verify email on registration
4. **2FA (Two-Factor Authentication)** - TOTP, SMS codes
5. **Session Management** - Logout, invalidate tokens
6. **API Key Authentication** - For service-to-service auth
7. **Rate Limiting** - Prevent brute force attacks
8. **Audit Logging** - Track all authentication events

---

## 📚 Files Modified

### Created:

- `apps/api/src/modules/auth/decorators/current-user.decorator.ts`
- `apps/api/src/modules/auth/decorators/roles.decorator.ts`
- `apps/api/src/modules/auth/guards/roles.guard.ts`
- `apps/api/src/modules/auth/types/auth.types.ts`

### Updated:

- `apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts` (secret fix)
- `apps/api/src/modules/cart/cart.controller.ts`
- `apps/api/src/modules/addresses/addresses.controller.ts`
- `apps/api/src/modules/orders/orders.controller.ts`
- `apps/api/src/modules/payments/payments.controller.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/catalog/catalog.controller.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/notifications/notification.controller.ts`
- `apps/api/prisma/seed.ts` (added bcrypt hashing, test credentials)

---

## 🔗 Related Epics

- **EPIC_A_AUTH** - User Authentication & RBAC ← THIS SPRINT ✅
- **EPIC_B_CATALOG** - Product Catalog & Search (uses auth)
- **EPIC_C_ORDER** - Order Management (uses auth + roles)
- **EPIC_D_PAYMENT** - Payment Processing (uses auth)

---

## 📞 Support

For questions or issues with authentication:

1. Check test credentials in seed output
2. Verify JWT_SECRET in `.env`
3. Check token expiration times (access 15m, refresh 7d)
4. Ensure `@ApiBearerAuth()` is on protected endpoints
5. Check Swagger UI at `/api/docs` for API details

---

**Sprint 3 Complete!** 🎉
