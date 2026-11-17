# AGENTS.md — Inventory Dashboard (Redis Demo)

## Purpose

A small demo whose only goal is to **show Redis in use**. It is a read-only inventory dashboard behind a login. Nothing else.

**Do not add features beyond this file.** No CRUD screens, no suppliers, no warehouses, no notifications, no proposals, no audit logs. If something is not listed here, do not build it.

## Current phase: Phase 1, old-system parity, NO Redis

Redis is **deferred**. In this phase build only what the old Spring Boot backend already does, with the same behavior:

- Authentication: `POST /api/auth/login`, `POST /api/auth/register`, JWT validation.
- Authorization: roles `ADMIN` / `MANAGER` / `STAFF`, with the role read from the DB user.
- Login rate limiting: **in-memory**, exactly like the old `AuthController` (see "Login rate limiting" below).
- Dashboard: pending the old `DashboardStats` contract (see the Dashboard section).
- Graceful shutdown of the Gin server (see "Graceful shutdown" below).

Do **not** build in Phase 1: a Redis client, dependency or config; caching; a token blacklist; logout; `/auth/me`; cache headers (`X-Cache`, `X-Response-Time-Ms`); cache-stats or cache-flush endpoints; the RedisPanel; a Redis container; **any Docker artifacts (`docker-compose.yml`, `Dockerfile`s)**.

The "Redis usage" section is the Phase 2 plan, kept for later. Ignore it until Phase 2 is requested. Where it conflicts with this section, this section wins.

## Stack

| Layer | Choice |
|---|---|
| Backend | Go, **Gin**, MVC layout |
| ORM / DB | GORM + **MySQL 8** (run manually by the developer, no Docker) |
| Cache | **Redis 7**: *Phase 2, not yet. Do not add the dependency, config or containers.* |
| Auth | JWT (`github.com/golang-jwt/jwt/v5`) + bcrypt |
| Frontend | React (Vite) + Recharts, 2 pages: Login, Dashboard |

## Scope

- **Login system:** login and register only, as in the old system.
- **Dashboard:** read-only aggregates over products and transactions.
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
| `timestamp` | string | always present; local datetime, no timezone, e.g. `2026-11-16T10:15:30.123456` |

Go: one `Response` struct with `omitempty` / pointer fields. `status` and `timestamp` are never omitted. The other fields of the old class (`users`, `products`, `totalPages`, ...) are not needed in this demo.

`user` object: `id, name, email, phoneNumber, role, isActive, createdAt` (camelCase). Confirm the exact names against the old `User` entity if it is available. Datetimes use the same local ISO format as `timestamp`.

### Auth endpoints

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| `POST /api/auth/login` | `{ email, password }` | 200, `message: "User Logged in Successfully"`, plus `token`, `role`, `expirationTime`, `user` | 401 `"Invalid email or password"` (unknown email and wrong password give the same message); 401 `"Account is deactivated. Please contact an administrator."`; 429 (below) |
| `POST /api/auth/register` | `{ name, email, password, phoneNumber }` | 200, `message: "Account created successfully. You may now log in."`, `user`. Role is always `STAFF` | 400 `"Email already registered"` or validation error |

- Register: check email uniqueness before insert, hash with bcrypt (cost 10), set `is_active = true`.
- Login 429 body: `{ "status": 429, "message": "Too many login attempts. Please try again in a minute." }`.
- Passwords are bcrypt `$2a$10$...`; Go's `bcrypt.CompareHashAndPassword` verifies them as-is.

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
  display_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE products (
  id                BIGINT NOT NULL AUTO_INCREMENT,
  sku               VARCHAR(255) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  price             DECIMAL(38,2) NOT NULL DEFAULT 0,
  stock_quantity    INT NOT NULL DEFAULT 0,
  reorder_threshold INT NOT NULL DEFAULT 10,
  category_id       BIGINT DEFAULT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
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
- Keep all 7 categories (`id`, `name`, `display_order`).
- Keep all products; keep only `id, sku, name, price, stock_quantity, reorder_threshold, category_id, created_at`. Drop warehouse, image, expiry, description.
- Keep all transactions; keep only `id, product_id, user_id, transaction_type, status, total_price, total_products, description, created_at`. Drop `supplier_id`, `note`, `updated_at`.
- Drop every insert for `suppliers`, `warehouses`, `product_suppliers`, `warehouse_suppliers`, `product_warehouses`.
- Wrap in `SET FOREIGN_KEY_CHECKS = 0/1` once (the original repeats it).

## Backend structure (MVC)

```
backend/
  cmd/server/main.go   # wiring + graceful shutdown (see below)
  internal/
    config/        # env loading, MySQL client (Redis client comes in Phase 2)
    models/        # User, Category, Product, Transaction (GORM structs)
    controllers/   # AuthController, DashboardController (HTTP only, no SQL)
    services/      # AuthService, DashboardService (DB queries only in Phase 1)
    middleware/    # JWTAuth, RateLimit, RequireRole
    routes/        # route registration
  db/schema.sql
  db/seed.sql
```

Rules: controllers parse/validate/respond only; services hold business logic and talk to DB/Redis; models are plain structs. No SQL in controllers.

## Graceful shutdown (required)

Gin's `router.Run()` cannot be shut down cleanly. Do **not** use it. In `cmd/server/main.go`, wrap the Gin engine in a standard `*http.Server` and shut it down on signal.

Behavior:

- Listen for `SIGINT` and `SIGTERM` using `signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)`.
- Start `srv.ListenAndServe()` in a goroutine. Treat `http.ErrServerClosed` as a normal exit, not an error.
- When the signal arrives, call `srv.Shutdown(ctx)` with a **10 second** timeout context. This stops accepting new connections and lets in-flight requests finish.
- If the timeout expires, log it and force-close with `srv.Close()`.
- After the HTTP server has stopped, release resources **in this order**: (1) stop the rate limiter's background goroutine (cancel its context), (2) close the MySQL connection (`sqlDB, _ := gormDB.DB(); sqlDB.Close()`). In Phase 2, also close the Redis client here.
- Log clearly: `shutting down`, `server stopped`, and any shutdown error. Exit code 0 on clean shutdown, non-zero if the shutdown failed.
- Set sensible server timeouts on `http.Server`: `ReadHeaderTimeout` (5s), `ReadTimeout` (15s), `WriteTimeout` (15s), `IdleTimeout` (60s).

Sketch (adapt, do not copy blindly):

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

srv := &http.Server{Addr: ":" + cfg.Port, Handler: router, ReadHeaderTimeout: 5 * time.Second /* ... */}

go func() {
    if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
        log.Fatalf("listen: %v", err)
    }
}()

