# Mini Kanban Board

A full-stack Kanban board with authentication, board sharing, role-based
access control, and drag-and-drop task management.

## Features

- **Authentication** — register / login with JWT (token-based) auth.
- **Boards, Columns, Tasks** — full CRUD for all three.
- **Collaboration** — boards have an owner and can be shared with other
  registered users as *Editor* or *Viewer*.
- **Access control** — every board-scoped request is authorized against the
  caller's board membership + role. Cross-board access is rejected.
- **Drag & drop** — reorder tasks within a column or move them across columns
  to an exact position, with stable conflict-free ordering.
- **Task details** — click any task card to edit its title, description, and
  assignee (pick from board members).
- **Dockerized** — one command brings up Postgres, API, and web.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, dnd-kit |
| Backend | NestJS 10, TypeScript, Passport (JWT) |
| Database | PostgreSQL 16 + Prisma |
| DevOps | Docker Compose |

## Repository Structure

```
.
├── backend/            # NestJS API + Prisma schema/migrations
│   ├── prisma/         # schema.prisma, migrations, seed.ts
│   └── src/
│       ├── auth/       # register/login, JWT strategy & guard
│       ├── authorization/  # board access service/guard, ordering utils
│       ├── boards/     # boards + members
│       ├── columns/    # columns
│       └── tasks/      # tasks + task-move endpoint
├── frontend/           # Next.js app
│   └── src/
│       ├── app/        # routes (login, register, boards)
│       ├── components/ # NavBar + kanban components
│       └── lib/        # api client, auth context, types
└── docker-compose.yml
```

## Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/) + Docker Compose
  (recommended), **or**
- Node.js 20+ and PostgreSQL 16 installed locally

---

## Quick Start (Docker — recommended)

```bash
# 1. Clone the repository
git clone <your-repo-url> && cd <repo>

# 2. Configure environment (JWT secret is required for production)
cp .env.example .env       # edit JWT_SECRET to a strong random value
#    generate one with:  openssl rand -hex 32

# 3. Build and run everything (migrates + seeds the DB automatically)
docker compose up --build
```

The database is created and migrated automatically on first boot, and seeded
with demo data. Then open:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api

### Demo accounts (seeded)

| Email | Password | Role |
|-------|----------|------|
| `alice@example.com` | `password123` | Board owner |
| `bob@example.com`   | `password123` | Shared editor |

---

## Manual Setup (local Node + PostgreSQL)

### 1. Database

Create a PostgreSQL database (e.g. `kanban`) or run just the DB container:

```bash
docker compose up -d db
```

### 2. Backend

```bash
cd backend
cp .env.example .env     # then edit DATABASE_URL / JWT_SECRET if needed
npm install
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed      # optional demo data
npm run start:dev        # http://localhost:3001/api
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev              # http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/kanban?schema=public` | PostgreSQL connection string |
| `JWT_SECRET` | `change-me-to-a-long-random-secret` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `PORT` | `3001` | API port |
| `CORS_ORIGIN` | `*` | Allowed CORS origin (restrict in production) |

### Frontend (`frontend/.env.local`)

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | Base URL of the backend API |

> **Security note:** always set a strong `JWT_SECRET` in production and restrict
> `CORS_ORIGIN` to your frontend origin. In production (`NODE_ENV=production`)
> the backend refuses to start if `JWT_SECRET` is missing or shorter than 32
> characters.

---

## API Reference

All endpoints are prefixed with `/api`. Authenticated routes require an
`Authorization: Bearer <token>` header.

### Auth (public)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account, returns `{ accessToken, user }` |
| POST | `/auth/login` | Login, returns `{ accessToken, user }` |

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Current user |
| GET | `/users/search?q=` | Search users (for sharing) |

### Health (public)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness/readiness probe → `{ status, database }` (503 if DB unreachable) |

