#!/bin/sh
# The entrypoint runs, in order: Drizzle migrations (using the runtime
# migrator, not drizzle-kit), the admin + default device types seed
# (idempotent, by email), then node server.js.
set -e

echo "[entrypoint] running migrations..."
node_modules/.bin/tsx scripts/migrate.ts

echo "[entrypoint] seeding admin user and default device types..."
node_modules/.bin/tsx scripts/seed-admin.ts

echo "[entrypoint] starting server..."
exec node server.js
