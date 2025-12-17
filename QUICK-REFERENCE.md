# 🔖 Quick Reference - Frontend Comments

## 📍 File Locations & Line Ranges

### Header Docstrings (First 20 lines each)

| File                     | Lines | Emoji | Title            | Type |
| ------------------------ | ----- | ----- | ---------------- | ---- |
| `pages/index.tsx`        | 1-20  | 🏠    | Home page        | NAV  |
| `pages/auth.tsx`         | 1-18  | 🔐    | Login/Register   | AUTH |
| `pages/catalog.tsx`      | 1-19  | 🛒    | Marketplace      | SHOP |
| `pages/part-details.tsx` | 1-13  | 📦    | Product page     | PROD |
| `pages/checkout.tsx`     | 1-17  | 💳    | Order form       | PAY  |
| `pages/dashboard.tsx`    | 1-18  | 👤    | User account     | ACCT |
| `pages/otp-test.tsx`     | 1-15  | 📱    | OTP verification | AUTH |

---

## 🎯 Sections by File

### otp-test.tsx

- [1] Imports - React hooks
- [2] API config
- [3] useRouter hook
- [4] Form states
- [5] handleGenerateOtp function [5a-5g]
- [6] handleVerifyOtp function [6a-6g]
- [7] JSX return [7a-8]

### index.tsx

- [1-5a] Imports, interfaces, state, useEffect
- [6] Header section with conditional buttons
- [7] Config section (API base, language)
- [8] Feature cards grid [8a]

### auth.tsx

- [1-6] Imports, config, states
- [6a-6i] handleSubmit flow
  - [6c] Endpoint selection
  - [6g] JWT token storage
  - [6h-6i] Redirect with timeout
- [7-8] JSX form sections

### catalog.tsx

- [1-8d] Imports, interfaces, states breakdown
- [9-14] Functions:
  - [9a-9f] fetchParts
  - [10a-10b] handleLogout
  - [11a-11d] addToCart
  - [12a-12b] removeFromCart
  - [13a] getTotalPrice
  - [14a-14d] fetchProfile

### part-details.tsx

- [1-3] Imports, config, interface
- [4-5] Hooks and states
- [6] useEffect initialization
- [7a-7e] fetchPart (mock data)
- [8a-8f] handleAddToCart

### checkout.tsx

- [1-2] Imports, interfaces
- [3-4] Hooks and form states
- [5a-5e] useEffect (cart loading)
- [6] getTotalPrice
- [7] handleInputChange
- [8a-8g] handlePlaceOrder validation

### dashboard.tsx

- [1-4] Imports, interfaces (User, Order)
- [5-9] Functions and hooks:
  - [7a-7d] useEffect auth check
  - [8a-8b] handleLogout
  - [9a-9e] fetchProfileFromAPI
- [10a-10b] JSX sections:
  - [10a-i] User info display
  - [10a-ii] Refresh button
  - [10a-iii] Statistics cards
  - [10b] Orders list

---

## 📡 API Endpoints Reference

### Authentication

```
POST /v1/auth/register          → auth.tsx [6d]
POST /v1/auth/login             → auth.tsx [6d]
GET /v1/auth/me                 → catalog.tsx [14], dashboard.tsx [9]
```

### Products

```
GET /v1/v1/parts?page=X         → catalog.tsx [9b]
```

### OTP

```
POST /v1/otp/generate           → otp-test.tsx [5c]
POST /v1/otp/verify             → otp-test.tsx [6c]
```

---

## 💾 localStorage Keys

| Key            | File        | Section | Usage              |
| -------------- | ----------- | ------- | ------------------ |
| `accessToken`  | auth.tsx    | [6g]    | JWT authentication |
| `refreshToken` | auth.tsx    | [6g]    | Token renewal      |
| `user`         | auth.tsx    | [6g]    | User data          |
| `cart`         | catalog.tsx | [11d]   | Cart persistence   |

---

## 🎯 Key Functions by Feature

### Authentication Flow

- `handleSubmit` (auth.tsx [6a-6i])
  - Validates email/password
  - Calls POST /v1/auth/login or register
  - Stores JWT tokens
  - Redirects to catalog

