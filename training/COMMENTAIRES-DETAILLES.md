# 📝 Code Examples avec Commentaires Détaillés

Ce document fournit des **versions annotées** des exemples de code importants de ALOVE.  
Chaque ligne est expliquée en anglais pour une compréhension maximale.

---

## 🔷 Module 04: Prisma Database

### Prisma Client CRUD Operations

```typescript
import { PrismaClient } from "@prisma/client";

// [1] Initialize Prisma Client
// This creates a singleton connection to your PostgreSQL database
// IMPORTANT: Create ONCE and reuse throughout your app
// DO NOT create a new instance for every operation (performance killer!)
const prisma = new PrismaClient();

// ===== CREATE OPERATION =====
// [2] Insert a new record into the 'user' table
// The data object must contain all @id and required fields from schema.prisma
// TypeScript will error at compile time if required fields are missing!
const user = await prisma.user.create({
  data: {
    // [3] Specify field values to insert
    // Prisma validates types against schema.prisma
    // If types don't match -> TypeScript compilation error before running!
    email: "alice@example.com",
    name: "Alice",
    password: bcrypt.hashSync("SecurePass123!", 10), // ALWAYS hash passwords
  },
});
// [4] Returns the created user with auto-generated fields
// { id: "cuid123", email: "alice@example.com", createdAt: 2024-12-16T..., ... }

// ===== READ SINGLE RECORD =====
// [5] Find exactly ONE user by a UNIQUE field
// findUnique() only works with @id or @unique fields in schema.prisma
// Returns the user object if found, NULL if not found (no error thrown)
const user = await prisma.user.findUnique({
  where: { email: "alice@example.com" },
});

// [6] If user is null and you need to handle errors differently
// Use findUniqueOrThrow() which throws NotFoundError
// NestJS catches this and returns HTTP 404 automatically
const user = await prisma.user.findUniqueOrThrow({
  where: { id: "nonexistent-id" },
  // ❌ Throws error if not found
  // Better than: const user = ...; if (!user) throw new NotFoundException()
});

// ===== READ MULTIPLE RECORDS =====
// [7] Find ALL users matching conditions with pagination and sorting
const users = await prisma.user.findMany({
  // [8] WHERE clause: Filter which records to return
  where: {
    // [9] contains: Case-INSENSITIVE substring match (SQL LIKE)
    // Example: "john@example.com" contains "example.com" = TRUE
    email: { contains: "@example.com" },

    // [10] gte: Greater than or equal (SQL >=)
    // Operators: lt (less than), lte, gt, between, startsWith, endsWith
    // This finds all users registered after Jan 1, 2024
    createdAt: { gte: new Date("2024-01-01") },
  },

  // [11] ORDER BY: Sort results
  // 'desc' = descending (newest first)
  // 'asc' = ascending (oldest first)
  // ALWAYS sort by primary key if none specified for consistency
  orderBy: { createdAt: "desc" },

  // [12] LIMIT: Maximum rows to return (CRITICAL for performance)
  // Without take/skip, SQL query returns ALL matching rows
  // If you have 1M users, it loads 1M into memory! 💥
  // ALWAYS use pagination
  take: 10,

  // [13] OFFSET: Skip N rows (for pagination)
  // Formula: Page N of M per page = skip: (N-1) * M, take: M
  // Example: Page 2, 10 per page = skip: 10, take: 10 (rows 11-20)
  skip: 0,

  // [14] SELECT: Choose which columns to return (security critical!)
  // Only specified fields appear in the result
  select: {
    id: true, // Include id column
    email: true, // Include email column
    // password: false  // Implicitly false - NEVER return passwords!
    // createdAt, updatedAt, name are all excluded
  },
});

// ===== UPDATE SINGLE RECORD =====
// [15] Modify an existing user record
// The record MUST exist or findUnique() throws error
// Consider: If you want soft-delete, add a 'deletedAt' field instead
const updatedUser = await prisma.user.update({
  where: { id: "user123" },
  // [16] DATA object: Only include fields you want to UPDATE
  // Omitted fields are left unchanged
  // This is safer than: update(id, newFullUser) which requires all fields
  data: {
    email: "newemail@example.com",
    // password, name, etc. remain unchanged
    // updatedAt is automatically set to NOW() by Prisma
  },
});

// [17] Update MULTIPLE records (batch update)
// All matching records receive the same update
// Useful for migrations: "rename all 'pending' to 'waiting'"
// DANGER: If where is too broad, could update thousands of records!
// Test with findMany first: prisma.user.findMany(where) to see affected count
await prisma.user.updateMany({
  where: { email: { endsWith: "@old-company.com" } },
  // [18] This update applies to ALL matching records
  data: { email: "noreply@new-company.com" },
});

// ===== DELETE SINGLE RECORD =====
// [19] Remove a user and related data
// ⚠️ PERMANENT: Cannot be undone without backups!
// If schema has onDelete: Cascade, related Orders/Addresses are also deleted
// BEST PRACTICE: Use soft-delete (add 'deletedAt' field) instead of hard-delete
await prisma.user.delete({
  where: { id: "user123" },
});

// ===== DELETE MULTIPLE RECORDS =====
// [20] Remove multiple records (batch delete)
// Same cautions as updateMany apply
// Example: Delete users who never logged in
// Get count first: const count = await prisma.user.count(where)
await prisma.user.deleteMany({
  where: {
    // Delete all users created more than 1 year ago AND inactive
    createdAt: { lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
  },
});

// ===== COUNT RECORDS =====
// [21] Count how many records match conditions
// Returns ONLY a number (0, 1, 42, etc.), not the records
// Used for pagination UI: "Showing 1-10 of 42 results"
const gmailUserCount = await prisma.user.count({
  where: { email: { contains: "@gmail.com" } },
});
// [22] Result: 42 (just the integer)

// ===== INCLUDE RELATIONS =====
// [23] Find a user AND load their related records
// 'include' loads all related objects (Orders, Addresses)
// This executes ONE SQL query with JOIN
const userWithOrders = await prisma.order.findUnique({
  where: { id: "order123" },
  include: {
    // [24] Load the User who created this order
    // This is a One-to-One or Many-to-One relation
    user: true,

    // [25] Load all OrderItems for this order
    // This is a One-to-Many relation
    items: {
      // [26] Nested include: Also load the Part for each item
      include: {
        part: true,
      },
    },
  },
});
// Result:
// {
//   id: "order123",
//   total: 99.99,
//   user: { id: "user123", email: "...", ... },  // ← Loaded
//   items: [
//     { id: "item1", quantity: 2, part: { id: "part1", title: "..." } },  // ← Nested loaded
//   ]
// }
```

