# AGENTS.md — Inventory Dashboard (Redis Demo)

## Purpose

A small demo whose only goal is to **show Redis in use**. It is an inventory dashboard plus a product list/edit page, behind a login. Nothing else.

**Do not add features beyond this file.** No CRUD screens, no suppliers, no warehouses, no notifications, no proposals, no audit logs. If something is not listed here, do not build it.

## Current phase: Phase 1, old-system parity, NO Redis

Redis is **deferred**. In this phase build only what the old Spring Boot backend already does, with the same behavior:

- Authentication: `POST /api/auth/login`, `POST /api/auth/register`, JWT validation.
- Authorization: roles `ADMIN` / `MANAGER` / `STAFF`, with the role read from the DB user.
- Login rate limiting: **in-memory**, exactly like the old `AuthController` (see "Login rate limiting" below).
- Products: paginated list, get by id, and update (see the Products section).
- Categories: read-only list and get by id (see the Categories section).
- Dashboard: pending the old `DashboardStats` contract (see the Dashboard section).

Do **not** build in Phase 1: a Redis client, dependency or config; caching; a token blacklist; logout; `/auth/me`; cache headers (`X-Cache`, `X-Response-Time-Ms`); cache-stats or cache-flush endpoints; the RedisPanel; a Redis container in docker-compose.

The "Redis usage" section is the Phase 2 plan, kept for later. Ignore it until Phase 2 is requested. Where it conflicts with this section, this section wins.

## Stack

| Layer | Choice |
|---|---|
| Backend | Go, **Gin**, MVC layout |
| ORM / DB | GORM + **MySQL 8** |
| Cache | **Redis 7**: *Phase 2, not yet. Do not add the dependency, config or containers.* |
| Auth | JWT (`github.com/golang-jwt/jwt/v5`) + bcrypt |
| Frontend | React (Vite) + Recharts, 2 pages: Login, Dashboard |

## Scope

- **Login system:** login and register only, as in the old system.
- **Dashboard:** read-only aggregates over products and transactions.
- **Products:** paginated list and edit of existing products (see the Products section). Out of scope for now: add, delete, search endpoint, CSV export, image upload, stock notifications.
- **Categories:** read-only list and get by id, only to support the product page (see the Categories section). Out of scope: add, update, delete, toggle status, export.
- Roles (`ADMIN`, `MANAGER`, `STAFF`) exist in the DB; all roles see the same dashboard.

## Compatibility with the existing Spring Boot backend (authoritative)

The old backend is Spring Boot (`org.pdm.backend`). The React frontend must work against Gin **without changes**, and tokens issued by either backend must be accepted by the other. Where this section conflicts with anything else in this file, this section wins.

### JWT

- Algorithm **HS256**. Signing key = the raw UTF-8 bytes of the secret string (**not** base64-decoded). `JWT_SECRET` in `.env` must equal Spring's `secreteJwtString`.
- Claims: `sub` = user **email**, `iat`, `exp`. Nothing else. No `jti`, no `role` claim.
- Lifetime: 180 days (`1000*60*60*24*30*6` ms), reported to the client as `expirationTime: "6 months"`.
- Parse with an explicit allowed-method list (`HS256` only) and reject anything else.
- After verifying a token, load the user by `sub` (email) from MySQL, as the old backend does. Reject if the user is missing or `is_active = false`. The role used for authorization comes from this DB row.

### Response envelope

Every endpoint, success or error, returns this JSON object (the old `Response` class, serialized with `NON_NULL`: **omit null fields**):

| Field | Type | Notes |
|---|---|---|
| `status` | int | always present; mirrors the HTTP status |
| `message` | string | |
| `token` | string | login only |
| `role` | string | `ADMIN` / `MANAGER` / `STAFF`, login only |
| `expirationTime` | string | login only, `"6 months"` |
| `user` | object | password never included |
| `dashboardStats` | object | dashboard; fields pending (see Dashboard section) |
| `products` | array | product list |
| `product` | object | single product |
| `categories` | array | category list |
| `category` | object | single category |
| `totalElements` | number | pagination, total matching rows |
| `totalPages` | int | pagination |
| `timestamp` | string | always present; local datetime, no timezone, e.g. `2026-11-16T10:15:30.123456` |

