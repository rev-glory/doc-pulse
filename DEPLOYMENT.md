# DocPulse Production Deployment Guide

This guide provides step-by-step instructions for deploying DocPulse in a production-ready containerized environment using Docker and Docker Compose.

---

## Prerequisites

Before deploying, ensure the host machine has the following installed:

- **Docker Desktop** (version 25.x or higher) or **Docker Engine** on Linux
- **Docker Compose V2** (included with modern Docker Desktop)
- Basic knowledge of Docker volumes, networking, and environment configurations

---

## Step 1: Clone the Repository

Clone the project repository to your target deployment server:

```bash
git clone https://github.com/rev-glory/doc-pulse.git
cd doc-pulse
```

---

## Step 2: Configure the Environment Variables

Create and configure the production environment file:

```bash
cp .env.example .env
```

Open `.env` in a text editor and fill in the required values. Below is a categorization of the environment variables to guide you:

### 1. Database & Cache Defaults (Used by Compose and Local Run)

- **`POSTGRES_USER`**: Relational database username (default: `docpulse`).
- **`POSTGRES_PASSWORD`**: Database password. **Change this to a strong password.**
- **`POSTGRES_DB`**: Relational database name (default: `docpulse_dev`).
- **`REDIS_PASSWORD`**: Password used to secure the Redis queue broker. **Change this to a strong password.**
- **`REDIS_MAX_MEMORY`**: Maximum RAM allocated to Redis (default: `256mb`).

### 2. JWT Configuration (Security Critical)

- **`JWT_ACCESS_SECRET`**: Signature secret for authentication access tokens. Must be at least 32 characters.
- **`JWT_REFRESH_SECRET`**: Signature secret for refresh tokens. Must be at least 32 characters.
- _Note: Generate secure random secrets with:_ `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. GitHub Integration (Required)

- **`GITHUB_APP_ID`**: The unique numeric ID of your registered GitHub App.
- **`GITHUB_PRIVATE_KEY_BASE64`**: The PEM private key generated for your GitHub App, encoded in Base64 (single line).
  - _Encode your key file:_ `cat private-key.pem | base64 | tr -d '\n'`
- **`GITHUB_WEBHOOK_SECRET`**: The secret configured in your GitHub App webhook settings to sign incoming webhook events.
- **`GITHUB_CLIENT_ID`**: OAuth client ID for user dashboard authentication.
- **`GITHUB_CLIENT_SECRET`**: OAuth client secret.

### 4. Artificial Intelligence Providers (Required)

- **`DEFAULT_LLM_PROVIDER`**: Default model provider (typically `gemini`).
- **`GEMINI_API_KEY`**: Your Google AI Studio API key (Required for Gemini model).
- **`GEMINI_MODEL`**: Model string (default: `gemini-2.0-flash`).
- **`GEMINI_TEMPERATURE`**: Temperature setting (default: `0.2`).

---

## Step 3: Start with Docker Compose

Start the full stack (PostgreSQL, Redis, db-migrate, Backend, and Frontend) in detached mode:

```bash
docker compose up -d
```

### What happens on startup:

1. **`postgres`** and **`redis`** start first and initialize.
2. **`db-migrate`** runs after `postgres` is healthy. It applies all pending database schema migrations using Prisma.
3. Once **`db-migrate`** exits successfully (code 0), the NestJS **`backend`** service boots up.
4. Finally, the Next.js **`frontend`** service starts once the backend reports healthy.

To verify that the full stack is healthy:

```bash
docker compose ps
```

You should see:

- `postgres` -> `healthy`
- `redis` -> `healthy`
- `backend` -> `healthy`
- `frontend` -> `healthy`
- `db-migrate` -> `exited (0)`

---

## Step 4: Access the Application

- **Frontend Dashboard**: Open `http://localhost:3000` in your web browser.
- **Backend API Docs (Swagger)**: Open `http://localhost:3001/api` in your browser.
- **Backend Health Check**: Query `http://localhost:3001/health` using curl:
  ```bash
  curl http://localhost:3001/health
  ```

---

## Step 5: Common Operational Commands

### 1. View Logs

Stream logs for the entire stack or a specific service:

```bash
# View all container logs
docker compose logs -f

# View only the backend logs
docker compose logs -f backend
```

### 2. Run Database Migrations

If you make changes to the database schema or need to manually deploy new migrations, the `db-migrate` service will run automatically when you bring up the stack. To trigger migrations explicitly:

```bash
docker compose run --rm db-migrate
```

### 3. Stop the Application

Stop the application containers (your database and queue data remains safe in Docker named volumes):

```bash
docker compose down
```

### 4. Volume Cleanup (Full Database Reset)

To stop the application and permanently delete all database and Redis persistent data:

```bash
# WARNING: This deletes the PostgreSQL volume and Redis queue database!
docker compose down -v
```

---

## Step 6: Backup and Restore PostgreSQL

### 1. Back up Database

To back up your PostgreSQL relational database data from the host:

```bash
docker compose exec postgres pg_dump -U docpulse -d docpulse_dev > backup.sql
```

_(Ensure you substitute the default username `docpulse` and database name `docpulse_dev` if they were changed in `.env`)_

### 2. Restore Database

To restore a database backup file into the running PostgreSQL container:

```bash
# Dry run clean and restore
cat backup.sql | docker compose exec -T postgres psql -U docpulse -d docpulse_dev
```

---

## Step 7: Application Lifecycle & Updates

### 1. Rolling Restart

To perform a soft/rolling restart of application services without taking down the database or Redis:

```bash
docker compose restart backend frontend
```

### 2. View Logs

Stream log output from all services:

```bash
docker compose logs -f
```

### 3. Update Containers

To pull new updates, compile, and run the latest image builds:

```bash
# Pull latest code
git pull origin main

# Rebuild and recreate changed services only
docker compose up -d --build
```

### 4. Rebuild After Dependency Changes

If packages in `package.json` or `pnpm-lock.yaml` change, force a clean rebuild to invalidate layers:

```bash
docker compose build --no-cache
docker compose up -d
```

### 5. Prune Unused Docker Resources

To clean up dangling image layers, stopped containers, and build cache to free up disk space:

```bash
# Prune stopped containers, networks, and dangling images
docker system prune -f

# Prune BuildKit build cache
docker builder prune -f
```
