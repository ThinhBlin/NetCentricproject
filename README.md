# Inventory Dashboard (Phase 1: auth parity, no Redis)

## Run manually

1. Create and load the DB (MySQL 8):
   ```
   mysql -u <user> -p -e "CREATE DATABASE inventory_db_v2 CHARACTER SET utf8mb4;"
   mysql -u <user> -p inventory_db_v2 < backend/db/schema.sql
   mysql -u <user> -p inventory_db_v2 < backend/db/seed.sql
   ```
2. Edit `backend/.env` (`MYSQL_DSN`, `JWT_SECRET`).
3. Backend: `cd backend && go mod tidy && go run ./cmd/server`
4. Frontend: `cd frontend && npm install && npm run dev`

Ctrl+C triggers a graceful shutdown (10s drain, then rate limiter, then MySQL close).

## Status

- Done: `POST /api/auth/login`, `POST /api/auth/register`, JWT middleware, in-memory login rate limit (10/60s per IP), graceful shutdown, Login page.
- Done: `GET /api/dashboard/stats` (JWT) returning `dashboardStats` (old `DashboardStats` shape) and the Dashboard page. `warehouseStats` holds per-category stats (no warehouses in this demo); `inventoryCost` assumes cost = 70% of price.
- Demo accounts: see the emails in the seed data (passwords come from the existing seed hashes).