Go: one `Response` struct with `omitempty` / pointer fields. `status` and `timestamp` are never omitted. The other fields of the old class (`users`, `suppliers`, `transactions`, ...) are not needed in this demo.

`user` object: `id, name, email, phoneNumber, role, isActive, createdAt` (camelCase). Confirm the exact names against the old `User` entity if it is available. Datetimes use the same local ISO format as `timestamp`.

### Auth endpoints

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| `POST /api/auth/login` | `{ email, password }` | 200, `message: "User Logged in Successfully"`, plus `token`, `role`, `expirationTime`, `user` | 401 `"Invalid email or password"` (unknown email and wrong password give the same message); 401 `"Account is deactivated. Please contact an administrator."`; 429 (below) |
| `POST /api/auth/register` | `{ name, email, password, phoneNumber }` | 200, `message: "Account created successfully. You may now log in."`, `user`. Role is always `STAFF` | 400 `"Email already registered"` or validation error |

- Register: check email uniqueness before insert, hash with bcrypt (cost 10), set `is_active = true`.
- Login 429 body: `{ "status": 429, "message": "Too many login attempts. Please try again in a minute." }`.
- Passwords are bcrypt `$2a$10$...`; Go's `bcrypt.CompareHashAndPassword` verifies them as-is.

### Security rules (from the old `SecurityConfig`)

- Stateless: no sessions, no cookies, CSRF disabled. The token goes in the `Authorization: Bearer <token>` header (provisional: the old `AuthFilter` was not seen).
- **Public (no token):** `POST /api/auth/login` and `POST /api/auth/register`. Every other route requires a valid token.
- Authorities are the plain role names `STAFF`, `MANAGER`, `ADMIN` (no `ROLE_` prefix), taken from the user's DB row.
- Access matrix for the endpoints in this demo:

| Endpoint | STAFF | MANAGER | ADMIN |
|---|---|---|---|
| `GET /api/products/all`, `GET /api/products/{id}` | yes | yes | yes |
| `GET /api/categories/all`, `GET /api/categories/{id}` | yes | yes | yes |
| `GET /api/dashboard/stats` | yes | yes | yes |
| `PUT /api/products/update` | no (403) | yes | yes |

- No or invalid token: HTTP 401. Authenticated but not allowed: HTTP 403. Both use the `Response` envelope. The old custom handlers (`CustomAuthenticationEntryPoint`, `CustomAccessDenialHandler`) were not seen, so the exact `message` text is unknown; use `"Unauthorized"` and `"Access denied"` for now.
- CORS: allow the origin in `CORS_ORIGIN`, methods `GET, POST, PUT, DELETE, OPTIONS`, headers `Authorization, Content-Type`.

## Database (MySQL) — 4 tables

Source of truth is `db/schema.sql`. Tables:

```sql
CREATE TABLE users (
  id         BIGINT NOT NULL AUTO_INCREMENT,
  email      VARCHAR(255) NOT NULL,
  name       VARCHAR(255) NOT NULL,
  password   VARCHAR(255) NOT NULL,            -- bcrypt hash
  phone_number VARCHAR(255) NOT NULL,
  role       ENUM('ADMIN','MANAGER','STAFF') NOT NULL DEFAULT 'STAFF',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE categories (
  id            BIGINT NOT NULL AUTO_INCREMENT,
  name          VARCHAR(255) NOT NULL,
  description   VARCHAR(500) DEFAULT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE products (
  id                BIGINT NOT NULL AUTO_INCREMENT,
  sku               VARCHAR(255) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  description       VARCHAR(255) DEFAULT NULL,
  price             DECIMAL(38,2) NOT NULL DEFAULT 0,
  stock_quantity    INT NOT NULL DEFAULT 0,
  reorder_threshold INT NOT NULL DEFAULT 10,
  category_id       BIGINT DEFAULT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_sku (sku),
  KEY idx_products_category (category_id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CHECK (stock_quantity >= 0)
);

CREATE TABLE transactions (
  id               BIGINT NOT NULL AUTO_INCREMENT,
  product_id       BIGINT DEFAULT NULL,
  user_id          BIGINT DEFAULT NULL,
  transaction_type ENUM('PURCHASE','RETURN_TO_SUPPLIER','SALE') NOT NULL,
  status           ENUM('CANCELLED','COMPLETED','PENDING','PROCESSING') NOT NULL,
  total_price      DECIMAL(38,2) NOT NULL DEFAULT 0,
  total_products   INT NOT NULL DEFAULT 0,
  description      VARCHAR(255) DEFAULT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tx_created_at (created_at),
  KEY idx_tx_type_status (transaction_type, status),
  KEY idx_tx_product (product_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL ON UPDATE CASCADE
);
```

