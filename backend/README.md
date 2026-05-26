# Mobile Shop Inventory Management — Backend API

Production-style REST API for a **single mobile shop** inventory system. Built with Node.js, Express, MongoDB, Mongoose, JWT authentication, and ES Modules.

---

## Table of Contents

- [What Was Built](#what-was-built)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Response Format](#api-response-format)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Business Rules](#business-rules)
- [Sale Transaction Flow](#sale-transaction-flow)

---

## What Was Built

### Core infrastructure

| Component | Description |
|-----------|-------------|
| **ES Modules** | Full ESM setup (`"type": "module"` in `package.json`) |
| **Utilities** | `ApiError`, `ApiResponse`, `asyncHandler`, pagination helpers, ObjectId validation, invoice number generator |
| **Middleware** | JWT auth (`verifyJWT`), centralized error handler |
| **Database** | MongoDB connection via Mongoose |

### Modules implemented

| Module | Service | Controller | Routes |
|--------|---------|------------|--------|
| Authentication | `auth.service.js` | `auth.controller.js` | `/api/v1/auth` |
| Products | `product.service.js` | `product.controller.js` | `/api/v1/products` |
| Suppliers | `supplier.service.js` | `supplier.controller.js` | `/api/v1/suppliers` |
| Customers | `customer.service.js` | `customer.controller.js` | `/api/v1/customers` |
| Mobile units (IMEI) | `mobileUnit.service.js` | `mobileUnit.controller.js` | `/api/v1/mobile-units` |
| Inventory | `inventory.service.js` | `inventory.controller.js` | `/api/v1/inventory` |
| Sales / Invoices | `sale.service.js` | `sale.controller.js` | `/api/v1/sales` |

### Key features

- **Thin controllers** — request handling and responses only; no business logic
- **Service layer** — all validation, stock logic, IMEI handling, and MongoDB transactions
- **JWT auth** — register, login, logout, refresh token (httpOnly cookies + Bearer header)
- **Stock integrity** — stock never updated directly on products; only via inventory service
- **Inventory transactions** — every stock change logged (`add`, `sale`, `return`, `damage`)
- **IMEI tracking** — per-device tracking with statuses: `in_stock`, `sold`, `returned`, `defective`
- **Transaction-safe sales** — sale creation uses a single MongoDB session (rollback on failure)
- **Search & pagination** — products, suppliers, sales, and stock history
- **Invoice generation** — auto format `INV-YYYYMMDD-0001`

### Models used (existing + minimal extensions)

- `User`, `Product`, `Supplier`, `Customer`, `MobileUnit`, `InventoryTransaction`, `Sale`
- Extended `Sale` with `items[].imeiIds`, `soldBy`, timestamps
- Extended `InventoryTransaction` with `referenceId`, `referenceType`, timestamps

---

## Tech Stack

- Node.js
- Express.js 5
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- bcrypt (password hashing)
- cookie-parser, cors, dotenv

---

## Project Structure

```
backend/
├── src/
│   ├── controller/       # Thin request handlers
│   ├── services/         # Business logic
│   ├── routes/           # REST route definitions
│   ├── models/           # Mongoose schemas
│   ├── middlewares/      # Auth & error handling
│   ├── utils/            # Shared helpers
│   ├── db/               # MongoDB connection
│   ├── app.js            # Express app setup
│   └── index.js          # Server entry point
├── .env.example
├── package.json
└── README.md
```

---

## Architecture

```
Request → Route → Controller → Service → Model → Database
                      ↓
                 ApiResponse / ApiError → Error Middleware
```

**Rules enforced in code:**

1. Controllers only call services and return responses.
2. Stock changes only through `inventory.service.js` (`addStock`, `reduceStock`, `returnStock`, `recordDamage`).
3. Sales run inside one MongoDB transaction (sale doc + stock + IMEI + inventory log).
4. IMEI products add stock via mobile unit registration, not `/inventory/add`.

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
cd backend
npm install
```

### Configuration

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

### Run

```bash
# Development (with file watch)
npm run dev

# Production
npm start
```

Default port: **8000** (set via `PORT` in `.env`).

### Health check

```http
GET /api/v1/health
```

No authentication required.

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `8000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/mobile_shop_inventory` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `ACCESS_TOKEN_SECRET` | JWT access token secret | — |
| `REFRESH_TOKEN_SECRET` | JWT refresh token secret | — |
| `ACCESS_TOKEN_EXPIRY` | Access token lifetime | `15m` |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime | `7d` |

---

## API Response Format

### Success

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { }
}
```

### Error

```json
{
  "success": false,
  "message": "Error description",
  "error": "Error description"
}
```

HTTP status codes follow REST conventions (400, 401, 404, 409, 500, etc.).

---

## Authentication

Protected routes require a valid JWT.

**Option 1 — Cookie (set on login):**

- `accessToken` (httpOnly)

**Option 2 — Header:**

```http
Authorization: Bearer <access_token>
```

**Refresh token:** sent via `refreshToken` cookie or body on refresh endpoint.

---

## API Endpoints

Base URL: `http://localhost:8000`

Legend: 🔓 Public · 🔒 Requires JWT

---

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/health` | 🔓 | API health check |

---

### Auth — `/api/v1/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/register` | 🔓 | Register a new shop user |
| `POST` | `/api/v1/auth/login` | 🔓 | Login; returns access + refresh tokens |
| `POST` | `/api/v1/auth/refresh-token` | 🔓 | Refresh access token |
| `POST` | `/api/v1/auth/logout` | 🔒 | Logout; clears refresh token |

#### `POST /api/v1/auth/register`

```json
{
  "username": "shopadmin",
  "email": "admin@shop.com",
  "password": "securepass123"
}
```

#### `POST /api/v1/auth/login`

```json
{
  "email": "admin@shop.com",
  "password": "securepass123"
}
```

Or use `username` instead of `email`.

#### `POST /api/v1/auth/refresh-token`

Uses `refreshToken` cookie, or:

```json
{
  "refreshToken": "<token>"
}
```

---

### Products — `/api/v1/products`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/products` | 🔒 | Create a product |
| `GET` | `/api/v1/products` | 🔒 | List products (search, filter, pagination) |
| `GET` | `/api/v1/products/:id` | 🔒 | Get single product |
| `PATCH` | `/api/v1/products/:id` | 🔒 | Update product (not stock) |
| `DELETE` | `/api/v1/products/:id` | 🔒 | Delete product (only if stock is 0) |

#### Query params — `GET /api/v1/products`

| Param | Description |
|-------|-------------|
| `page` | Page number (default: 1) |
| `limit` | Items per page (default: 10, max: 100) |
| `search` | Search by name, brand, or category |
| `brand` | Filter by brand |
| `category` | Filter by category (`mobile`, `accessory`, `charger`, `cable`, `earphones`) |
| `hasIMEI` | `true` / `false` |

#### `POST /api/v1/products` — example body

```json
{
  "name": "iPhone 15",
  "brand": "Apple",
  "category": "mobile",
  "purchasePrice": 70000,
  "sellingPrice": 79999,
  "currentStock": 0,
  "lowStockThreshold": 2,
  "supplier": "<supplierObjectId>",
  "hasIMEI": true
}
```

> For `hasIMEI: true`, set `currentStock` to `0` and add units via `/api/v1/mobile-units`.

---

### Suppliers — `/api/v1/suppliers`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/suppliers` | 🔒 | Create supplier |
| `GET` | `/api/v1/suppliers` | 🔒 | List suppliers (search, pagination) |
| `PATCH` | `/api/v1/suppliers/:id` | 🔒 | Update supplier |
| `DELETE` | `/api/v1/suppliers/:id` | 🔒 | Delete supplier |

#### Query params — `GET /api/v1/suppliers`

| Param | Description |
|-------|-------------|
| `page`, `limit` | Pagination |
| `search` | Search by name, email, or phone |

#### `POST /api/v1/suppliers` — example body

```json
{
  "name": "Tech Distributors",
  "phone": "9876543210",
  "address": "123 Market Road",
  "email": "contact@techdist.com",
  "gstNumber": "29ABCDE1234F1Z5"
}
```

`gstNumber` is optional — omit it for wholesalers who are not GST-registered.

---

### Customers — `/api/v1/customers`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/customers` | 🔒 | Create customer |
| `GET` | `/api/v1/customers/:id/purchases` | 🔒 | Customer purchase history |

#### Query params — purchase history

| Param | Description |
|-------|-------------|
| `page`, `limit` | Pagination |

#### `POST /api/v1/customers` — example body

```json
{
  "name": "Rahul Sharma",
  "phone": "9123456789",
  "address": "45 MG Road, Bangalore"
}
```

---

### Mobile Units (IMEI) — `/api/v1/mobile-units`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/mobile-units` | 🔒 | Register IMEI units (adds stock for IMEI products) |
| `GET` | `/api/v1/mobile-units/imei/:imei` | 🔒 | Search unit by IMEI |
| `PATCH` | `/api/v1/mobile-units/:id/status` | 🔒 | Update unit status |

#### `POST /api/v1/mobile-units` — example body

```json
{
  "productId": "<productObjectId>",
  "units": [
    {
      "imei": "356789012345678",
      "color": "Black",
      "storage": 128,
      "purchaseDate": "2026-01-15"
    }
  ]
}
```

#### `PATCH /api/v1/mobile-units/:id/status` — example body

```json
{
  "status": "in_stock"
}
```

Allowed statuses: `in_stock`, `sold`, `returned`, `defective`

---

### Inventory — `/api/v1/inventory`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/inventory/add` | 🔒 | Add stock (non-IMEI products only) |
| `POST` | `/api/v1/inventory/reduce` | 🔒 | Manual stock reduction |
| `POST` | `/api/v1/inventory/return` | 🔒 | Return stock to inventory |
| `POST` | `/api/v1/inventory/damage` | 🔒 | Record damaged stock |
| `GET` | `/api/v1/inventory/history` | 🔒 | Stock transaction history |
| `GET` | `/api/v1/inventory/low-stock` | 🔒 | Products at or below low-stock threshold |

#### `POST /api/v1/inventory/add`

```json
{
  "productId": "<productObjectId>",
  "quantity": 10,
  "note": "New shipment received"
}
```

#### `POST /api/v1/inventory/reduce`

```json
{
  "productId": "<productObjectId>",
  "quantity": 2,
  "note": "Manual adjustment"
}
```

#### `POST /api/v1/inventory/return`

```json
{
  "productId": "<productObjectId>",
  "quantity": 1,
  "note": "Customer return"
}
```

#### `POST /api/v1/inventory/damage`

```json
{
  "productId": "<productObjectId>",
  "quantity": 1,
  "note": "Water damage"
}
```

#### Query params — `GET /api/v1/inventory/history`

| Param | Description |
|-------|-------------|
| `page`, `limit` | Pagination |
| `productId` | Filter by product |
| `type` | Filter by type: `add`, `sale`, `return`, `damage` |

---

### Sales — `/api/v1/sales`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/sales` | 🔒 | Create sale (transaction-safe) |
| `GET` | `/api/v1/sales` | 🔒 | Sale history |
| `GET` | `/api/v1/sales/invoice/:identifier` | 🔒 | Invoice by ID or invoice number |

#### `POST /api/v1/sales` — example body

**Non-IMEI product:**

```json
{
  "customerId": "<customerObjectId>",
  "paymentMethod": "cash",
  "items": [
    {
      "productId": "<productObjectId>",
      "quantity": 2,
      "price": 499
    }
  ]
}
```

**IMEI-tracked mobile (requires `imeiIds`):**

```json
{
  "customerId": "<customerObjectId>",
  "paymentMethod": "upi",
  "items": [
    {
      "productId": "<productObjectId>",
      "quantity": 1,
      "price": 79999,
      "imeiIds": ["<mobileUnitObjectId>"]
    }
  ]
}
```

`paymentMethod`: `cash` | `card` | `upi`

#### Query params — `GET /api/v1/sales`

| Param | Description |
|-------|-------------|
| `page`, `limit` | Pagination |
| `customerId` | Filter by customer |
| `paymentMethod` | Filter by payment method |
| `from`, `to` | Date range (ISO dates) |

#### `GET /api/v1/sales/invoice/:identifier`

- Use MongoDB `_id` **or** invoice number (e.g. `INV-20260525-0001`)

---

## Business Rules

### Stock

- Product `currentStock` cannot be updated via product PATCH.
- All stock changes go through inventory service endpoints.
- Stock cannot go negative.
- IMEI products sync stock from count of `in_stock` mobile units.

### IMEI

- Each IMEI must be unique.
- Duplicate IMEIs are rejected on registration.
- On sale, IMEI units must be `in_stock` and match item quantity.
- Sold units are marked `sold` with `sellingDate`.

### Inventory transactions

Every stock change creates a record with:

| Field | Values |
|-------|--------|
| `type` | `add`, `sale`, `return`, `damage` |
| `quantity` | Units changed |
| `previousStock` / `newStock` | Before and after values |
| `referenceId` | Linked sale ID (for sales) |

### Products

- `sellingPrice` and `purchasePrice` cannot be negative.
- Delete only allowed when stock is 0, no in-stock IMEI units, and not referenced in sales.

### Sales

- Invoice number auto-generated: `INV-YYYYMMDD-XXXX`
- `soldBy` set from authenticated user.
- Entire sale is atomic — failure rolls back all changes.

---

## Sale Transaction Flow

When `POST /api/v1/sales` is called:

```
1. Validate customer exists
2. Validate each item (stock, price, IMEI availability)
3. Start MongoDB transaction
   ├── Create Sale document
   ├── For each item:
   │   ├── reduceStock() → update product + InventoryTransaction
   │   └── If IMEI product → mark MobileUnits as sold
4. Commit transaction
   OR abort + rollback on any error
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start server with `--watch` |
| `npm start` | Start server |

---

## Recommended API Usage Order

1. Register / login (`/api/v1/auth`)
2. Create suppliers (`/api/v1/suppliers`)
3. Create products (`/api/v1/products`)
4. For mobiles: register IMEI units (`/api/v1/mobile-units`)
5. For accessories: add stock (`/api/v1/inventory/add`)
6. Create customers (`/api/v1/customers`)
7. Create sales (`/api/v1/sales`)
8. Monitor low stock (`/api/v1/inventory/low-stock`)

---

## License

ISC
