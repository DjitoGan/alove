# Sprint 2 Implementation - Cart, Addresses & Checkout 🛒

## 📋 Overview

Sprint 2 complète les fonctionnalités de **shopping cart**, **address book**, et **multi-vendor checkout** pour ALOVE. Voici ce qui a été implémenté:

---

## 🎯 What Was Implemented

### 1. **Shopping Cart (US-ORD-401)** 🛒

#### Backend - Cart Service & Controller

```
Path: /v1/cart
- GET /v1/cart → Get user's active cart with vendor grouping
- POST /v1/cart/items → Add item to cart
- PATCH /v1/cart/items/:itemId → Update item quantity
- DELETE /v1/cart/items/:itemId → Remove item from cart
- DELETE /v1/cart → Clear entire cart
- POST /v1/cart/sync → Sync offline cart with server (PWA)
```

**Key Features:**

- ✅ Auto-create active cart for each user
- ✅ Validate part stock before adding to cart
- ✅ Store snapshots (partTitle, partImage, vendorName) for offline support
- ✅ Recalculate totals automatically
- ✅ Group items by vendor for display
- ✅ Offline sync with conflict resolution

#### Frontend - Cart Page

```
Pages: /cart
- Display all cart items grouped by vendor
- Show vendor subtotal for each group
- Quantity controls (-, +, remove)
- Clear cart button
- Checkout button with validation
- Empty cart message
```

---

### 2. **Address Book (US-ORD-402)** 📍

#### Backend - Addresses Service & Controller

```
Path: /v1/addresses
- GET /v1/addresses → Get all user addresses
- GET /v1/addresses/:id → Get specific address
- GET /v1/addresses/default → Get default address
- POST /v1/addresses → Create new address
- PATCH /v1/addresses/:id → Update address
- PATCH /v1/addresses/:id/default → Set as default
- DELETE /v1/addresses/:id → Delete address
```

**Key Features:**

- ✅ Full CRUD operations
- ✅ Mark one address as default per user
- ✅ Automatically unset other defaults when setting new default
- ✅ Store address fields: label, line1, line2, city, state, postal, country, phone, instructions

#### Frontend - Addresses Page

```
Pages: /addresses
- List all saved addresses
- Create/edit address form
- Mark address as default
- Delete address
- Form validation
```

---

### 3. **Multi-Vendor Checkout (US-ORD-403)** 💳

#### Backend - Enhanced Orders Service

```
Path: /v1/orders
- POST /v1/orders/checkout → Create order from cart
  Input: { vendorShipping: [{ vendorId, addressId }, ...] }
  Output: Order with per-vendor shipments

- GET /v1/orders/:orderId/shipments/:id → Get shipment details
- POST /v1/orders/shipments/:id → Update shipment status
```

**Key Features:**

- ✅ Multi-vendor order creation
- ✅ Per-vendor shipment management
- ✅ Stock validation before checkout
- ✅ Automatic cart conversion to CHECKED_OUT status
- ✅ Shipment tracking (pending → shipped → delivered)

#### Frontend - Checkout Page

```
Pages: /checkout
- Show cart summary grouped by vendor
- Address selection per vendor
- Validate each vendor has address
- Create order button
- Order confirmation
```

---

### 4. **Database Enhancements** 🗄️

#### New Models

```sql
-- Cart & CartItem
model Cart {
  id, userId, status (ACTIVE|CHECKED_OUT|ABANDONED)
  subtotal, total
  items -> CartItem[]
  timestamps
}

model CartItem {
  id, cartId, partId, vendorId, quantity
  unitPrice (snapshot)
  partTitle, partImage, vendorName (snapshots for offline)
  timestamps
}

-- Address Book
model Address {
  id, userId, label, line1, line2, city, state
  postalCode, country, phoneNumber, instructions
  isDefault
  timestamps
}
```

#### Enhanced Models

```sql
-- Shipment
model Shipment {
  + carrier (string)
  + trackingNumber (string)
  + pickupPin (string)
  + shippedAt (datetime)
  + deliveredAt (datetime)
}

-- User
model User {
  + economyMode (boolean)
  + lang (string) - Language preference
  + country (string) - Default country
}
```

#### Migration Applied

```
Migration: 20251217182001_sprint2_cart_address_shipment_enhancements
Status: ✅ Applied
Database: PostgreSQL 16
```

---

### 5. **PWA Offline Support (US-PWA-1101)** 📱

#### Service Worker (`/public/sw.js`)

- ✅ Install: Cache static assets
- ✅ Fetch: Network-first for API, cache-first for assets
- ✅ Sync: Background sync for cart operations
- ✅ Push notifications ready

#### Offline Utilities (`/lib/offline.ts`)

