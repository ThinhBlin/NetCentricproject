# Inventory Dashboard (Phase 1: old-system parity, no Redis)

## Run with Docker Compose (MySQL 8) or manually

### Option A: Docker Compose (MySQL 8)

```bash
docker compose up -d
```

Auto-loads `backend/db/schema.sql` then `backend/db/seed.sql` into `inventory_db`.

### Option B: Local MySQL 8

```bash
mysql -u <user> -p -e "CREATE DATABASE inventory_db_v2 CHARACTER SET utf8mb4;"
mysql -u <user> -p inventory_db_v2 < backend/db/schema.sql
mysql -u <user> -p inventory_db_v2 < backend/db/seed.sql
```

### Start Backend & Frontend

1. Edit `backend/.env` (`MYSQL_DSN`, `JWT_SECRET`, `CORS_ORIGIN`).
2. Backend: `cd backend && go mod tidy && go run ./cmd/server`
3. Frontend: `cd frontend && npm install && npm run dev`

Ctrl+C triggers a graceful shutdown (10s drain, then rate limiter, then MySQL close).

## Status (Phase 1)

- **Auth**: `POST /api/auth/login`, `POST /api/auth/register`, JWT middleware (`HS256`), role-based authorization (`ADMIN`, `MANAGER`, `STAFF`), in-memory login rate limit (10/60s per IP).
- **Dashboard**: `GET /api/dashboard/stats` (JWT) returning `dashboardStats` (`DashboardStats` shape) and the `Dashboard` page.
- **Categories**: `GET /api/categories/all`, `GET /api/categories/{id}` (JWT, read-only).
- **Products**: `GET /api/products/all`, `GET /api/products/{id}` (JWT), `PUT /api/products/update` (JWT + `ADMIN` or `MANAGER`, multipart form partial update), and the `Products` page with filtering, sorting, pagination, and edit modal.
- **Demo accounts**: `admin@gmail.com` (`ADMIN`), `manager@gmail.com` (`MANAGER`), `staff@gmail.com` (`STAFF`) — passwords come from the existing seed hashes.
