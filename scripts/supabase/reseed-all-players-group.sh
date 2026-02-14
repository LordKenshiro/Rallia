#!/bin/bash
# =============================================================================
# Reseed "All Players" group – delete if exists and recreate with all players
# =============================================================================
# Runs reseed-all-players-group.sql: deletes any existing "All Players" group
# and creates a new one with every current player as member.
#
# Usage:
#   ./scripts/supabase/reseed-all-players-group.sh
#
# Requires: local Supabase running (or set DB_URL for remote).
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/reseed-all-players-group.sql"

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Error: $SQL_FILE not found." >&2
  exit 1
fi

echo "Reseeding All Players group (DB: ${DB_URL%%@*}@...)"
psql "$DB_URL" -f "$SQL_FILE"
