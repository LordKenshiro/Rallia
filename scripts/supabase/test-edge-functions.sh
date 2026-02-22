#!/bin/bash
# =============================================================================
# Test all Edge Functions with curl (local and/or staging)
# =============================================================================
# Usage:
#   ./scripts/supabase/test-edge-functions.sh local
#   ./scripts/supabase/test-edge-functions.sh staging
#   ./scripts/supabase/test-edge-functions.sh local staging
#
# Local:
#   LOCAL_FUNCTIONS_URL (default http://127.0.0.1:54321/functions/v1)
#   ANON_KEY - anon key for Bearer auth. Get it with:
#     supabase status  # then copy "anon key"
#     or: docker exec supabase_edge_runtime_Rallia env | grep SUPABASE_ANON_KEY
#   Run `supabase functions serve --no-verify-jwt` first.
#
# Staging:
#   STAGING_FUNCTIONS_URL - e.g. https://YOUR_PROJECT.supabase.co/functions/v1
#   STAGING_ANON_KEY      - anon key from Supabase project API settings
# =============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

LOCAL_URL="${LOCAL_FUNCTIONS_URL:-http://127.0.0.1:54321/functions/v1}"
STAGING_URL="${STAGING_FUNCTIONS_URL}"
STAGING_ANON="${STAGING_ANON_KEY}"

run_curl() {
  local name="$1"
  local url="$2"
  local body="$3"
  local auth_header="$4"

  echo -e "${YELLOW}  → $name${NC}"
  if [ -n "$auth_header" ]; then
    if [ -n "$body" ]; then
      response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $auth_header" \
        -d "$body" 2>&1)
    else
      response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $auth_header" \
        -d '{}' 2>&1)
    fi
  else
    if [ -n "$body" ]; then
      response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
        -H "Content-Type: application/json" \
        -d "$body" 2>&1)
    else
      response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
        -H "Content-Type: application/json" \
        -d '{}' 2>&1)
    fi
  fi
  code=$(echo "$response" | tail -n1)
  body_out=$(echo "$response" | sed '$d')
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    echo -e "    ${GREEN}HTTP $code${NC} ${body_out:0:120}"
  else
    echo -e "    ${RED}HTTP $code${NC} ${body_out:0:120}"
  fi
  echo ""
}

test_env() {
  local env_name="$1"
  local base_url="$2"
  local anon_key="$3"

  echo -e "${CYAN}━━━ $env_name ($base_url) ━━━${NC}"
  echo ""

  # close-matches: empty body
  run_curl "close-matches" "${base_url}/close-matches" "" "$anon_key"

  # send-feedback-reminders: empty body
  run_curl "send-feedback-reminders" "${base_url}/send-feedback-reminders" "" "$anon_key"

  # process-program-payments: empty body
  run_curl "process-program-payments" "${base_url}/process-program-payments" "" "$anon_key"

  # send-email: minimal invitation payload (may 400 if Resend not configured, but auth is tested)
  SEND_EMAIL_BODY='{"emailType":"invitation","id":"00000000-0000-0000-0000-000000000001","email":"test@example.com","token":"test-token","role":"player","inviter_id":"00000000-0000-0000-0000-000000000002","expires_at":"2030-01-01T00:00:00Z"}'
  run_curl "send-email" "${base_url}/send-email" "$SEND_EMAIL_BODY" "$anon_key"

  # send-notification: trigger-style payload (minimal)
  SEND_NOTIFICATION_BODY='{"type":"INSERT","table":"notification","record":{"id":"00000000-0000-0000-0000-000000000001","user_id":"00000000-0000-0000-0000-000000000002","type":"system","title":"Test","body":"Test"}}'
  run_curl "send-notification" "${base_url}/send-notification" "$SEND_NOTIFICATION_BODY" "$anon_key"

  echo ""
}

# Parse args
DO_LOCAL=false
DO_STAGING=false
for arg in "$@"; do
  case "$arg" in
    local)   DO_LOCAL=true ;;
    staging) DO_STAGING=true ;;
    *)
      echo "Usage: $0 [local] [staging]"
      echo "  local   - test against LOCAL_FUNCTIONS_URL (default http://127.0.0.1:54321/functions/v1)"
      echo "  staging - test against STAGING_FUNCTIONS_URL with STAGING_ANON_KEY"
      exit 1
      ;;
  esac
done

if [ "$DO_LOCAL" = false ] && [ "$DO_STAGING" = false ]; then
  echo "Usage: $0 [local] [staging]"
  echo "  Specify at least one of: local, staging"
  exit 1
fi

if [ "$DO_LOCAL" = true ]; then
  # Local: use ANON_KEY if set; else try to read from edge runtime container
  local_anon="${ANON_KEY:-}"
  if [ -z "$local_anon" ]; then
    if command -v docker >/dev/null 2>&1; then
      local_anon=$(docker exec supabase_edge_runtime_Rallia env 2>/dev/null | grep '^SUPABASE_ANON_KEY=' | cut -d= -f2- || true)
    fi
  fi
  test_env "Local" "$LOCAL_URL" "$local_anon"
fi

if [ "$DO_STAGING" = true ]; then
  if [ -z "$STAGING_URL" ]; then
    echo -e "${RED}STAGING_FUNCTIONS_URL is not set${NC}"
    exit 1
  fi
  if [ -z "$STAGING_ANON" ]; then
    echo -e "${RED}STAGING_ANON_KEY is not set${NC}"
    exit 1
  fi
  test_env "Staging" "$STAGING_URL" "$STAGING_ANON"
fi

echo -e "${GREEN}Done.${NC}"