### Boards

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/boards` | any | List boards you can access |
| POST | `/boards` | any | Create board (you become owner) |
| GET | `/boards/:boardId` | viewer | Full board (columns + tasks + members) |
| PATCH | `/boards/:boardId` | editor | Rename board |
| DELETE | `/boards/:boardId` | owner | Delete board |

### Members

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/boards/:boardId/members` | viewer | List members |
| POST | `/boards/:boardId/members` | owner | Add member `{ email, role }` |
| PATCH | `/boards/:boardId/members/:userId` | owner | Change `{ role }` |
| DELETE | `/boards/:boardId/members/:userId` | owner | Remove member |

### Columns

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/boards/:boardId/columns` | viewer | List columns |
| POST | `/boards/:boardId/columns` | editor | Create `{ name }` |
| PATCH | `/boards/:boardId/columns/:columnId` | editor | Rename `{ name }` |
| PATCH | `/boards/:boardId/columns/:columnId/move` | editor | Reorder `{ index }` |
| DELETE | `/boards/:boardId/columns/:columnId` | editor | Delete column |

### Tasks

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/boards/:boardId/tasks` | viewer | List tasks |
| POST | `/boards/:boardId/columns/:columnId/tasks` | editor | Create `{ title, description?, assigneeId? }` |
| PATCH | `/boards/:boardId/tasks/:taskId` | editor | Update task |
| PATCH | `/boards/:boardId/tasks/:taskId/move` | editor | Move `{ columnId, index }` |
| DELETE | `/boards/:boardId/tasks/:taskId` | editor | Delete task |

### Task movement (`/tasks/:taskId/move`)

```json
{ "columnId": "<target column id>", "index": 0 }
```

`index` is the desired **0-based position** of the task in the destination
column's final order. This works for both reordering within the same column and
moving across columns. The operation runs in a single database transaction.

---

## Design Notes

### Authorization

- A `BoardMember` row links a user to a board with a role (`OWNER` > `EDITOR`
  > `VIEWER`). Membership is the single source of truth for access.
- A global JWT guard authenticates every request; a `BoardAccessGuard` +
  `@RequireBoardRole()` decorator authorize board-scoped routes against the
  `:boardId` in the path.
- Services re-verify that foreign entities (columns, tasks) actually belong to
  the requested board, preventing IDOR/cross-board access even if an id from
  another board is supplied.

### Task ordering

Tasks (and columns) store a fractional `position`. Inserting between two
neighbors averages their positions; when the gap becomes too small to subdivide
safely, the collection is transparently rebalanced in the same transaction.
This keeps ordering stable and conflict-free under rapid rearrangement.

### Security practices

- Passwords hashed with bcrypt (10 rounds); plaintext never stored or returned.
- JWTs signed with `JWT_SECRET` and re-validated against the database on every
  request, so tokens for deleted accounts are rejected.
- Security headers (CSP, no-sniff, etc.) applied via Helmet.
- Input validated with `class-validator`, unknown fields rejected.
- SQL injection prevented via Prisma's parameterized queries.
- Rate limiting applied globally and tightened on auth endpoints (brute-force
  protection).
- In production the API refuses to start without a strong `JWT_SECRET`.
- Graceful shutdown: Prisma connections are closed on SIGTERM/SIGINT.
- Health endpoint (`/api/health`) for orchestrator probes.

---

## Building for Production

```bash
cd backend && npm run build   # outputs backend/dist
cd frontend && npm run build  # outputs frontend/.next
```

The Dockerfiles build optimized production images (NestJS compiled output and a
Next.js standalone server) that run as a non-root user.

### Production deployment checklist

1. **JWT secret** — set `JWT_SECRET` to a strong random value (≥ 32 chars); in
   production the API refuses to boot without one.
2. **CORS** — set `CORS_ORIGIN` to your frontend origin (not `*`).
3. **API URL** — set `NEXT_PUBLIC_API_URL` at *build time* to the public API
   base URL (it is inlined into the frontend bundle).
4. **Database** — the backend image runs `prisma migrate deploy` on startup;
   back up your database and use a managed Postgres for real deployments.
5. **TLS** — terminate HTTPS at a reverse proxy (e.g. Nginx/Traefik) in front
   of the frontend, since the containers serve plain HTTP.

### Deploying the frontend to Vercel (with Neon as the database)

This stack is split across **three** tiers — Vercel + Neon cover only two of
them:

