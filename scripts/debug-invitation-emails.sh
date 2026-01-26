#!/bin/bash

# Debug script for invitation email trigger
# This script helps identify why invitation emails might not be sending

set -e

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

echo "🔍 Debugging Invitation Email Trigger"
echo "======================================"
echo ""

# Check 1: Vault secrets
echo "1️⃣ Checking Vault secrets..."
SECRETS=$(psql "$DB_URL" -t -c "
  SELECT 
    name,
    CASE 
      WHEN decrypted_secret IS NOT NULL THEN 'OK'
      ELSE 'MISSING'
    END as status
  FROM vault.decrypted_secrets 
  WHERE name IN ('supabase_functions_url', 'service_role_key')
  ORDER BY name;
" 2>/dev/null)

if [ -z "$SECRETS" ]; then
  echo "❌ No vault secrets found. Run scripts/setup-invitation-vault-secrets.sql"
else
  echo "$SECRETS"
fi

echo ""

# Check 2: Trigger exists
echo "2️⃣ Checking if trigger exists..."
TRIGGER=$(psql "$DB_URL" -t -c "
  SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    CASE 
      WHEN tgtype & 2 = 2 THEN 'BEFORE'
      WHEN tgtype & 64 = 64 THEN 'INSTEAD OF'
      ELSE 'AFTER'
    END as timing
  FROM pg_trigger
  WHERE tgname = 'on_invitation_insert';
" 2>/dev/null)

if [ -z "$TRIGGER" ]; then
  echo "❌ Trigger not found!"
else
  echo "✅ Trigger found:"
  echo "$TRIGGER"
fi

echo ""

# Check 3: Recent invitations
echo "3️⃣ Recent invitations (last hour)..."
RECENT=$(psql "$DB_URL" -c "
  SELECT 
    id,
    email,
    organization_id,
    role,
    status,
    created_at
  FROM invitation
  WHERE created_at > NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC
  LIMIT 5;
" 2>/dev/null)

if [ -z "$RECENT" ] || [ "$(echo "$RECENT" | wc -l)" -le 2 ]; then
  echo "ℹ️  No recent invitations found"
else
  echo "$RECENT"
fi

echo ""

# Check 4: Recent HTTP requests
echo "4️⃣ Recent HTTP requests to send-email (last hour)..."
HTTP_REQUESTS=$(psql "$DB_URL" -c "
  SELECT 
    id,
    url,
    status_code,
    created,
    LEFT(error_msg, 100) as error_preview
  FROM net.http_request_queue
  WHERE created > NOW() - INTERVAL '1 hour'
    AND url LIKE '%/send-email%'
  ORDER BY created DESC
  LIMIT 5;
" 2>/dev/null)

if [ -z "$HTTP_REQUESTS" ] || [ "$(echo "$HTTP_REQUESTS" | wc -l)" -le 2 ]; then
  echo "ℹ️  No recent HTTP requests found (trigger may not be firing)"
else
  echo "$HTTP_REQUESTS"
fi

echo ""
echo "✅ Debug check complete!"
echo ""
echo "Next steps:"
echo "  - If secrets are missing: Run scripts/setup-invitation-vault-secrets.sql"
echo "  - If trigger is missing: Run supabase db push"
echo "  - Check Supabase logs: supabase functions logs send-email"
