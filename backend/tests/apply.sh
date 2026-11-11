#!/usr/bin/env bash
# Rebuilds a scratch database from the shim + migrations (+ seed). Plain PostgreSQL 15+.
set -euo pipefail
DB=${1:-wrk_test}
here="$(cd "$(dirname "$0")" && pwd)"
PSQL="${PSQL:-sudo -u postgres psql}"
$PSQL -qc "drop database if exists $DB" -c "create database $DB"
$PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f "$here/supabase-shim.sql"
for f in "$here"/../supabase/migrations/*.sql; do
  echo "-- $(basename "$f")"; $PSQL -q -v ON_ERROR_STOP=1 -d "$DB" < "$f"
done
if [ "${SEED:-0}" = 1 ] && [ -f "$here/../supabase/seed.sql" ]; then $PSQL -q -v ON_ERROR_STOP=1 -d "$DB" < "$here/../supabase/seed.sql"; fi
echo "applied to $DB"