| Tier | Where it runs |
|------|---------------|
| Frontend (Next.js) | **Vercel** |
| Database (PostgreSQL) | **Neon** (serverless Postgres) |
| Backend (NestJS) | a long-running host — Railway / Render / Fly.io / VPS |

The NestJS backend **cannot** run on Vercel (it is a long-running Node server
with a persistent Prisma connection pool, not a serverless function), and Neon
only hosts the *database* — it does not run your API. So the backend still
needs its own host.

**1. Frontend on Vercel**

1. Create a Vercel project pointing at this repo and set **Root Directory** to
   `frontend` (Vercel picks up `frontend/vercel.json` automatically).
2. Add the environment variable in Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_API_URL` = your backend's public base URL, e.g.
     `https://kanban-api.up.railway.app/api`
3. Deploy — Vercel auto-detects Next.js and runs `npm ci && npm run build`.

**2. Database on Neon**

1. Create a project at **neon.tech** and copy its **connection string**
   (`postgresql://user:pass@ep-….aws.neon.tech/neondb`).
2. Neon requires SSL, so the URL must include `?sslmode=require` (Neon's
   "copy" button includes it). Set it as `DATABASE_URL` on the **backend**
   host (not on Vercel).
3. Run migrations + seed once against Neon from your machine:
   ```bash
   cd backend
   DATABASE_URL="postgresql://…neon.tech/neondb?sslmode=require" npx prisma migrate deploy
   DATABASE_URL="postgresql://…neon.tech/neondb?sslmode=require" npx prisma db seed
   ```
   > Neon also offers a **pooled** connection string (avoids exhausting
   serverless connection limits). Use the regular (direct) URL for migrations
   and seeding; the pooled URL is fine for the backend's runtime
   `DATABASE_URL`.

**3. Backend on a long-running host**

Deploy the backend as a container (see "Deploying everything on Railway"
below) and point its `DATABASE_URL` at Neon. Set `CORS_ORIGIN` to your Vercel
URL and keep `JWT_SECRET` strong (≥ 32 chars).

### Deploying everything on Railway

Railway can host the **entire** stack — backend container, frontend container,
and managed PostgreSQL — in one place, which is simpler than the
Vercel + separate-backend split above.

1. **Postgres** — in Railway, add a **PostgreSQL** plugin (Database →
   PostgreSQL). Give it a name (e.g. `postgres`) and keep it private.

2. **Backend** — add a service from this repo with **Root Directory** =
   `backend` (Railway picks up `backend/railway.toml` + `Dockerfile`). Set:
   - `DATABASE_URL` = `${{postgres.DATABASE_URL}}` (Railway reference
     variable; use the actual service name)
   - `JWT_SECRET` = strong random value (≥ 32 chars, `openssl rand -hex 32`)
   - `CORS_ORIGIN` = the frontend's public URL (e.g. `https://<frontend>.up.railway.app`)
   - `NODE_ENV` is already `production` in the image, so a weak/missing
     `JWT_SECRET` will refuse to boot — set it (step above).
   - Enable **Public Networking** so it gets a `*.up.railway.app` domain.

3. **Frontend** — add a second service from this repo with **Root
   Directory** = `frontend`. Set the build-time variable:
   - `NEXT_PUBLIC_API_URL` = `https://<backend>.up.railway.app/api`
   - Enable **Public Networking** so it gets its own `*.up.railway.app` URL.

4. Migrations apply automatically when the backend container boots
   (`prisma migrate deploy` in its Dockerfile `CMD`). The demo seed does not;
   to load demo users run `railway run npx prisma db seed` once against the
   backend service, or just register an account from the UI.

Railway injects `PORT` at runtime, so both containers listen on the right port
(the backend reads `PORT` from config and the Next standalone server reads
`PORT`).

**One-click option:** `railway.template.json` at the repo root defines all
three services (Postgres + backend + frontend). Push to GitHub, then use the
**Deploy on Railway** button / template import with that file. `DATABASE_URL`
and `JWT_SECRET` are wired via reference variables; after deploy, set
`NEXT_PUBLIC_API_URL` to the backend's real public domain (it is generated at
deploy time and cannot be known up front).