# ── Stage 1: Install dependencies ──────────────────────────────────────────────
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package.json files for all workspace packages (for dependency resolution)
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/contract/package.json packages/contract/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @photo-salon/web build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

# Copy the built output
COPY --from=builder /app/apps/web/.output .output

# Web app runs on port 3000
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
