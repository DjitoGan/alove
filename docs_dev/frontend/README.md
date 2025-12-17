# 🎨 Frontend Documentation — React/Next.js Implementation

**Complete reference for Next.js frontend, pages, state management, and UI integration.**

---

## 📖 Frontend Overview

The ALOVE frontend is a **Next.js PWA (Progressive Web App)** with these core pages:

| Page             | Purpose                          | Route                | Documented | Status   |
| ---------------- | -------------------------------- | -------------------- | ---------- | -------- |
| **Home**         | Landing page with featured parts | `/`                  | ✅         | Complete |
| **Auth**         | Login/Register with OTP          | `/auth`              | ✅         | Complete |
| **Catalog**      | Search & filter parts            | `/catalog`           | ✅         | Complete |
| **Part Details** | Single part details + reviews    | `/part-details?id=X` | ✅         | Complete |
| **Checkout**     | Shopping cart & order            | `/checkout`          | ✅         | Complete |
| **Dashboard**    | User profile & orders            | `/dashboard`         | ✅         | Complete |
| **OTP Test**     | OTP verification page            | `/otp-test`          | ✅         | Complete |

---

## 🗂️ Page Organization

### 1️⃣ Home Page (`/`)

- **File:** `apps/web/pages/index.tsx`
- **Purpose:** Landing page with featured parts
- **Features:**
  - Hero section with call-to-action
  - Featured parts carousel
  - Browse by category links
  - Login prompt for new users
- **Size:** 281 lines + 75 comments
- **Read Time:** 5 min

### 2️⃣ Auth Page (`/auth`)

- **File:** `apps/web/pages/auth.tsx`
- **Purpose:** Login/Register with OTP
- **Features:**
  - Dual mode: Login & Register tabs
  - Email/password input
  - OTP verification flow
  - Form validation with error messages
- **Size:** 267 lines + 85 comments
- **Read Time:** 8 min

### 3️⃣ Catalog Page (`/catalog`)

- **File:** `apps/web/pages/catalog.tsx`
- **Purpose:** Search & filter automotive parts
- **Features:**
  - Full-text search (search + filter)
  - Price range slider
  - Vendor filtering
  - Pagination (load more)
  - Sort options (newest, price, stock)
- **Size:** 625 lines + 140 comments
- **Read Time:** 12 min

### 4️⃣ Part Details Page (`/part-details`)

- **File:** `apps/web/pages/part-details.tsx`
- **Purpose:** Single part details + reviews
- **Features:**
  - Part details (price, stock, vendor)
  - Add to cart button
  - Vendor information & rating
  - Related parts
  - Customer reviews (if any)
- **Size:** 407 lines + 95 comments
- **Read Time:** 10 min

### 5️⃣ Checkout Page (`/checkout`)

- **File:** `apps/web/pages/checkout.tsx`
- **Purpose:** Shopping cart & order placement
- **Features:**
  - Cart items list
  - Price calculation (subtotal, tax, shipping)
  - Delivery address form
  - Payment method selection
  - Order summary
- **Size:** 562 lines + 130 comments
- **Read Time:** 12 min

### 6️⃣ Dashboard Page (`/dashboard`)

- **File:** `apps/web/pages/dashboard.tsx`
- **Purpose:** User profile & order history
- **Features:**
  - User profile information
  - Order history with status
  - Wishlist management
  - Account settings
- **Size:** 497 lines + 115 comments
- **Read Time:** 10 min

### 7️⃣ OTP Test Page (`/otp-test`)

- **File:** `apps/web/pages/otp-test.tsx`
- **Purpose:** OTP verification testing
- **Features:**
  - Phone/email input
  - OTP code input
  - Verification status
  - Debug view (dev mode)
- **Size:** 390 lines + 90 comments
- **Read Time:** 8 min

---

## 🔄 State Management

### localStorage (Client-Side Persistence)

```typescript
// Keys stored in browser
localStorage.accessToken; // JWT access token (15m TTL)
localStorage.refreshToken; // JWT refresh token (7d TTL)
localStorage.email; // Current user email
localStorage.cart; // Shopping cart items (JSON)
localStorage.wishlist; // Liked parts (JSON array)
```