### Seed data (`db/seed.sql`)

Derive it from the original `inventory_db_data.sql` seed. Rules:

- Keep the 3 users **with their existing bcrypt hashes** and `phone_number`. Do not invent or change passwords.
- Keep all 7 categories (`id, name, description, is_active, display_order, created_at`). Drop image and audit columns.
- Keep all products; keep only `id, sku, name, description, price, stock_quantity, reorder_threshold, category_id, created_at`. Drop warehouse, image, expiry. `updated_at` stays NULL in the seed.
- Keep all transactions; keep only `id, product_id, user_id, transaction_type, status, total_price, total_products, description, created_at`. Drop `supplier_id`, `note`, `updated_at`.
- Drop every insert for `suppliers`, `warehouses`, `product_suppliers`, `warehouse_suppliers`, `product_warehouses`.
- Wrap in `SET FOREIGN_KEY_CHECKS = 0/1` once (the original repeats it).

## Backend structure (MVC)

```
backend/
  cmd/server/main.go
  internal/
    config/        # env loading, MySQL client (Redis client comes in Phase 2)
    models/        # User, Category, Product, Transaction (GORM structs)
    controllers/   # AuthController, ProductController, CategoryController, DashboardController (HTTP only, no SQL)
    services/      # AuthService, ProductService, CategoryService, DashboardService (DB queries only in Phase 1)
    middleware/    # JWTAuth, RateLimit, RequireRole
    routes/        # route registration
  db/schema.sql
  db/seed.sql
```

Rules: controllers parse/validate/respond only; services hold business logic and talk to DB/Redis; models are plain structs. No SQL in controllers.

## API

Base path `/api`. Every response, errors included, uses the `Response` envelope from the compatibility section. Error statuses: 400 validation / email taken, 401 bad credentials or missing, invalid, expired or blacklisted token, 403 insufficient role, 429 rate limited.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | – | Rate limited in-memory (10 per 60s per IP). Contract in the compatibility section |
| POST | `/auth/register` | – | Creates a STAFF user |
| GET | `/products/all` | JWT | Paginated, filtered, sorted product list (see Products section) |
| GET | `/products/{id}` | JWT | Single product |
| PUT | `/products/update` | JWT + ADMIN or MANAGER | Partial update, form data |
| GET | `/categories/all` | JWT | Paginated category list (see Categories section) |
| GET | `/categories/{id}` | JWT | Single category |
| GET | `/dashboard/stats` | JWT (STAFF, MANAGER, ADMIN) | Returns `Response.dashboardStats`; shape pending (see Dashboard section) |

The dashboard is a **single** endpoint in the old system (path confirmed from `SecurityConfig`); do not split it into several. No cache headers, cache-stats or flush endpoints in Phase 1.

## Products (paginated list + edit)

Matches the old `ProductController` / `ProductServiceImpl`. Old behavior is authoritative; where something below says "provisional", confirm it against the old code before relying on it.

### Scope

- In: paginated list, get by id, update.
- Out for now: add, delete, `/search`, CSV export, image upload, stock notifications, `warehouseId` (no warehouses in this demo), audit columns (`createdBy` / `updatedBy`).
- **SKU is not editable.** The old update never touches it.

### Authorization

- `GET /all` and `GET /{id}`: `STAFF`, `MANAGER` or `ADMIN` (any logged-in user), confirmed from the old `SecurityConfig`.
- `PUT /update`: `ADMIN` or `MANAGER`, as in the old `@PreAuthorize("hasAnyAuthority('ADMIN','MANAGER')")`. Authority names are plain `ADMIN` / `MANAGER`, with no `ROLE_` prefix. Other roles get HTTP 403 in the `Response` envelope. To restrict editing to `ADMIN` only, change this one line.

