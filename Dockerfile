# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# deps — install dependencies. Everything is pure JS / prebuilt binaries
# (postgres.js needs no native build), so no compiler toolchain is required.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ---------------------------------------------------------------------------
# builder — build the Next.js standalone output.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Migrations are committed, so `next build` never touches the database and
# needs no runtime env.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------------------------------------------------------------------------
# runner — slim runtime image. `npm run build` already copied static assets and
# public/ into .next/standalone. Migrate/seed scripts run via tsx before the
# server starts. Chromium (Playwright) is installed for PDF/PNG export.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/.next/standalone ./

# Migration/seed tooling and what it imports. The standalone output ships a
# pruned node_modules without tsx (a devDependency); overlaying the full deps
# node_modules (Docker COPY merges directory trees) is simpler and more robust
# than hand-picking a dependency subset.
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=deps /app/node_modules ./node_modules

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R nextjs:nodejs /app

# Chromium + its system libraries for export (F7). Installed as root into a
# shared path before dropping privileges. Chromium cannot use its sandbox in a
# container without extra capabilities, hence EXPORT_NO_SANDBOX.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV EXPORT_NO_SANDBOX=1
RUN npx playwright install --with-deps chromium \n    && chmod -R a+rX /ms-playwright \n    && rm -rf /var/lib/apt/lists/*

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
