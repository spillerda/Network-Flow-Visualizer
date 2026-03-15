#!/bin/sh
set -e

echo "Running prisma db push..."
npx prisma db push --accept-data-loss

# Run seed script
npx tsx prisma/seed.ts || echo "Seed skipped or failed"
echo "Migration complete."

exec "$@"
