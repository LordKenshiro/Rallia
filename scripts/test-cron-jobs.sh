#!/bin/bash

# Test script for Supabase cron jobs
# Tests cron job setup via pg_net (the actual cron mechanism)
#
# NOTE: External HTTP calls through Kong may fail with 401 because Kong
# validates JWT. However, pg_net calls from within the database bypass
# Kong's auth layer and work correctly (which is how cron jobs work).

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Supabase Cron Jobs Setup${NC}\n"

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Test 1: Check if cron jobs are scheduled
echo -e "${YELLOW}[Test 1] Checking if cron jobs are scheduled...${NC}"
RESULT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%hourly%';" 2>/dev/null | tr -d ' ')

if [ "$RESULT" -ge 2 ]; then
  echo -e "${GREEN}✓ Found $RESULT cron jobs scheduled${NC}"
  psql "$DB_URL" -c "SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname LIKE '%hourly%';" 2>/dev/null
else
  echo -e "${RED}✗ Expected 2 cron jobs, found $RESULT${NC}"
fi

echo ""

# Test 2: Check Vault secrets
echo -e "${YELLOW}[Test 2] Checking Vault secrets...${NC}"
SECRETS=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM vault.decrypted_secrets WHERE name IN ('supabase_functions_url', 'service_role_key');" 2>/dev/null | tr -d ' ')

if [ "$SECRETS" -eq 2 ]; then
  echo -e "${GREEN}✓ Both Vault secrets are configured${NC}"
else
  echo -e "${RED}✗ Missing Vault secrets (found $SECRETS of 2)${NC}"
  echo "Run these to add missing secrets:"
  echo "  SELECT vault.create_secret('<url>', 'supabase_functions_url');"
  echo "  SELECT vault.create_secret('<key>', 'service_role_key');"
fi

echo ""

# Test 3: Trigger close-matches via pg_net
echo -e "${YELLOW}[Test 3] Testing close-matches via pg_net...${NC}"
REQUEST_ID=$(psql "$DB_URL" -t -c "
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url' LIMIT 1) || '/functions/v1/close-matches',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-service-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
  ),
  body := jsonb_build_object('triggered_at', now()::text),
  timeout_milliseconds := 60000
);
" 2>/dev/null | tr -d ' ')

echo "Request ID: $REQUEST_ID"
sleep 3

RESPONSE=$(psql "$DB_URL" -t -c "SELECT status_code, content::text FROM net._http_response WHERE id = $REQUEST_ID;" 2>/dev/null)
STATUS_CODE=$(echo "$RESPONSE" | cut -d'|' -f1 | tr -d ' ')

if [ "$STATUS_CODE" = "200" ]; then
  echo -e "${GREEN}✓ close-matches returned 200 OK${NC}"
  echo "Response: $(echo "$RESPONSE" | cut -d'|' -f2)"
else
  echo -e "${RED}✗ close-matches returned $STATUS_CODE${NC}"
  echo "Response: $RESPONSE"
fi

echo ""

# Test 4: Trigger send-feedback-reminders via pg_net
echo -e "${YELLOW}[Test 4] Testing send-feedback-reminders via pg_net...${NC}"
REQUEST_ID=$(psql "$DB_URL" -t -c "
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url' LIMIT 1) || '/functions/v1/send-feedback-reminders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-service-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
  ),
  body := jsonb_build_object('triggered_at', now()::text),
  timeout_milliseconds := 60000
);
" 2>/dev/null | tr -d ' ')

echo "Request ID: $REQUEST_ID"
sleep 3

RESPONSE=$(psql "$DB_URL" -t -c "SELECT status_code, content::text FROM net._http_response WHERE id = $REQUEST_ID;" 2>/dev/null)
STATUS_CODE=$(echo "$RESPONSE" | cut -d'|' -f1 | tr -d ' ')

if [ "$STATUS_CODE" = "200" ]; then
  echo -e "${GREEN}✓ send-feedback-reminders returned 200 OK${NC}"
  echo "Response: $(echo "$RESPONSE" | cut -d'|' -f2)"
else
  echo -e "${RED}✗ send-feedback-reminders returned $STATUS_CODE${NC}"
  echo "Response: $RESPONSE"
fi

echo ""
echo -e "${GREEN}Testing complete!${NC}"
