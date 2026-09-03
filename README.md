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

# 2. (Optional) set a strong JWT secret
cp .env.example .env   # see "Environment variables" below

# 3. Build and run everything
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
> `CORS_ORIGIN` to your frontend origin.

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
- JWTs signed with `JWT_SECRET`; tokens never sent in cookies (no CSRF surface).
- Input validated with `class-validator`, unknown fields rejected.
- SQL injection prevented via Prisma's parameterized queries.

---

## Building for Production

```bash
cd backend && npm run build   # outputs backend/dist
cd frontend && npm run build  # outputs frontend/.next
```

The Dockerfiles build optimized production images (NestJS compiled output and a
Next.js standalone server).