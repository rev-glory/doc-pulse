# DocPulse — Docker Infrastructure

This directory contains Docker configuration for the DocPulse local development environment.

The `docker-compose.yml` at the **project root** orchestrates all infrastructure services.

---

## Services

| Service    | Image                | Port   | Purpose                                   |
| ---------- | -------------------- | ------ | ----------------------------------------- |
| `postgres` | `postgres:16-alpine` | `5432` | Primary relational data store (Prisma)    |
| `redis`    | `redis:7-alpine`     | `6379` | BullMQ job queues + LangGraph checkpoints |

> Application containers (`backend`, `worker`, `frontend`) run **outside** Docker during local development via `pnpm dev`. Only infrastructure services run here.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 4.x with Compose V2
- Copy the environment file:

```bash
cp .env.example .env
```

Review `.env` and change passwords before first use (the defaults are fine for local dev only).

---

## Quick Start

```bash
# Start all infrastructure services in the background
docker compose up -d

# Verify all services are healthy
docker compose ps
```

You should see both services with `(healthy)` status within ~30 seconds.

---

## Common Commands

### Start Services

```bash
docker compose up -d
```

### Stop Services (data persists)

```bash
docker compose down
```

### View Logs

```bash
# Stream all service logs
docker compose logs -f

# Stream logs for a specific service
docker compose logs -f postgres
docker compose logs -f redis
```

### Check Service Health

```bash
docker compose ps
```

### Inspect a Running Container

```bash
# PostgreSQL
docker exec -it docpulse-postgres psql -U docpulse -d docpulse_dev

# Redis
docker exec -it docpulse-redis redis-cli -a docpulse_dev_password
```

### Restart a Single Service

```bash
docker compose restart postgres
docker compose restart redis
```

---

## Reset Instructions

### Soft Reset (restart services, keep data)

```bash
docker compose down
docker compose up -d
```

### Hard Reset (delete all data — irreversible)

```bash
# Stop services and remove all named volumes
docker compose down -v

# Restart fresh
docker compose up -d
```

> **Warning:** `docker compose down -v` permanently deletes the PostgreSQL database and all Redis data. You will need to re-run Prisma migrations after a hard reset.

### Remove All DocPulse Docker Resources

```bash
docker compose down -v --remove-orphans
docker network rm docpulse_network
docker volume rm docpulse_postgres_data docpulse_redis_data
```

---

## Connection Details

After `docker compose up -d`, connect to services at:

**PostgreSQL**

```
Host:     localhost
Port:     5432  (or $POSTGRES_PORT)
User:     docpulse  (or $POSTGRES_USER)
Password: docpulse_dev_password  (or $POSTGRES_PASSWORD)
Database: docpulse_dev  (or $POSTGRES_DB)
URL:      postgresql://docpulse:docpulse_dev_password@localhost:5432/docpulse_dev?schema=public
```

**Redis**

```
Host:     localhost
Port:     6379  (or $REDIS_PORT)
Password: docpulse_dev_password  (or $REDIS_PASSWORD)
URL:      redis://:docpulse_dev_password@localhost:6379
```

---

## Volumes

Named Docker volumes are used so that data persists across `docker compose down` restarts:

| Volume                   | Purpose                   |
| ------------------------ | ------------------------- |
| `docpulse_postgres_data` | PostgreSQL data directory |
| `docpulse_redis_data`    | Redis RDB snapshot files  |

Volumes are **not** bind-mounted to the host filesystem and are excluded from git via `.gitignore`.

---

## Network

All services communicate over a dedicated bridge network: `docpulse_network`.

When application containers are added in the future, they will join this network using the service names `postgres` and `redis` as hostnames (no `localhost`). Update `DATABASE_URL` and `REDIS_URL` accordingly for containerized apps:

```
DATABASE_URL=postgresql://docpulse:...@postgres:5432/docpulse_dev
REDIS_URL=redis://:...@redis:6379
```

---

## Troubleshooting

### Port already in use

```bash
# Find the process using port 5432
netstat -ano | findstr :5432   # Windows
lsof -i :5432                  # macOS/Linux

# Or change the port in .env
POSTGRES_PORT=5433
REDIS_PORT=6380
```

### Service stuck in "starting" state

```bash
docker compose logs postgres
docker compose logs redis
```

Common causes:

- Wrong `POSTGRES_PASSWORD` format (avoid `@`, `#`, `$` without quoting)
- Disk space exhausted
- Existing volume from a different Postgres major version (run `docker compose down -v`)

### Resetting a corrupted volume

```bash
docker compose down -v
docker volume rm docpulse_postgres_data
docker compose up -d
```
