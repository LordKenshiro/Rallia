#!/bin/bash

# ============================================================================
# Supabase Email Trigger Debugging Script
# ============================================================================
# Consolidated script for debugging email triggers and edge functions.
# Combines checks for vault secrets, triggers, edge functions, and HTTP logs.
#
# Usage:
#   ./scripts/supabase/debug-email-trigger.sh [--test-send]
#
# Options:
#   --test-send    Actually send a test request to the edge function
# ============================================================================

set -e

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
EDGE_FUNCTION_URL="http://127.0.0.1:54321/functions/v1/send-email"
TEST_SEND=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --test-send)
      TEST_SEND=true
      shift
      ;;
  esac
done

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━ Supabase Email Trigger Debugger ━━━${NC}\n"

# ============================================================================
# Check 1: Vault Secrets
# ============================================================================
echo -e "${YELLOW}[1/5] Checking Vault secrets...${NC}"

SECRETS=$(psql "$DB_URL" -t -c "
  SELECT 
    name || ': ' || 
    CASE 
      WHEN decrypted_secret IS NOT NULL THEN 'OK'
      ELSE 'MISSING'
    END
  FROM vault.decrypted_secrets 
  WHERE name IN ('supabase_functions_url', 'service_role_key')
  ORDER BY name;
" 2>/dev/null | grep -v "^$")

if [ -z "$SECRETS" ]; then
  echo -e "  ${RED}✗ No vault secrets found${NC}"
  echo -e "  ${DIM}→ Run: psql \$DB_URL -f scripts/supabase/setup-vault-secrets.sql${NC}"
else
  echo "$SECRETS" | while read line; do
    if [[ "$line" == *"OK"* ]]; then
      echo -e "  ${GREEN}✓${NC} $line"
    else
      echo -e "  ${RED}✗${NC} $line"
    fi
  done
fi
echo ""

# ============================================================================
# Check 2: Trigger Exists
# ============================================================================
echo -e "${YELLOW}[2/5] Checking invitation trigger...${NC}"

TRIGGER=$(psql "$DB_URL" -t -c "
  SELECT tgname
  FROM pg_trigger
  WHERE tgname = 'on_invitation_insert';
" 2>/dev/null | tr -d ' ')

if [ -z "$TRIGGER" ]; then
  echo -e "  ${RED}✗ Trigger 'on_invitation_insert' not found${NC}"
  echo -e "  ${DIM}→ Run: supabase db push${NC}"
else
  echo -e "  ${GREEN}✓${NC} Trigger 'on_invitation_insert' exists"
fi
echo ""

# ============================================================================
# Check 3: Edge Function Reachability
# ============================================================================
echo -e "${YELLOW}[3/5] Checking edge function reachability...${NC}"

if curl -s -f "$EDGE_FUNCTION_URL" -X OPTIONS > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} Edge function is reachable at $EDGE_FUNCTION_URL"
else
  echo -e "  ${RED}✗${NC} Edge function is NOT reachable"
  echo -e "  ${DIM}→ Start with: supabase functions serve send-email --no-verify-jwt${NC}"
fi
echo ""

# ============================================================================
# Check 4: Recent HTTP Requests
# ============================================================================
echo -e "${YELLOW}[4/5] Checking recent HTTP requests (last 10 minutes)...${NC}"

REQUESTS=$(psql "$DB_URL" -c "
  SELECT 
    r.id,
    resp.status_code,
    LEFT(resp.content::text, 80) as response,
    r.created
  FROM net._http_request r
  LEFT JOIN net._http_response resp ON resp.id = r.id
  WHERE r.created > NOW() - INTERVAL '10 minutes'
    AND r.url LIKE '%send-email%'
  ORDER BY r.created DESC
  LIMIT 5;
" 2>/dev/null)

if [ "$(echo "$REQUESTS" | wc -l)" -le 2 ]; then
  echo -e "  ${DIM}○ No recent HTTP requests to send-email${NC}"
else
  echo "$REQUESTS"
fi
echo ""

# ============================================================================
# Check 5: Recent Invitations
# ============================================================================
echo -e "${YELLOW}[5/5] Checking recent invitations (last hour)...${NC}"

INVITATIONS=$(psql "$DB_URL" -c "
  SELECT 
    LEFT(id::text, 8) as id,
    email,
    role,
    status,
    created_at
  FROM invitation
  WHERE created_at > NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC
  LIMIT 5;
" 2>/dev/null)

if [ "$(echo "$INVITATIONS" | wc -l)" -le 2 ]; then
  echo -e "  ${DIM}○ No recent invitations${NC}"
else
  echo "$INVITATIONS"
fi
echo ""

# ============================================================================
# Optional: Test Send
# ============================================================================
if [ "$TEST_SEND" = true ]; then
  echo -e "${CYAN}━━━ Testing Edge Function Directly ━━━${NC}\n"
  
  # Get service role key
  SERVICE_KEY=$(psql "$DB_URL" -t -c "
    SELECT decrypted_secret 
    FROM vault.decrypted_secrets 
    WHERE name = 'service_role_key' 
    LIMIT 1;
  " 2>/dev/null | tr -d ' ')

  if [ -z "$SERVICE_KEY" ]; then
    echo -e "  ${RED}✗ Service role key not found in vault${NC}"
    exit 1
  fi

  # Get test data
  INVITER_ID=$(psql "$DB_URL" -t -c "SELECT id FROM profile LIMIT 1;" 2>/dev/null | tr -d ' ')
  ORG_ID=$(psql "$DB_URL" -t -c "SELECT id FROM organization LIMIT 1;" 2>/dev/null | tr -d ' ')

  TEST_PAYLOAD=$(cat <<EOF
{
  "emailType": "invitation",
  "id": "$(uuidgen | tr '[:upper:]' '[:lower:]')",
  "email": "test-debug-$(date +%s)@example.com",
  "token": "test-token-$(date +%s)",
  "role": "organization_member",
  "inviter_id": "$INVITER_ID",
  "organization_id": "$ORG_ID",
  "expires_at": "$(date -u -v+7d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '+7 days' +%Y-%m-%dT%H:%M:%SZ)",
  "metadata": {"org_role": "staff"}
}
EOF
)

  echo "Sending test request..."
  echo ""

  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-service-key: $SERVICE_KEY" \
    -d "$TEST_PAYLOAD" \
    "$EDGE_FUNCTION_URL" 2>&1)

  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

  echo -e "HTTP Status: ${CYAN}$HTTP_STATUS${NC}"
  echo "Response:"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  echo ""

  case $HTTP_STATUS in
    200)
      echo -e "${GREEN}✓ Edge function responded successfully!${NC}"
      echo -e "${DIM}→ Check Resend dashboard for the test email${NC}"
      ;;
    401)
      echo -e "${RED}✗ Authentication failed${NC}"
      echo -e "${DIM}→ Check if service role key matches SUPABASE_SERVICE_ROLE_KEY env var${NC}"
      ;;
    500)
      echo -e "${RED}✗ Server error${NC}"
      echo -e "${DIM}→ Check edge function logs for details${NC}"
      echo -e "${DIM}→ Common issues: missing RESEND_API_KEY or FROM_EMAIL${NC}"
      ;;
    *)
      echo -e "${YELLOW}⚠ Unexpected response${NC}"
      ;;
  esac
fi

echo ""
echo -e "${CYAN}━━━ Summary ━━━${NC}"
echo ""
echo "Required env vars for edge function:"
echo -e "  ${DIM}RESEND_API_KEY=your_resend_api_key${NC}"
echo -e "  ${DIM}FROM_EMAIL=noreply@yourdomain.com${NC}"
echo ""
echo "To test with actual send:"
echo -e "  ${DIM}./scripts/supabase/debug-email-trigger.sh --test-send${NC}"