### `GET /api/products/all`

Query parameters (note: the page-size parameter is `size`, **not** `limit`):

| Param | Default | Rules |
|---|---|---|
| `page` | `1` | 1-based; values below 1 become 1 |
| `size` | `10` | values below 1 become 1; cap at 100 (safety limit, not in the old code) |
| `sortBy` | `id` | allowed: `id`, `name`, `price`, `stock_quantity`, `created_at` (snake_case column names, as the old code expects); anything else becomes `id` |
| `sortDir` | `ASC` | `DESC` (case-insensitive) gives DESC, anything else ASC |
| `categoryId` | – | exact match |
| `minPrice`, `maxPrice` | – | inclusive bounds on `price` |
| `stockStatus` | – | `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK` (provisional rules: out = `stock_quantity = 0`; low = `0 < stock_quantity <= reorder_threshold`; in = `stock_quantity > reorder_threshold`) |
| `search` | – | max 100 chars (else 400); case-insensitive `LIKE %q%` on `name`, `sku`, `description` |
| `warehouseId` | – | accepted and ignored |

- Never interpolate `sortBy` / `sortDir` into SQL. Map them to fixed column constants. Add `id` as a tie-breaker so paging is stable. Use parameterized queries for every filter.
- `totalElements` = count with the same filters. `totalPages` = `ceil(totalElements / size)` (0 when empty).
- Success: `Response{status: 200, message: "success", products, totalElements, totalPages}`.

### `GET /api/products/{id}`

- Success: `Response{status: 200, message: "success", product}`.
- Not found: 404, `message: "Product Not Found"`.

### `PUT /api/products/update`

Form fields (`multipart/form-data` or urlencoded; the old frontend sends multipart):

| Field | Required | Applied only if |
|---|---|---|
| `productId` | yes (400 if missing) | – |
| `name` | no | not blank |
| `description` | no | not blank |
| `price` | no | `>= 0` |
| `stockQuantity` | no | `>= 0` |
| `reorderThreshold` | no | `>= 0` |
| `categoryId` | no | `> 0` and the category exists (else 404 `"Category not found"`) |

- It is a **partial update**: omitted or invalid fields leave the stored value unchanged. Invalid values (blank, negative) are silently ignored, not rejected, exactly like the old code. The frontend must validate before submitting.
- `imageFile` and `warehouseId` are accepted and ignored.
- Always set `updated_at = now` on success.
- Success: `Response{status: 200, message: "Product was successfully updated"}` (no product in the body).
- Errors: 404 `"Product not found"` (unknown `productId`), 404 `"Category not found"`, 401 without a valid token, 403 for the wrong role.

### `product` JSON (from the old `Product` model)

Every product object has exactly these camelCase fields:

`id, name, sku, price, stockQuantity, reorderThreshold, warehouseId, description, expiryDate, imageUrl, createdAt, updatedAt, isDeleted, categoryId, createdBy, updatedBy`

- The product carries only `categoryId`. There is **no** embedded category name.
- To keep the frontend contract unchanged, Gin returns **all** of these fields. The ones the demo schema dropped are constant: `warehouseId`, `expiryDate`, `imageUrl`, `createdBy`, `updatedBy` = `null`; `isDeleted` = `false`. Real values come from the DB for `id, name, sku, price, stockQuantity, reorderThreshold, description, createdAt, updatedAt, categoryId`.
- The old `Product` class has no `NON_NULL` annotation, so null fields inside a product are most likely serialized as `null`, not omitted (provisional: a global Jackson setting in the old app could change this). `Response` itself still omits its own null fields.
- Datetimes are local ISO strings without timezone, same format as `timestamp`. `price` is a JSON number.

### Frontend: `pages/Products.jsx`