### React Hooks

```typescript
// Common patterns in all pages
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<DataType | null>(null);

const [showModal, setShowModal] = useState(false);
const [selectedItem, setSelectedItem] = useState<Item | null>(null);
```

### useEffect Patterns

```typescript
// Fetch data on mount
useEffect(() => {
  if (!token) return; // Only if authenticated
  fetchData();
}, [token]);

// Subscribe to events
useEffect(() => {
  window.addEventListener("beforeunload", handleSave);
  return () => window.removeEventListener("beforeunload", handleSave);
}, []);
```

---

## 🌐 API Integration

### Authentication Flow

```
1. User enters email/password
2. Call POST /auth/register or /auth/login
3. Receive { user, accessToken, refreshToken }
4. Store in localStorage
5. Set Authorization header: Bearer {accessToken}
6. On 401 → refresh token → retry request
```

### API Base Configuration

```typescript
// apps/web/pages/[page].tsx
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

// Usage in requests
const response = await fetch(`${API_BASE}/auth/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.accessToken}`,
  },
  body: JSON.stringify({ email, password }),
});
```

### Error Handling

```typescript
if (response.status === 401) {
  // Token expired → refresh and retry
  await refreshToken();
  // Retry original request
}

if (response.status === 400) {
  // Bad request → show error message
  setError(response.json().message);
}

if (response.status === 500) {
  // Server error → show generic message
  setError("Something went wrong. Please try again.");
}
```

---

## 📊 File Statistics

| Page      | File             | Lines     | Comments | Status      |
| --------- | ---------------- | --------- | -------- | ----------- |
| Home      | index.tsx        | 281       | 75       | ✅ Complete |
| Auth      | auth.tsx         | 267       | 85       | ✅ Complete |
| Catalog   | catalog.tsx      | 625       | 140      | ✅ Complete |
| Details   | part-details.tsx | 407       | 95       | ✅ Complete |
| Checkout  | checkout.tsx     | 562       | 130      | ✅ Complete |
| Dashboard | dashboard.tsx    | 497       | 115      | ✅ Complete |
| OTP Test  | otp-test.tsx     | 390       | 90       | ✅ Complete |
| **TOTAL** |                  | **3,029** | **730**  | ✅          |

**Quality Score:** ⭐⭐⭐⭐⭐ (Professional Grade)

---

## 🚀 Quick Start for Frontend

### 1. Install Dependencies

```bash
cd apps/web
npm install
```

### 2. Configure Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/v1
```

### 3. Start Development Server

```bash
npm run dev
# Opens at http://localhost:3000
```

### 4. Test Pages

- Home: http://localhost:3000
- Auth: http://localhost:3000/auth
- Catalog: http://localhost:3000/catalog
- Dashboard: http://localhost:3000/dashboard

---

## 🎨 UI Components

### Common Patterns

```typescript
// Button
<button onClick={handleClick} disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</button>

// Form Input
<input
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="user@example.com"
/>

// Loading State
{isLoading && <p>Loading...</p>}

// Error Message
{error && <div className="error">{error}</div>}

// Success Message
{success && <div className="success">Success!</div>}
```

### Styling

- CSS-in-JS with `style={{}}` (inline styles)
- Tailwind CSS (if configured)
- CSS modules (if created)
- Responsive design for mobile-first

---

## 🔐 Security on Frontend

### Token Management

```typescript
// Store tokens securely
localStorage.accessToken; // Can be stolen via XSS!
localStorage.refreshToken; // Same risk

// Better: httpOnly cookies (future improvement)
// Server sets: Set-Cookie: accessToken=xxx; HttpOnly; Secure
```

### CORS Protection

```typescript
// Frontend origin: http://localhost:3000
// Backend allows: CORS_ORIGIN=http://localhost:3000
// Prevents: Requests from other domains
```

### Input Validation

```typescript
// Validate before sending to API
if (!email.includes("@")) {
  setError("Invalid email format");
  return;
}

