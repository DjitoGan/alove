# 📋 Sprint 4 - Enhanced Authentication & Security

**Status:** 🎯 Planning  
**Duration:** 2-3 weeks  
**Epic:** EPIC_A_AUTH (continued)  
**Previous:** Sprint 3 - Core Authentication ✅

---

## 🎯 Sprint 4 Objectives

### Feature 1: Email Verification

**US-AUTH-401** - Verify email on registration

- Send OTP code to email on signup
- User confirms email before account activation
- Resend verification code endpoint
- Auto-expire OTP after 15 minutes

### Feature 2: Password Reset

**US-AUTH-402** - Secure password recovery

- Request password reset (email)
- Send reset link with token (valid 1 hour)
- Set new password with token
- Invalidate all sessions after reset

### Feature 3: Session Management

**US-AUTH-403** - Logout & token management

- Logout endpoint (invalidate tokens)
- Token blacklist/revocation
- Session list endpoint
- Revoke specific session

### Feature 4: Rate Limiting

**US-AUTH-404** - Prevent brute force attacks

- Limit login attempts (5 per 15 min)
- Limit registration attempts (3 per hour)
- Limit password reset attempts (3 per hour)
- Return 429 Too Many Requests

### Feature 5: Audit Logging

**US-AUTH-405** - Track authentication events

- Log login attempts (success & failure)
- Log password changes
- Log role changes (admin)
- Log token refreshes

---

## 📊 User Stories & Acceptance Criteria

### US-AUTH-401: Email Verification

**Story:**

> As a user, I want to verify my email after registration so that only real email addresses are used in the system.

**Acceptance Criteria:**

1. ✅ When user registers, account is created with `isEmailVerified: false`
2. ✅ OTP code (6 digits) is generated & sent to email
3. ✅ User can verify email by entering OTP: `POST /v1/auth/verify-email`
4. ✅ OTP expires after 15 minutes
5. ✅ User can request new OTP: `POST /v1/auth/resend-otp`
6. ✅ Some endpoints require verified email (e.g., create order)
7. ✅ Email in system must be unique & verified

**Tables Needed:**

- Add `isEmailVerified: Boolean` to User model
- Add `emailVerificationOtp` table:
  ```prisma
  model EmailVerificationOtp {
    id String @id @default(cuid())
    userId String
    user User @relation(fields: [userId], references: [id])
    code String // 6-digit OTP
    expiresAt DateTime
    createdAt DateTime @default(now())
  }
  ```

**Endpoints:**

```
POST /v1/auth/verify-email { code: string }
POST /v1/auth/resend-otp
```

---

### US-AUTH-402: Password Reset

**Story:**

> As a user, I want to reset my password securely if I forget it, without needing to contact support.

**Acceptance Criteria:**

1. ✅ User requests reset: `POST /v1/auth/forgot-password { email }`
2. ✅ Reset link sent to email (valid 1 hour)
3. ✅ Reset link contains token: `/reset-password?token=xyz`
4. ✅ User submits new password: `POST /v1/auth/reset-password { token, password }`
5. ✅ All active sessions invalidated after reset
6. ✅ User must login again with new password
7. ✅ Token can only be used once
8. ✅ Notification sent to user email confirming change

**Tables Needed:**

```prisma
model PasswordResetToken {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id])
  token String @unique
  expiresAt DateTime
  usedAt DateTime?
  createdAt DateTime @default(now())
}
```

**Endpoints:**

```
POST /v1/auth/forgot-password { email }
POST /v1/auth/reset-password { token, password }
GET /v1/auth/reset-password/:token (verify token is valid)
```

---

### US-AUTH-403: Session Management

**Story:**

> As a user, I want to manage my active sessions and logout from specific devices.

**Acceptance Criteria:**

1. ✅ User can view all active sessions: `GET /v1/auth/sessions`
2. ✅ Each session shows: device, IP, last activity, created date
3. ✅ User can logout all sessions: `POST /v1/auth/logout-all`
4. ✅ User can revoke specific session: `DELETE /v1/auth/sessions/:sessionId`
5. ✅ Admin can revoke user sessions
6. ✅ Expired sessions auto-cleanup (7 days)
7. ✅ Current session always listed first

**Tables Needed:**

```prisma
model Session {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id])
  refreshTokenHash String // Hash of refresh token
  deviceInfo String? // User agent
  ipAddress String?
  lastActivityAt DateTime @default(now())
  expiresAt DateTime // When refresh token expires
  revokedAt DateTime?
  createdAt DateTime @default(now())
}
```

**Endpoints:**

```
GET /v1/auth/sessions
POST /v1/auth/logout { currentSessionId? }
POST /v1/auth/logout-all
DELETE /v1/auth/sessions/:sessionId
```

---

### US-AUTH-404: Rate Limiting

**Story:**

> As a system, I want to prevent brute force attacks by rate limiting auth endpoints.

**Acceptance Criteria:**

1. ✅ Login: Max 5 attempts per 15 minutes per IP
2. ✅ Register: Max 3 attempts per hour per IP
3. ✅ Password reset: Max 3 attempts per hour per email
4. ✅ Email verification: Max 5 attempts per hour per email
5. ✅ Return 429 Too Many Requests when limit exceeded
6. ✅ Include `Retry-After` header
7. ✅ Redis used for rate limit tracking
8. ✅ Auto-cleanup of old limits

**Implementation:**

- Use `@nestjs/throttler` package
- Custom throttle guards per endpoint
- Configure different limits per endpoint

**Example Response:**

```json
{
  "statusCode": 429,
  "message": "Too many login attempts. Try again in 10 minutes.",
  "retryAfter": 600
}
```