- Table columns: id, sku, name, category, price, stock, reorder threshold, status badge (out / low / in stock), actions.
- Controls: search box (debounced, max 100 chars), category filter, stock-status filter, min/max price, page-size selector (10 / 20 / 50, default 10), sortable column headers for the five allowed `sortBy` fields. Changing any filter or sort resets to page 1.
- `Pagination` component: previous / next, page numbers, "page X of `totalPages`", total rows from `totalElements`.
- Edit: an Edit button on each row, shown only to `ADMIN` and `MANAGER`. It opens a form (modal or side panel) prefilled from the row, with fields `name`, `description`, `price`, `stockQuantity`, `reorderThreshold`, `categoryId`; SKU is displayed read-only. Submit sends `FormData` with `productId` to `PUT /api/products/update`, shows the returned `message`, closes the form, and refetches the **current** page with the current filters.
- Validate on the client before submit: name not blank, price `>= 0`, stock and threshold are integers `>= 0`.
- Category names, the category filter and the edit form's category select all come from `GET /api/categories/all?page=1&limit=100` (see the Categories section). Load it once when the page mounts, build an id-to-name map for the table's category column, and reuse the list for the filter and the form. Product rows carry only `categoryId`.

## Categories (read-only, supports the product page)

Matches the old `CategoryController` / `CategoryServiceImpl`. Only the two read endpoints are in scope. Out of scope: add, update, delete, toggle status, CSV export.

Authorization: `STAFF`, `MANAGER` or `ADMIN` (any logged-in user), confirmed from the old `SecurityConfig`.

### `GET /api/categories/all`

Note: here the page-size parameter is `limit`, **not** `size` (products use `size`).

| Param | Default | Rules |
|---|---|---|
| `page` | `1` | 1-based; values below 1 become 1 |
| `limit` | `10` | values below 1 become 1; cap at 100 (safety limit, not in the old code) |
| `search` | – | case-insensitive `LIKE %q%` on `name` and `description` |
| `description` | – | `LIKE` filter on `description` (provisional) |
| `status` | – | `ACTIVE` gives `is_active = true`, `INACTIVE` gives `is_active = false` (provisional) |
| `sortBy` | – | provisional whitelist: `id`, `name`, `display_order`, `created_at`; anything else or missing falls back to `display_order` |
| `sortDir` | – | `DESC` (case-insensitive) gives DESC, anything else ASC |

- Never interpolate `sortBy` / `sortDir` into SQL; map to fixed column constants and add `id` as a tie-breaker. Parameterize every filter.
- `totalElements` = count with the same filters; `totalPages` = `ceil(totalElements / limit)`.
- Success: `Response{status: 200, message: "success", categories, totalElements, totalPages}`.

### `GET /api/categories/{id}`

- Success: `Response{status: 200, message: "success", category}`.
- Not found: 404, `message: "Category Not Found"`.

### `category` JSON (from the old `Category` model)

Every category object has exactly these camelCase fields: `id, name, description, imageUrl, isActive, displayOrder, createdAt, updatedAt, createdBy, updatedBy, productIDs`.

- Real values from the DB: `id, name, description, isActive, displayOrder, createdAt`.
- Constants in this demo: `imageUrl`, `updatedAt`, `createdBy`, `updatedBy` = `null`. `productIDs` = `null` (the old list queries most likely do not populate it; provisional).
- As with products, null fields inside the object are most likely serialized as `null`, not omitted (provisional).

## Dashboard definitions

> **Contract pending.** The old backend returns dashboard data in `Response.dashboardStats` (a `DashboardStats` object). Its endpoint is `GET /api/dashboard/stats` (confirmed from the old `SecurityConfig`), but the `DashboardStats` fields are not known yet. Do **not** build the endpoint (build step 3) until this note is replaced with the real shape. The definitions below are the intended calculations only; the old shape wins where they differ.

- **Anchor date:** the seed data ends in 2026 and will look stale against the real date. Use `anchor = MAX(transactions.created_at)` instead of `NOW()` for every "this month" / "last N months" calculation.
- **Revenue:** `SUM(total_price)` where `transaction_type='SALE'` AND `status='COMPLETED'`.
- **Purchases:** same, with `transaction_type='PURCHASE'`.
- **Stock value:** `SUM(price * stock_quantity)` over products.
- **Low stock:** `stock_quantity <= reorder_threshold`, ordered by `stock_quantity` ascending.
- **Summary cards:** total products, total stock value, low-stock count, revenue in anchor month, purchases in anchor month.
- **Sales trend:** last 12 months ending at the anchor month, grouped by `DATE_FORMAT(created_at, '%Y-%m')`, with zero-filled gaps.