if (password.length < 8) {
  setError("Password must be at least 8 characters");
  return;
}
```

---

## 📚 Page Documentation Files

Each page has detailed comments:

1. Open `apps/web/pages/[page].tsx`
2. Scroll to top (header with [1], [2], [3]... sections)
3. Read numbered sections with WHY explanations
4. Look for [N.1], [N.2] for step-by-step code breakdown

**Example: Understanding auth.tsx**

```
Open: apps/web/pages/auth.tsx

[1] FILE OVERVIEW
    Purpose, features, state management

[2] IMPORTS & DEPENDENCIES
    React, Next.js, fetch, API calls

[3] COMPONENT STRUCTURE
    JSX layout breakdown

[4] STATE MANAGEMENT
    useState hooks for form, errors, loading

[5] EVENT HANDLERS
    handleRegister, handleLogin, handleOTP

[6] API INTEGRATION
    POST /auth/register, /auth/login, /otp/verify

[7] FORM VALIDATION
    Email format, password strength

[8] RENDERING
    JSX with conditional rendering
```

---

## 🧪 Testing Pages Locally

### Test Home Page

1. Navigate to http://localhost:3000
2. Should see landing page
3. Click "Browse Catalog" → goes to /catalog
4. Click "Login" → goes to /auth

### Test Auth Page

1. Navigate to http://localhost:3000/auth
2. Register: Enter email, password, click Register
3. If successful → back to home (logged in)
4. If error → show error message

### Test Catalog Page

1. Navigate to http://localhost:3000/catalog
2. Search: Type "battery" → should filter
3. Filter by price: Set min/max → should filter
4. Sort: Change dropdown → should sort
5. Paginate: Click "Load More" → should append items

### Test Part Details

1. From catalog, click a part
2. Should see: price, stock, vendor, reviews
3. Add to cart → should add to localStorage
4. Go to checkout → should see cart items

### Test Checkout

1. Have items in cart
2. Navigate to /checkout
3. Fill delivery form
4. Select payment method
5. Click "Place Order" → should call API

### Test Dashboard

1. Login first
2. Navigate to /dashboard
3. Should see profile information
4. Should see order history
5. Should see wishlist

---

## 🛠️ Development Tools

### React DevTools

```bash
# Chrome extension
# Right-click → Inspect → Components tab
# See component tree, props, state
```

### Next.js DevTools

```bash
# Bottom-right corner (dev mode)
# Click to open overlay
# Shows: performance, hydration issues
```

### Browser DevTools

```bash
# F12 or Ctrl+Shift+K
# Network tab: see API calls
# Application tab: see localStorage
# Console tab: see logs/errors
```

---

## 📖 Reading Roadmap

### Beginner (1-2 hours)

1. This file (understand structure)
2. [PAGES.md](PAGES.md) — Detailed page breakdown
3. Read one page's code: `apps/web/pages/auth.tsx`

### Intermediate (2-3 hours)

1. [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) — localStorage, hooks
2. [API_INTEGRATION.md](API_INTEGRATION.md) — API calls, auth flow
3. Read all 7 page files (skip code details for now)

### Advanced (3-4 hours)

1. Read all code comments (730+ lines)
2. Trace API calls: Open DevTools Network tab
3. Check localStorage: Open DevTools Application tab
4. Modify code: Add a feature, test it

---

## 🤝 Contributing

### Adding a Page

1. Create `apps/web/pages/[page-name].tsx`
2. Add detailed header comments (follow pattern)
3. Use existing pages as template
4. Test locally: `npm run dev`
5. Add link in navigation

### Modifying Existing Page

1. Read top header comments (understand current flow)
2. Find the [N.x] section for your change
3. Modify code & comments together
4. Test: `npm run dev` and navigate to page

---

## 📞 Quick Links

- **Page details:** [PAGES.md](PAGES.md)
- **State management:** [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)
- **API integration:** [API_INTEGRATION.md](API_INTEGRATION.md)
- **Backend API:** [../backend/API_REFERENCE.md](../backend/API_REFERENCE.md)

---

_Last Updated: December 16, 2025_  
_Status: ✅ Complete (7 pages documented)_  
_Quality: ⭐⭐⭐⭐⭐ Professional Grade_
