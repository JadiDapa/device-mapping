#!/bin/sh
# "The entrypoint runs, in order: Drizzle migrations (using the
# runtime migrator, not drizzle-kit), the admin seed if no user exists,
# then node server.js."
set -e

mkdir -p "$(dirname "${DATABASE_PATH:-/app/data/app.db}")"
mkdir -p "${UPLOAD_DIR:-/app/data/uploads}"

echo "[entrypoint] running migrations..."
node_modules/.bin/tsx scripts/migrate.ts

echo "[entrypoint] seeding admin user..."
node_modules/.bin/tsx scripts/seed-admin.ts

echo "[entrypoint] starting server..."
exec node server.js