---

## 🔷 Module 06: JWT Authentication

### JWT Strategy Implementation

```typescript
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private configService: ConfigService) {
    super({
      // [1] HOW to extract the JWT from the request
      // fromAuthHeaderAsBearerToken looks for: Authorization: Bearer <token>
      // Example header: "Authorization: Bearer eyJhbGc..."
      // The strategy extracts "eyJhbGc..." from this header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // [2] WHEN to validate the JWT
      // ignoreExpiration: false = Reject expired tokens (default, secure)
      // ignoreExpiration: true = Accept expired tokens (testing only!)
      ignoreExpiration: false,

      // [3] SECRET KEY to verify the JWT signature
      // This must match the secret used when signing the JWT
      // If secrets don't match -> "Invalid token" error
      // NEVER commit this to git! Use environment variables
      secretOrKey: this.configService.get<string>("JWT_SECRET"),
    });
  }

  // [4] This method is called AFTER Passport verifies the signature
  // At this point, we KNOW the token is valid and hasn't been tampered with
  // payload = the decoded JWT content (sub, email, iat, exp, type)
  async validate(payload: any) {
    // [5] Extract the necessary fields from the JWT payload
    // payload.sub = subject (user ID, by convention)
    // payload.email = user email (added during JWT creation)
    // payload.iat = issued at (timestamp)
    // payload.exp = expiration (timestamp)
    // payload.type = "access" or "refresh" (we added this)

    // [6] Return an object that will be attached to req.user
    // This object is passed to your controller methods
    // Use @Request() req to access: req.user.sub, req.user.email
    return {
      sub: payload.sub, // User ID
      email: payload.email, // User email
      type: payload.type, // "access" or "refresh"
    };
  }
}

// ===== USAGE IN CONTROLLER =====

@Controller("auth")
export class AuthController {
  @Get("me")
  @UseGuards(JwtAuthGuard) // [7] This guard uses JwtStrategy
  async getProfile(@Request() req: any) {
    // [8] At this point, token is verified and req.user is populated
    // If token was invalid -> Guard rejects with 401 Unauthorized
    // If token was expired -> Guard rejects with 401 Unauthorized
    // If token was missing -> Guard rejects with 401 Unauthorized

    // [9] NOW we can safely use the user info from the token
    const userId = req.user.sub; // From JWT payload
    return this.userService.findById(userId);
  }
}
```

