#!/bin/sh
set -e

# Wait for the DATABASE_URL to be set if not using a managed service
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is required."
  exit 1
fi

echo "Running database migrations..."
cd /app/lib/db
npx drizzle-kit push

echo "Database migrations completed. Starting application..."
cd /app
exec "$@"