---

### US-AUTH-405: Audit Logging

**Story:**

> As an admin, I want to see all authentication-related events for security monitoring.

**Acceptance Criteria:**

1. ✅ Log all login attempts (success & failure)
2. ✅ Log password changes
3. ✅ Log role changes (admin only)
4. ✅ Log logout events
5. ✅ Log password reset requests
6. ✅ Log email verification events
7. ✅ Each log contains: timestamp, userId, action, status, IP, device
8. ✅ Admin endpoint to view logs: `GET /v1/admin/audit-logs`

**Tables Needed:**

```prisma
model AuditLog {
  id String @id @default(cuid())
  userId String?
  user User? @relation(fields: [userId], references: [id])
  action String // 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', etc.
  status String // 'SUCCESS', 'FAILED'
  reason String? // Why it failed
  ipAddress String?
  userAgent String?
  metadata Json? // Extra info (e.g., device name)
  createdAt DateTime @default(now())
}
```

**Endpoints:**

```
GET /v1/admin/audit-logs?action=LOGIN&userId=xxx&limit=100
GET /v1/admin/audit-logs/export (CSV export for compliance)
```

---

## 🗂️ Architecture Changes

### New Directories

```
apps/api/src/modules/auth/
├── interceptors/
│   └── audit-logging.interceptor.ts    # Log auth events
├── guards/
│   ├── email-verified.guard.ts         # Require verified email
│   ├── rate-limit.guard.ts             # Rate limiting
│   └── ...existing guards
├── services/
│   ├── email-verification.service.ts   # OTP management
│   ├── password-reset.service.ts       # Password reset tokens
│   ├── session.service.ts              # Session management
│   └── auth.service.ts                 # Existing
└── ...existing files
```

### Database Migrations

```
prisma/migrations/
├── 20251217_add_email_verification/
├── 20251217_add_password_reset/
├── 20251217_add_sessions/
└── 20251217_add_audit_logs/
```

---

## 📦 Dependencies to Install

```bash
npm install @nestjs/throttler  # Rate limiting
npm install @nestjs/common nodemailer  # Email sending (already have nodemailer)
# No need - using existing Redis & database
```

---

## 🔐 Security Considerations

- ✅ OTP codes: 6 digits, random, time-limited
- ✅ Reset tokens: Long random string, one-time use
- ✅ Sessions: Store token hash (not plaintext)
- ✅ Rate limiting: IP-based & email-based
- ✅ Email verification: Required for sensitive ops
- ✅ Audit logging: Immutable, indexed by userId & timestamp

---

## 📅 Implementation Order

### Week 1

1. Email Verification (OTP generation & sending)
2. Email Verification Guard
3. Update registration endpoint

### Week 2

4. Password Reset flow
5. Session Management
6. Audit Logging (interceptor)

### Week 3

7. Rate Limiting
8. Documentation & Testing
9. Integration testing

---

## 🧪 Testing Strategy

### Unit Tests

- OTP generation & validation
- Token expiration logic
- Rate limit calculations
- Session queries

### Integration Tests

- Registration → Email verification flow
- Login → Session creation flow
- Password reset flow
- Rate limiting responses

### End-to-End Tests

- Complete signup & email verification
- Login from multiple devices
- Logout all sessions
- Password reset with email

---

## 📊 Database Schema Changes

```prisma
model User {
  // Existing fields
  id String @id @default(cuid())
  email String @unique
  password String
  role UserRole @default(CUSTOMER)

  // NEW: Email verification
  isEmailVerified Boolean @default(false)

  // Relations to new tables
  emailOtps EmailVerificationOtp[]
  passwordResetTokens PasswordResetToken[]
  sessions Session[]
  auditLogs AuditLog[]
}

// NEW TABLES
model EmailVerificationOtp {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  code String
  attempts Int @default(0)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@unique([userId, code])
  @@index([userId, expiresAt])
}

model PasswordResetToken {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  token String @unique
  expiresAt DateTime
  usedAt DateTime?
  createdAt DateTime @default(now())

  @@index([userId, expiresAt])
}

model Session {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshTokenHash String @unique
  deviceInfo String?
  ipAddress String?
  lastActivityAt DateTime @default(now())
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())

  @@index([userId, expiresAt])
  @@index([userId, revokedAt])
}

model AuditLog {
  id String @id @default(cuid())
  userId String?
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
  action String // 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', etc.
  status String // 'SUCCESS', 'FAILED'
  reason String?
  ipAddress String?
  userAgent String?
  metadata Json?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@index([action, createdAt])
}
```

---

## 🚀 Launch Checklist

- [ ] All 5 features implemented
- [ ] Unit tests for each feature
- [ ] Integration tests
- [ ] Documentation updated
- [ ] Email templates created
- [ ] Rate limit thresholds tested
- [ ] Database indexes added
- [ ] Audit logs working
- [ ] Error messages user-friendly
- [ ] Rate limit whitelist for health checks

---

## 📞 Questions Before Starting

1. **Priority:** Should we implement all 5 features or focus on top 3?
   - Top 3: Email Verification + Password Reset + Rate Limiting
2. **Email Provider:** Use existing NotificationService or new provider?

3. **Audit Log Retention:** Keep logs forever or archive after 90 days?

4. **Rate Limit Configuration:** Tunable via environment variables?

---

**Ready to start Sprint 4?** ✨

Which features would you like to prioritize?

A) **All 5** (comprehensive security)  
B) **Top 3** (email verification, password reset, rate limiting)  
C) **Custom selection** (pick features)