- ✅ IndexedDB for offline cart storage
- ✅ Service worker registration
- ✅ Online/offline detection
- ✅ Sync conflict resolution

#### Frontend Integration (`/pages/_app.tsx`)

- ✅ Register service worker on mount
- ✅ Show offline banner
- ✅ Display sync status notifications
- ✅ Auto-sync when reconnected

#### PWA Manifest (`/public/manifest.json`)

- ✅ App name, icons, theme colors
- ✅ Install prompts
- ✅ Dark/light mode support

---

## 🏗️ Architecture

### API Layer

```
NestJS Controllers
    ↓
Services (CartService, AddressesService, OrdersService)
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

### Frontend Layer

```
React Components (pages/)
    ↓
API Client Calls (fetch /v1/*)
    ↓
Local Storage + IndexedDB (offline)
    ↓
Service Worker (PWA)
```

### Data Flow - Add to Cart

```
1. User clicks "Ajouter au panier" on /catalog
2. Frontend: POST /v1/cart/items { partId, quantity }
3. Backend:
   - Get/create active cart for user
   - Validate part exists & published
   - Check stock availability
   - Add item with snapshots
   - Recalculate totals
4. Frontend:
   - Show success toast
   - Update cart state
   - Save to localStorage for overlay
5. PWA:
   - Save to IndexedDB if offline
   - Sync on next online
```

### Data Flow - Checkout

```
1. User clicks "Procéder au paiement" on /cart
2. Frontend: Navigate to /checkout
3. Frontend: Load cart + addresses in parallel
4. Frontend: User selects address per vendor
5. Frontend: POST /v1/orders/checkout with vendor addresses
6. Backend:
   - Validate cart items & addresses
   - Check final stock
   - Create Order
   - Create OrderItems
   - Create per-vendor Shipments
   - Mark cart as CHECKED_OUT
7. Frontend: Show confirmation
```

---

## 📊 Database Schema Changes

### Cart & CartItem Relations

```
User (1) ──→ (N) Cart
Cart (1) ──→ (N) CartItem
Part (1) ──→ (N) CartItem
Vendor (1) ──→ (N) CartItem
```

### Address Relations

```
User (1) ──→ (N) Address
```

### Order Relations (Enhanced)

```
User (1) ──→ (N) Order
Order (1) ──→ (N) OrderItem
OrderItem ──→ Part
OrderItem ──→ Vendor
Order (1) ──→ (N) Shipment (per vendor)
Shipment ──→ Vendor
```

---

## 🚀 How to Use

### For End Users

#### Add Item to Cart

1. Go to **http://localhost:3000/catalog**
2. Click **🛒 Ajouter au panier** button
3. See success message
4. Navigate to cart

#### View Cart

1. Go to **http://localhost:3000/cart**
2. See items grouped by vendor
3. Adjust quantities or remove items
4. Click **Procéder au paiement**

#### Manage Addresses

1. Go to **http://localhost:3000/addresses**
2. Click **Ajouter une adresse** to add
3. Fill form (label, line1, city, country, etc)
4. Mark as default if needed
5. Edit or delete as needed

#### Checkout

1. Go to **http://localhost:3000/checkout**
2. Select address for each vendor
3. Review order summary
4. Click **Confirmer la commande**
5. See order confirmation

### For Developers

#### Test Cart API

```bash
# Get or create cart
curl -X GET http://localhost:3001/v1/cart

# Add item to cart
curl -X POST http://localhost:3001/v1/cart/items \
  -H "Content-Type: application/json" \
  -d '{"partId": "part-123", "quantity": 1}'

# Update quantity
curl -X PATCH http://localhost:3001/v1/cart/items/item-id \
  -H "Content-Type: application/json" \
  -d '{"quantity": 2}'

# Clear cart
curl -X DELETE http://localhost:3001/v1/cart
```

#### Test Addresses API

```bash
# Get all addresses
curl -X GET http://localhost:3001/v1/addresses

# Create address
curl -X POST http://localhost:3001/v1/addresses \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Home",
    "line1": "123 Rue de la Paix",
    "city": "Lomé",
    "postalCode": "228",
    "country": "TG",
    "phoneNumber": "+228 90 123456",
    "isDefault": true
  }'

# Set as default
curl -X PATCH http://localhost:3001/v1/addresses/address-id/default
```

#### Test Checkout API

```bash
# Create order from cart
curl -X POST http://localhost:3001/v1/orders/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "vendorShipping": [
      {
        "vendorId": "vendor-1",
        "addressId": "address-1"
      }
    ]
  }'
```

---

## 🧪 Testing Scenarios

### Scenario 1: Simple Purchase

1. Go to /catalog
2. Add 1 part to cart
3. Go to /cart → confirm item appears
4. Go to /addresses → add address
5. Go to /checkout → select address → confirm

### Scenario 2: Multi-Vendor Purchase

1. Add parts from **different vendors** to cart
2. Go to /cart → see vendor grouping
3. Go to /checkout → must select address for **each vendor**
4. Submit → see order with multiple shipments

### Scenario 3: Offline Mode (PWA)

1. Open DevTools → Network → Offline
2. Add item to cart (saves to IndexedDB)
3. Navigate to /cart (shows offline cart)
4. Go back to Offline tab → Online
5. See sync notification
6. Cart syncs to server

### Scenario 4: Stock Validation

1. Try adding more quantity than available stock
2. Should see error: "Insufficient stock"
3. Try during checkout with multiple vendors
4. Should validate all shipment addresses selected

---

## 📱 Frontend Pages Overview

| Page      | Route        | Features                                 |
| --------- | ------------ | ---------------------------------------- |
| Catalog   | `/catalog`   | List parts, add to cart, search          |
| Cart      | `/cart`      | View cart, modify quantities, checkout   |
| Addresses | `/addresses` | Manage address book                      |
| Checkout  | `/checkout`  | Multi-vendor checkout, address selection |
| Admin     | `/admin`     | API monitoring, sync status              |
| Home      | `/`          | Navigation hub                           |

---

## 🔧 Key Files Modified

### Backend

```
apps/api/src/modules/
├── cart/
│   ├── cart.service.ts (getOrCreateCart, addToCart, syncCart)
│   ├── cart.controller.ts (GET/POST/PATCH/DELETE endpoints)
│   └── dto/ (AddToCartDto, UpdateCartItemDto, SyncCartDto)
├── addresses/
│   ├── addresses.service.ts (full CRUD)
│   ├── addresses.controller.ts (full CRUD endpoints)
│   └── dto/ (CreateAddressDto, UpdateAddressDto)
└── orders/
    ├── orders.service.ts (enhanced with checkoutFromCart)
    └── orders.controller.ts (enhanced with checkout endpoint)

apps/api/prisma/
├── schema.prisma (Cart, CartItem, Address models + enhancements)
└── seed.ts (test-user-id creation)
```

### Frontend

```
apps/web/
├── pages/
│   ├── cart.tsx (cart display & management)
│   ├── addresses.tsx (address book CRUD)
│   ├── checkout.tsx (multi-vendor checkout)
│   ├── catalog.tsx (modified for API cart integration)
│   └── admin.tsx (added home link)
├── lib/
│   └── offline.ts (IndexedDB, sync utilities)
└── public/
    ├── sw.js (service worker)
    └── manifest.json (PWA manifest)
```

---

## ✅ Validation Checklist

- [x] Cart creation auto-triggered
- [x] Stock validation before add
- [x] Offline cart persistence
- [x] Vendor grouping in cart
- [x] Address CRUD operations
- [x] Default address management
- [x] Multi-vendor checkout
- [x] Per-vendor shipment creation
- [x] Cart → Checked out status
- [x] PWA offline support
- [x] Service worker caching
- [x] Background sync
- [x] TypeScript compilation (warnings only, no errors)
- [x] All page navigation working
- [x] Database migration applied
- [x] Test user created (test-user-id)

---

## 🚨 Known Limitations

1. **No Authentication** - Using `test-user-id` as default (TODO: JWT)
2. **No Payment Processing** - Checkout creates order but no payment flow
3. **No Email Notifications** - Order confirmations not sent
4. **No Order History** - Users can't view past orders yet
5. **Economy Mode** - Field exists but not implemented (US-PERF-801)
6. **i18n** - French/English toggle missing (US-I18N-901)

---

## 📚 Next Steps (Sprint 3+)

1. **Authentication (Epic A)**

   - JWT tokens
   - User registration/login
   - Protected endpoints

2. **Payment Integration (Epic D)**

   - Stripe/PayPal setup
   - Payment processing
   - Refund handling

3. **Notifications (Epic E)**

   - Email confirmations
   - Order status updates
   - SMS alerts (optional)

4. **Order Management**

   - View order history
   - Track shipments
   - Cancel orders
   - Return management

5. **Performance & i18n (Epic G)**
   - Economy mode toggle
   - Multi-language UI
   - PWA performance optimization

---

## 🎓 Learning Resources

- **Cart Flow**: See `training/guide-pratique-alove.md`
- **API Endpoints**: See `docs/en/specs/api.md`
- **Database Schema**: See `docs/en/specs/db.md`
- **PWA Guide**: See `training/COMMENTAIRES-DETAILLES.md`

---

**Last Updated:** 17 December 2025  
**Sprint:** Sprint 2 - Cart, Addresses & Checkout  
**Status:** ✅ Complete & Deployed