### Generating JWT Tokens

```typescript
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  async login(email: string, password: string) {
    // [1] Verify email and password (omitted for brevity)
    const user = await this.validateUser(email, password);

    // [2] Create JWT payload (the data inside the token)
    // Payload is BASE64 encoded, NOT encrypted
    // Anyone can decode it, but only you can verify the signature
    // NEVER put passwords or sensitive data in payload!
    const payload = {
      sub: user.id, // [3] Subject (user ID) - by convention
      email: user.email, // [4] Email (not required, we added it)
      type: "access", // [5] Token type (access vs refresh)
    };

    // [6] Sign the JWT (create signature)
    // Signature prevents tampering: if hacker changes payload, signature fails validation
    const token = this.jwtService.sign(payload, {
      // [7] Secret key to sign with (same as in jwt.strategy.ts)
      secret: this.configService.get<string>("JWT_SECRET"),
      // [8] How long until token expires (15 minutes is typical for access tokens)
      // After 15 min, this token becomes invalid
      // User must use refresh token to get a new access token
      expiresIn: "15m",
    });

    // [9] JWT consists of 3 parts separated by dots:
    // Part 1 (header): { alg: "HS256", typ: "JWT" } - base64
    // Part 2 (payload): { sub: "...", email: "...", iat, exp } - base64
    // Part 3 (signature): HMACSHA256(Part1.Part2, SECRET) - hex
    // Full token: "Part1.Part2.Part3"

    return {
      accessToken: token, // [10] Return to client
      expiresIn: 900, // [11] In seconds (for client UI: "token expires in 15 min")
    };
  }

  async refreshToken(userId: string, email: string) {
    // [12] Generate a NEW access token
    // Called when old token expires but refresh token is still valid
    // This avoids requiring user to re-login
    const payload = {
      sub: userId,
      email,
      type: "access", // Same as original
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>("JWT_SECRET"),
      expiresIn: "15m", // Fresh 15-minute window
    });
  }
}
```

---

## 🔷 Module 07: Redis Cache

### Redis Operations

