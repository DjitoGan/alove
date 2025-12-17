# 🔐 Sprint 3 Authentication - Testing Guide

## Quick Start

### 1. Reset Database & Seed

```bash
cd /Users/amouzou/projects/alove

# Option 1: Using Docker Compose task
docker compose -f infra/docker-compose.yml exec api npx prisma migrate reset --force && docker compose -f infra/docker-compose.yml exec api npx prisma db seed

# Option 2: Using VS Code tasks
# Click: Terminal → Run Task → "💾 Reset & Seed DB"
```

### 2. Login and Get Tokens

**For Admin:**

```bash
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alove.tg",
    "password": "Admin@123"
  }'
```

**Response:**

```json
{
  "user": {
    "id": "...",
    "email": "admin@alove.tg"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**For Customer:**

```bash
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "akoua.tetteh@example.com",
    "password": "Customer@123"
  }'
```

### 3. Use Access Token for Protected Endpoints

```bash
ACCESS_TOKEN="<token from login response>"

# Get user profile
curl -X GET http://localhost:3001/v1/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get user's cart
curl -X GET http://localhost:3001/v1/cart \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# List user's orders
curl -X GET http://localhost:3001/v1/orders \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# List all users (ADMIN only - will fail for CUSTOMER)
curl -X GET http://localhost:3001/v1/admin/users \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 4. Refresh Expired Token

```bash
REFRESH_TOKEN="<token from login response>"

curl -X POST http://localhost:3001/v1/auth/refresh \
  -H "Authorization: Bearer $REFRESH_TOKEN"

# Returns new accessToken + refreshToken
```

---

## Test Users & Passwords

| Email                    | Password     | Role     | Use Case                           |
| ------------------------ | ------------ | -------- | ---------------------------------- |
| admin@alove.tg           | Admin@123    | ADMIN    | Admin dashboard, user management   |
| kossi.adjaho@example.com | Merchant@123 | MERCHANT | Vendor product management (future) |
| akoua.tetteh@example.com | Customer@123 | CUSTOMER | Browse, order, manage cart         |
| tester1@email.com        | Test@123     | CUSTOMER | Generic testing                    |

---

## RBAC Testing

### ✅ Customer Can:

- GET /auth/me - View own profile
- GET /cart - View own cart
- POST /cart/items - Add to own cart
- GET /orders - List own orders
- POST /orders - Create order
- GET /addresses - List own addresses
- POST /addresses - Create address

### ❌ Customer Cannot:

- GET /admin/users - Listed users (403 Forbidden)
- DELETE /admin/users/:id - Delete any user (403 Forbidden)
- PATCH /catalog/categories/:id - Modify categories (403 Forbidden)
- GET /catalog/stats - View admin statistics (403 Forbidden)

### ✅ Admin Can:

- All endpoints that customer can
- GET /admin/users - List all users
- PATCH /admin/users/:id - Modify any user
- DELETE /admin/users/:id - Delete user
- POST /admin/users/:id/role - Change user role
- GET /admin/stats - View admin statistics
- POST /catalog/categories - Create category
- PATCH /catalog/categories/:id - Update category
- DELETE /catalog/categories/:id - Delete category

---

## Example Workflows

### Workflow 1: Register & Login

```bash
# 1. Register new user
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass@123"
  }'

# 2. Login with new credentials
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass@123"
  }'

# 3. Use accessToken from response
```

### Workflow 2: Add to Cart (Requires Auth)

```bash
# 1. Login as customer
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "akoua.tetteh@example.com",
    "password": "Customer@123"
  }'

# 2. Extract accessToken from response
# 3. Add item to cart
curl -X POST http://localhost:3001/v1/cart/items \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "partId": "<part-id>",
    "quantity": 1
  }'

# 4. View cart
curl -X GET http://localhost:3001/v1/cart \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Workflow 3: Admin User Management

```bash
# 1. Login as admin
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alove.tg",
    "password": "Admin@123"
  }'

# 2. List all users
curl -X GET http://localhost:3001/v1/admin/users \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# 3. Create new user
curl -X POST http://localhost:3001/v1/admin/users \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass@123",
    "name": "New User",
    "role": "CUSTOMER"
  }'

# 4. Change user role
curl -X POST http://localhost:3001/v1/admin/users/:id/role \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "MERCHANT"
  }'
```

---

## Error Scenarios

### 401 Unauthorized

**Missing Token:**

```bash
curl -X GET http://localhost:3001/v1/cart
# Error: 401 Unauthorized
```

**Invalid Token:**

```bash
curl -X GET http://localhost:3001/v1/cart \
  -H "Authorization: Bearer invalid.token.here"
# Error: 401 Unauthorized
```

**Expired Token:**

```bash
# Wait 15+ minutes after login
curl -X GET http://localhost:3001/v1/cart \
  -H "Authorization: Bearer <EXPIRED_TOKEN>"
# Error: 401 Unauthorized (use refresh token to get new accessToken)
```

### 403 Forbidden

**Insufficient Role:**

```bash
# Login as CUSTOMER
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "akoua.tetteh@example.com", "password": "Customer@123"}'

# Try to access admin endpoint
curl -X GET http://localhost:3001/v1/admin/users \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>"
# Error: 403 Forbidden - User with role CUSTOMER is not allowed to access this resource. Required roles: ADMIN
```

---

## Swagger/API Documentation

1. Start API: `docker compose up -d api`
2. Navigate to: http://localhost:3001/api/docs
3. Click "Authorize" button (top right)
4. Paste accessToken in "Value" field
5. All protected endpoints now show in Swagger with token pre-filled

---

## Token Structure

### Access Token (15 minutes)

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "type": "access",
  "iat": 1699999999,
  "exp": 1700000899
}
```

### Refresh Token (7 days)

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "type": "refresh",
  "iat": 1699999999,
  "exp": 1700599999
}
```

---

## Debugging

### View JWT Payload (without decoding)

Use https://jwt.io to inspect token structure

### Check Password Hash

```bash
# Password: Customer@123
# Hashed: $2b$10$...
```

### View Database Users

```bash
docker compose exec postgres psql -U alove -d alove_db -c "SELECT id, email, role, \"createdAt\" FROM \"User\" ORDER BY \"createdAt\" DESC;"
```

---

## Common Issues

### Issue: 401 on login

**Solution:**

- Check email is registered in database
- Check password is correct
- Verify user role is not 'INACTIVE'

### Issue: "Invalid credentials"

**Reason:** Intentionally vague to prevent username enumeration

**Solution:**

- Check email spelling
- Check password spelling
- Reset database and re-seed

### Issue: Token expired

**Solution:**

- Use refreshToken to get new accessToken
- Re-login if refreshToken also expired

### Issue: Role not recognized

**Reason:** Make sure role is one of: ADMIN, MERCHANT, CUSTOMER, SUPPORT

**Solution:**

- Check Prisma schema for UserRole enum
- Verify database user record has correct role

---

## Next: Frontend Integration

1. After login, store tokens in localStorage:

   ```javascript
   localStorage.setItem("accessToken", response.accessToken);
   localStorage.setItem("refreshToken", response.refreshToken);
   ```

2. Add token to all API requests:

   ```javascript
   fetch("/v1/cart", {
     headers: {
       Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
     },
   });
   ```

3. Handle 401 responses:
   - If 401, try refreshing token
   - If refresh fails, redirect to login

---

**Happy Testing!** 🚀