## Login rate limiting (Phase 1: in-memory, same as the old backend)

- Per client IP: sliding window of 60 seconds, max 10 attempts. Every attempt counts, including successful ones, and is counted before credentials are checked. The 11th attempt inside the window gets HTTP 429 with the body from the compatibility section.
- Client IP = first entry of `X-Forwarded-For` if present (trimmed), else the remote address.
- Implementation: a mutex-protected map of IP to attempt timestamps, plus a background goroutine that prunes empty entries hourly. Put it behind a small `RateLimiter` interface so Phase 2 can swap in a Redis implementation without touching controllers.

## Redis usage: PHASE 2 ONLY (do not implement yet)

Everything in this section is a future plan. It does not apply in Phase 1.

| Feature | Pattern | Key | TTL |
|---|---|---|---|
| Dashboard cache | Cache-aside, JSON value | `dash:summary`, `dash:trend`, `dash:category`, `dash:lowstock`, `dash:recent` | 60s |
| Logout / token revocation | Blacklist by SHA-256 hex of the raw token (old tokens have no `jti`) | `jwt:bl:<sha256>` | token's remaining lifetime (`exp` minus now) |
| Login rate limit | `INCR` + `EXPIRE` (set the TTL when the counter becomes 1) | `rl:login:<ip>` | 60s window; the 11th attempt in a window gets HTTP 429 |
| Cache stats | `INCR` counters | `stats:cache:hit`, `stats:cache:miss` | none |

Behavior:

- On a cache miss: query MySQL, store in Redis, increment `stats:cache:miss`, return `X-Cache: MISS`.
- On a hit: return the cached value, increment `stats:cache:hit`, return `X-Cache: HIT`.
- `JWTAuth` must reject any token whose SHA-256 hash exists as `jwt:bl:<hash>`.
- JWT format and lifetime: see the compatibility section (HS256, `sub` = email, 180 days). Do not add `jti` or `role` claims.
- Client IP for rate limiting = first entry of `X-Forwarded-For` if present, else the remote address (same as the old backend). Count every login attempt, before checking credentials. The old backend used an in-memory sliding window; a Redis fixed window is acceptable here.
- Flush endpoint deletes only `dash:*` keys (use `SCAN`, never `KEYS`).
- If Redis is down, dashboard endpoints must fall back to MySQL and still respond (`X-Cache: BYPASS`). Login rate limiting and blacklist checks fail open with a logged warning.

## Frontend

```
frontend/src/
  api/client.js        # fetch wrapper, attaches Bearer token
  pages/Login.jsx
  pages/Dashboard.jsx
  pages/Products.jsx
  components/          # StatCard, SalesTrendChart, CategoryChart, LowStockTable, RecentTable, ProductTable, ProductEditForm, Pagination
```

- Token stored in memory + `sessionStorage`. Redirect to Login on 401.
- Dashboard shows: 5 stat cards, sales trend line chart, stock-by-category bar chart, low-stock table, recent transactions table.
- The RedisPanel and the flush button are Phase 2. Do not build them yet.

## Config (`.env`)

```
PORT=8080
MYSQL_DSN=user:pass@tcp(localhost:3306)/inventory_db?parseTime=true
# Redis settings are added in Phase 2
JWT_SECRET=change-me   # must equal Spring's secreteJwtString (raw UTF-8, not base64)
CORS_ORIGIN=http://localhost:5173
```

Provide a `docker-compose.yml` with `mysql:8` (auto-loading `schema.sql` then `seed.sql` from `/docker-entrypoint-initdb.d`). No Redis container in Phase 1.

## Working rules for agents

- Build in this order: (1) `db/schema.sql` + `db/seed.sql`, (2) backend auth with the in-memory rate limit (no Redis), (3) backend dashboard (blocked until the Dashboard pending note is resolved), (4) frontend, (5) docker-compose (MySQL only) + README.
- Make scoped, minimal changes. Do not refactor or rename things you were not asked to touch.
- Do not add dependencies beyond the stack above without a reason stated in the PR/commit message.
- Never log or return password hashes. Never hardcode secrets.
- Keep the README short: how to run, demo accounts (emails only; passwords come from the existing seed hashes), and (Phase 2) what each Redis feature demonstrates.
