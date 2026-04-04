# Photo Salon

A multi-tenant web application for photography clubs to run monthly salon competitions with digital and print submissions, blind judging, scoring, and slideshow presentations.

## Features

- **Multi-tenant** — each photography club is an organization with its own members, templates, and salons
- **Salon templates** — reusable configurations with scoring criteria, category slots, and settings
- **Monthly salons** — created from templates with snapshotted criteria and categories
- **Digital + print submissions** — members upload photos or register print entries per category
- **Blind judging** — judges score submissions without seeing member names, with per-criterion scoring and comments
- **Slideshow** — standalone projector-ready presentation with configurable reveal modes and award thresholds
- **Competition classes** — optional member classification system (e.g., Novice, Class A) with category restrictions
- **Bonus points** — configurable per-category bonus for year-end calculations (e.g., topic categories)
- **Polar billing** — subscription-based club creation with Polar.sh integration (bypassable for local dev)
- **Magic link auth** — passwordless email authentication via Better Auth

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TanStack Start/Router/Query, React 19, Tailwind CSS 4 |
| API | oRPC (contract-first typed RPC), Hono |
| Auth | Better Auth (magic link, organizations, admin) |
| Database | PostgreSQL 16, Drizzle ORM |
| Storage | S3-compatible (RustFS for local dev) |
| DI | InversifyJS |
| Billing | Polar.sh |
| Testing | Vitest, PGlite |
| Linting | oxlint, oxfmt |
| Observability | OpenTelemetry, Loki, Tempo, Prometheus, Grafana |

## Architecture

```
apps/
  server/          — Hono API server (oRPC handlers, controllers, domain services)
  web/             — TanStack Start SSR app (React frontend)

packages/
  contract/        — Shared oRPC contract definitions + Zod DTOs
  database/        — Drizzle schema, migrations
  env/             — Typed environment variable schemas (server, client, shared)
  logger/          — Pino logger configuration
  ui/              — Shared UI utilities
```

**Domain pattern:** Controller → Service → Repository → Entity

- **Entities** — immutable domain objects with `create`/`with`/`fromModel` factories
- **Repositories** — persistence boundary; `save` (upsert) and `delete` take entities, return entities
- **Services** — business logic orchestration, validation, state transitions
- **Controllers** — map between oRPC transport and domain; entities → DTOs

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for PostgreSQL, RustFS, and observability stack)

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd photo_salon
pnpm install
```

### 2. Configure environment

Copy the `.env` file and adjust if needed:

```bash
cp .env.example .env
```

Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/photo_salon` |
| `BETTER_AUTH_SECRET` | Auth secret (min 32 chars) | — |
| `EMAIL_ENABLED` | Send real emails via Postmark | `false` |
| `POLAR_ENABLED` | Require Polar subscription for club creation | `false` |
| `S3_ENDPOINT` | S3-compatible storage endpoint | `http://localhost:9000` |

### 3. Start infrastructure

```bash
pnpm db:dev:up
```

This starts PostgreSQL, RustFS (S3), and the observability stack via Docker Compose.

### 4. Run migrations

```bash
pnpm migrate
```

### 5. Start development servers

```bash
pnpm dev
```

- **Web app:** http://localhost:3000
- **API server:** http://localhost:3001
- **Grafana:** http://localhost:3002

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start both web and server in dev mode |
| `pnpm dev:web` | Start only the web app |
| `pnpm dev:server` | Start only the API server |
| `pnpm build` | Build all packages |
| `pnpm compile` | Type-check all packages |
| `pnpm lint` | Run oxlint |
| `pnpm fmt` | Run oxfmt |
| `pnpm test` | Run unit tests |
| `pnpm test:integration` | Run integration tests (PGlite) |
| `pnpm migrate` | Apply pending database migrations |
| `pnpm db:generate` | Generate a new migration from schema changes |
| `pnpm db:reset` | Drop and recreate database (destructive) |
| `pnpm db:dev:up` | Start Docker services |
| `pnpm db:dev:down` | Stop Docker services |

## Database Migrations

Migrations are SQL files in `packages/database/migrations/`. The custom migration runner tracks applied migrations in a `_migrations` table.

```bash
# Generate a migration after changing schemas
pnpm db:generate

# Apply pending migrations
pnpm migrate
```

## Testing

Integration tests use [PGlite](https://github.com/electric-sql/pglite) — an in-memory PostgreSQL that runs the real migration SQL files.

```bash
# Run all integration tests
pnpm test:integration

# Run with coverage
pnpm --filter @photo-salon/server test
```

## Polar Billing (Optional)

Set `POLAR_ENABLED=true` and configure the Polar environment variables to require a subscription for club creation. Set to `false` for free local development.

For local webhook testing:

```bash
polar login
polar listen http://localhost:3001/api/polar/webhook
```

## Salon Lifecycle

```
Draft → Open → Judging → Complete
  ↑       ↓       ↓          ↓
  └───────┘       └──────────┘
  (revert)        (revert)
```

1. **Draft** — admin configures salon settings, criteria, categories
2. **Open** — members submit photos into categories
3. **Judging** — assigned judge scores submissions blindly
4. **Complete** — scores visible to members, slideshow available

## Slideshow

Access at `/slideshow/:salonId` (standalone URL for projector display).

- **Controls:** Right arrow/Space/Click → advance, Left arrow → back, Escape → exit
- **Reveal modes:** `score_after` (image then score) or `score_alongside` (both at once)
- **Award threshold:** only submissions meeting the threshold show scores in the slideshow

## License

Private
