# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# deps — install dependencies, with build tools available in case
# better-sqlite3 has no prebuilt binary for this platform.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

# ---------------------------------------------------------------------------
# builder — type-check and build the Next.js standalone output.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# drizzle-kit generate needs no live DB; the migrations folder is committed
# so `next build` never touches the database.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------------------------------------------------------------------------
# runner — slim runtime image. Copies the standalone server plus the
# migrate/seed scripts, which run via tsx before the server starts.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone server + static assets.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Migration/seed tooling: drizzle migrations, the scripts that run them,
# and their lib/* dependencies. The standalone output ships a pruned
# node_modules that doesn't include tsx (a devDependency); overlaying the
# full deps node_modules on top (Docker COPY merges directory trees) is
# simpler and more robust than hand-picking a dependency subset.
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib/db ./lib/db
COPY --from=builder /app/lib/env.ts ./lib/env.ts
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=deps /app/node_modules ./node_modules

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh \
    && mkdir -p /app/data /app/data/uploads \
    && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