```typescript
import { Injectable } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService {
  private client: Redis;

  async onModuleInit() {
    // [1] Create Redis client connection
    // Default: localhost:6379 (local development)
    // Docker: redis:6379 (service name in docker-compose)
    // Production: Use environment variables for host/port
    this.client = new Redis({
      host: process.env.REDIS_HOST || "redis", // Default to "redis" (docker service)
      port: parseInt(process.env.REDIS_PORT || "6379"),
      // [2] Retry strategy: If connection fails, retry with exponential backoff
      // times 50ms, cap at 2000ms: 50ms, 100ms, 150ms, ..., 2000ms, 2000ms
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.client.on("error", (err) => console.error("Redis error:", err));
  }

  // ===== STRING OPERATIONS =====

  // [3] GET a value from Redis
  // Returns: String value if key exists, null if not
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  // [4] SET a value in Redis with optional TTL (Time To Live)
  async set(
    key: string,
    value: string | object,
    ttlSeconds?: number
  ): Promise<void> {
    // [5] Convert object to JSON string if needed
    // Redis only stores strings, so { foo: "bar" } becomes '{"foo":"bar"}'
    const strValue = typeof value === "string" ? value : JSON.stringify(value);

    if (ttlSeconds) {
      // [6] SETEX: Set with expiration (atomic operation)
      // After ttlSeconds seconds, Redis automatically deletes this key
      // Example: ttlSeconds=300 means key expires after 5 minutes
      // Useful for OTP codes, sessions, etc. that should auto-cleanup
      await this.client.setex(key, ttlSeconds, strValue);
    } else {
      // [7] SET without expiration (key persists until explicit delete)
      // Use this for data that should live permanently
      // Example: User preferences, configuration
      await this.client.set(key, strValue);
    }
  }

  // ===== INCR/DECR OPERATIONS =====

  // [8] INCREMENT: Increment a number by 1
  // Returns the new value after incrementing
  // If key doesn't exist, assumes 0 and returns 1
  // Atomic operation: race condition safe even with concurrent requests
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  // [9] Example usage: Rate limiting
  async checkRateLimit(userId: string, limit: number, windowSeconds: number) {
    const key = `rate-limit:${userId}`;
    const count = await this.incr(key);

    // [10] Set expiration on first request
    // Only set TTL once, otherwise every incr resets the window
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }

    // [11] Check if under limit
    // Returns true if allowed, false if exceeded
    return count <= limit;
  }

  // ===== HASH OPERATIONS =====

  // [12] HSET: Store multiple fields in a hash (like a JavaScript object in Redis)
  // Hash = { field1: value1, field2: value2, ... }
  // Example: user:alice = { email: "alice@example.com", age: "30" }
  async hset(key: string, field: string, value: any): Promise<number> {
    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    // [13] Return: 0 if field already existed (updated), 1 if new field
    return this.client.hset(key, field, strValue);
  }

  // [14] HGET: Retrieve one field from a hash
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  // [15] HGETALL: Retrieve ALL fields from a hash
  // Returns: { field1: value1, field2: value2, ... }
  // Useful for: Loading entire user object, preferences, etc.
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  // ===== OTP IMPLEMENTATION =====

  // [16] Generate and store OTP in Redis
  async generateOtp(email: string, purpose: string) {
    // [17] Create unique key for this OTP request
    // Format: "otp:{purpose}:{email}"
    // Separate keys for registration vs password-reset prevents conflicts
    const key = `otp:${purpose}:${email}`;

    // [18] Generate random 6-digit code
    // Math.random() = 0 to 0.999999
    // * 900000 = 0 to 899999
    // + 100000 = 100000 to 999999 (always 6 digits!)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // [19] Store OTP in Redis with 5-minute expiration
    // After 5 minutes, Redis automatically deletes it
    // User must enter code before expiration or request new one
    await this.set(key, otp, 300); // 300 seconds = 5 minutes

    // [20] Initialize attempt counter
    // Used to limit verification attempts to 3 before blocking
    await this.set(`${key}:attempts`, "0", 300);

    return otp;
  }

  // [21] Verify OTP entered by user
  async verifyOtp(email: string, userOtp: string, purpose: string) {
    const key = `otp:${purpose}:${email}`;
    const attemptsKey = `${key}:attempts`;

    // [22] Get current attempt count
    // If this is null, key expired (user took too long)
    const attempts = parseInt((await this.get(attemptsKey)) || "0", 10);

    if (attempts >= 3) {
      // [23] Too many attempts: block this OTP
      await this.set(key, "LOCKED", 300); // Keep key present but unusable
      throw new Error("Too many failed attempts. Request new OTP.");
    }

    // [24] Get the stored OTP
    const storedOtp = await this.get(key);

    if (!storedOtp) {
      // [25] OTP expired (wasn't found in Redis)
      // User took longer than 5 minutes to enter code
      throw new Error("OTP expired. Request a new one.");
    }

    // [26] Compare user input with stored OTP
    // Case-sensitive comparison
    if (storedOtp !== userOtp) {
      // [27] Increment failed attempts
      await this.incr(attemptsKey);
      throw new Error("Invalid OTP");
    }

    // [28] Success: OTP is correct
    // Delete the OTP (one-time use)
    await this.del([key, attemptsKey]);

    return true;
  }
}
```

---

## 🔷 Module 08: Testing E2E

