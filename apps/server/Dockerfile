# ── Stage 1: Install dependencies ──────────────────────────────────────────────
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package.json files for all workspace packages (for dependency resolution)
COPY apps/server/package.json apps/server/package.json
COPY packages/contract/package.json packages/contract/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:22-slim AS runner

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app

# Copy everything (source + node_modules from deps stage)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Re-run install to link workspace packages
RUN pnpm install --frozen-lockfile

# Server runs on port 3001
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Run migrations then start the server
CMD ["sh", "-c", "pnpm migrate && pnpm --filter @photo-salon/server start"]