### Cart Management

- `addToCart` (catalog.tsx [11a-11d])

  - Checks if item exists
  - Increments quantity or adds new
  - Persists to localStorage

- `removeFromCart` (catalog.tsx [12a-12b])

  - Filters item from cart
  - Updates localStorage

- `getTotalPrice` (catalog.tsx [13a])
  - Reduces sum of (price × quantity)

### Order Placement

- `handlePlaceOrder` (checkout.tsx [8a-8g])
  - Validates all form fields
  - Checks cart not empty
  - Generates ORD-{timestamp}
  - Clears cart
  - Redirects to home

### OTP Verification

- `handleGenerateOtp` (otp-test.tsx [5a-5g])

  - POST /v1/otp/generate
  - Shows code for dev
  - Displays OTP input

- `handleVerifyOtp` (otp-test.tsx [6a-6g])
  - POST /v1/otp/verify
  - Validates code
  - Confirms phone

---

## 🔍 Finding Things

### "I need to understand authentication"

→ Start with `auth.tsx` [6a-6i], then see `index.tsx` [4]

### "How does the cart work?"

→ See `catalog.tsx` [11-13], then `checkout.tsx` [8]

### "What's the OTP flow?"

→ Read `otp-test.tsx` [5-6]

### "Where's the API call?"

→ Look for [Nc] pattern in each function (e.g., [5c], [6c], [14b])

### "How is data persisted?"

→ Search for localStorage in each file

### "What redirects happen?"

→ Look for router.push() calls and setTimeout

### "Where are states defined?"

→ Each file has [4] or [3] section with all useState() calls

---

## 📚 Documentation Files

1. **FRONTEND-COMMENTS-SUMMARY.md** (300+ lines)

   - Detailed analysis of each file
   - Pattern explanation
   - Comprehensive reference

2. **FRONTEND-DOCUMENTATION-COMPLETE.md**

   - Executive summary
   - Statistics and metrics
   - Next steps

3. **FRONTEND-VALIDATION.md**

   - Validation checklist
   - Quality metrics
   - Verification results

4. **FRONTEND-COMPLETION-REPORT.txt**

   - Visual ASCII statistics
   - Project overview
   - Quick facts

5. **This file: QUICK-REFERENCE.md**
   - File locations
   - Section mapping
   - API reference
   - Key functions

---

## ⚡ Quick Lookup by Feature

### State Management

- `useState` hooks: Each file [4] or [3-4] section
- `useEffect` for side effects: Search for `useEffect` + comments

### API Integration

- All fetch calls have [Nc] pattern comments
- All endpoints documented in endpoints section above
- Bearer token: Look for `Authorization: Bearer`

### localStorage

- Storing: `.setItem()` calls documented
- Retrieving: `.getItem()` calls documented
- Clearing: `.removeItem()` in logout functions

### Navigation

- `useRouter`: Imported and used in all pages
- `router.push()`: Documented with reason
- `setTimeout` redirects: Timeout values explained

### Forms

- Input elements: Have label + onChange documented
- Validation: Documented in handleSubmit functions
- Errors/Success: UI feedback sections commented

---

## 🎨 Comment Pattern Quick Cheat

```
[N]      = Main section number
[Na]     = Sub-section (first step)
[Nb]     = Sub-section (second step)
[Nc]     = Sub-section (API call)
WHY:     = Architectural reason explained
API:     = Endpoint being called
localStorage: = Data persistence
```

Example:

```typescript
// [5c] Appel API POST /v1/otp/generate
//      WHY: Demander au backend de créer et envoyer un code OTP
const response = await fetch(`${API_BASE}/v1/otp/generate`, {
  // ...
});
```

---

## ✨ Pro Tips

1. **New dev?** Start with `index.tsx` then move to `auth.tsx`
2. **Debugging?** Use [Nc] pattern to find API calls
3. **Lost?** Find localStorage key, trace backwards
4. **Contributing?** Follow the [N] pattern in existing code
5. **Questions?** Check FRONTEND-COMMENTS-SUMMARY.md

---

**Last Updated:** 2025-12-16  
**Status:** ✅ Complete & Current