<-ctx.Done()
stop() // a second Ctrl+C now kills the process immediately
log.Println("shutting down")

shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
if err := srv.Shutdown(shutdownCtx); err != nil {
    log.Printf("forced shutdown: %v", err)
    _ = srv.Close()
}
// then: stop rate limiter goroutine, close MySQL
```

## API

Base path `/api`. Every response, errors included, uses the `Response` envelope from the compatibility section. Error statuses: 400 validation / email taken, 401 bad credentials or missing, invalid, expired or blacklisted token, 403 insufficient role, 429 rate limited.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | – | Rate limited in-memory (10 per 60s per IP). Contract in the compatibility section |
| POST | `/auth/register` | – | Creates a STAFF user |
| GET | `/dashboard/summary` | JWT | Summary cards |
| GET | `/dashboard/sales-trend` | JWT | Monthly sales vs purchases |
| GET | `/dashboard/by-category` | JWT | Stock + value per category |
| GET | `/dashboard/low-stock` | JWT | Products at or below threshold |
| GET | `/dashboard/recent` | JWT | Latest 10 transactions |

Dashboard endpoints are provisional until the old `DashboardStats` contract is provided. No cache headers, cache-stats or flush endpoints in Phase 1.

## Dashboard definitions

> **Contract pending.** The old backend returns dashboard data in `Response.dashboardStats` (a `DashboardStats` object). Its fields and endpoint path are not known yet. Do **not** build the dashboard endpoints (build step 3) until this note is replaced with the real `DashboardStats` shape. The definitions below are the intended calculations only.

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
- Implementation: a mutex-protected map of IP to attempt timestamps, plus a background goroutine that prunes empty entries hourly. The goroutine must take a `context.Context` and exit when it is cancelled, so it stops cleanly during graceful shutdown. Put it behind a small `RateLimiter` interface so Phase 2 can swap in a Redis implementation without touching controllers.

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
- Close the Redis client during graceful shutdown, after the HTTP server has stopped and before closing MySQL.

## Frontend

```
frontend/src/
  api/client.js        # fetch wrapper, attaches Bearer token
  pages/Login.jsx
  pages/Dashboard.jsx
  components/          # StatCard, SalesTrendChart, CategoryChart, LowStockTable, RecentTable
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

**No Docker.** Do not create `docker-compose.yml` or any `Dockerfile`. The developer starts everything manually and runs MySQL 8 locally. The database is created and loaded by hand:

```
mysql -u <user> -p -e "CREATE DATABASE inventory_db CHARACTER SET utf8mb4;"
mysql -u <user> -p inventory_db < backend/db/schema.sql
mysql -u <user> -p inventory_db < backend/db/seed.sql
```

## Working rules for agents

- Build in this order: (1) `db/schema.sql` + `db/seed.sql`, (2) backend auth with the in-memory rate limit and graceful shutdown (no Redis), (3) backend dashboard (blocked until the Dashboard pending note is resolved), (4) frontend, (5) README (no docker-compose).
- Make scoped, minimal changes. Do not refactor or rename things you were not asked to touch.
- Do not add dependencies beyond the stack above without a reason stated in the PR/commit message.
- Never log or return password hashes. Never hardcode secrets.
- Keep the README short. It must contain: manual run steps (create DB and load `schema.sql` then `seed.sql`, copy `.env`, `go run ./cmd/server` in `backend/`, `npm install && npm run dev` in `frontend/`), a note that Ctrl+C triggers a graceful shutdown, demo accounts (emails only; passwords come from the existing seed hashes), and (Phase 2) what each Redis feature demonstrates.