### Complete Test Example

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("Auth E2E Tests", () => {
  let app: INestApplication;

  // [1] beforeAll: Run ONCE before ALL tests
  // This is expensive (starts the app), so do it once
  beforeAll(async () => {
    // [2] Create test module using actual AppModule
    // This includes all providers, imports, controllers
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // [3] Create NestJS application instance
    app = moduleFixture.createNestApplication();

    // [4] Initialize the app
    // This calls onModuleInit() on all modules
    // Prisma connects, Redis connects, etc.
    await app.init();
  });

  // [5] afterAll: Run ONCE after ALL tests
  // Clean up resources
  afterAll(async () => {
    // [6] Close the app
    // This calls onModuleDestroy() on all modules
    // Closes database and cache connections
    await app.close();
  });

  // ===== TEST CASES =====

  // [7] it() = one test case
  // Test name describes what is being tested
  it("should register a new user with email and password", async () => {
    // [8] Arrange: Prepare test data
    const registerDto = {
      email: "alice@example.com",
      password: "SecurePass123!",
    };

    // [9] Act: Make HTTP request using Supertest
    // request(app.getHttpServer()) = get the HTTP server from NestJS app
    // .post('/v1/auth/register') = HTTP POST to this route
    // .send(registerDto) = request body (automatically JSON encoded)
    // .expect(201) = assert HTTP status is 201 (Created)
    const response = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send(registerDto)
      .expect(201); // Assertion: must be 201 or test fails

    // [10] Assert: Verify response contains expected data
    expect(response.body.user).toEqual(
      // [11] toEqual with objectContaining: Check subset of object
      // We don't care about createdAt/updatedAt, just that email matches
      expect.objectContaining({
        email: "alice@example.com",
      })
    );

    // [12] Assert: JWT tokens were returned
    // If accessToken/refreshToken are missing, test fails
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();

    // [13] Assert: expiresIn is in seconds (15 min = 900 sec)
    expect(response.body.expiresIn).toBe(900);
  });

  // [14] Test protected route with authorization
  it("should access /auth/me with valid access token", async () => {
    // [15] Setup: Register a user
    const registerRes = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({
        email: "bob@example.com",
        password: "SecurePass123!",
      });

    const { accessToken } = registerRes.body;

    // [16] Act: Access protected route WITH token
    // .set(header, value) = add HTTP header
    // Authorization header format: "Bearer <token>"
    const response = await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`) // ← Token in header
      .expect(200); // Expect 200 OK (not 401 Unauthorized)

    // [17] Assert: Response contains user info from token
    expect(response.body.email).toBe("bob@example.com");
  });

  // [18] Test error case: access protected route without token
  it("should deny access to /auth/me without token", async () => {
    // [19] Act: Call protected route WITHOUT token
    const response = await request(app.getHttpServer())
      .get("/v1/auth/me")
      .expect(401); // Expect 401 Unauthorized

    // [20] Assert: Error message indicates authentication required
    expect(response.body.message).toContain("Unauthorized");
  });

  // [21] Test validation: Email must be valid format
  it("should reject invalid email format", async () => {
    // [22] Act: Send request with invalid email
    const response = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({
        email: "not-an-email", // ← Missing @ symbol
        password: "SecurePass123!",
      })
      .expect(400); // Expect 400 Bad Request (validation failed)

    // [23] Assert: Error message mentions email
    expect(response.body.message).toContain("email");
  });

  // [24] Test business logic: Duplicate email not allowed
  it("should reject duplicate email", async () => {
    const dto = {
      email: "duplicate@example.com",
      password: "SecurePass123!",
    };

    // [25] First registration succeeds
    await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send(dto)
      .expect(201);

    // [26] Second registration with same email fails
    const response = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send(dto)
      .expect(409); // 409 Conflict (email already exists)

    // [27] Assert: Error message indicates email exists
    expect(response.body.message).toContain("already exists");
  });
});
```

---

## 🎓 Key Takeaways

- **Always add comments** explaining WHY, not just WHAT
- **Use [numbered comments]** to break complex logic into steps
- **Mention potential bugs/pitfalls** (race conditions, performance, security)
- **Provide context** about related code
- **Explain the "why"** behind design decisions

これらのコメントスタイルを使用して、あなたのコードを誰でも理解できるようにしましょう! 🚀
