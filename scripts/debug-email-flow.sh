#!/bin/bash

# Comprehensive email flow debugging script
# This will help identify where the email sending process is failing

set -e

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
EDGE_FUNCTION_URL="http://127.0.0.1:54321/functions/v1/send-email"

echo "🔍 Debugging Email Flow"
echo "======================"
echo ""

# Step 1: Check if edge function is running
echo "1️⃣ Checking if edge function is running..."
if curl -s -f "$EDGE_FUNCTION_URL" -X OPTIONS > /dev/null 2>&1; then
  echo "   ✅ Edge function is reachable"
else
  echo "   ❌ Edge function is NOT reachable at $EDGE_FUNCTION_URL"
  echo "   → Start it with: supabase functions serve send-email --no-verify-jwt"
  echo ""
  exit 1
fi
echo ""

# Step 2: Get service role key
echo "2️⃣ Getting service role key from vault..."
SERVICE_KEY=$(psql "$DB_URL" -t -c "
  SELECT decrypted_secret 
  FROM vault.decrypted_secrets 
  WHERE name = 'service_role_key' 
  LIMIT 1;
" 2>/dev/null | tr -d ' ')

if [ -z "$SERVICE_KEY" ]; then
  echo "   ❌ Service role key not found in vault"
  exit 1
fi
echo "   ✅ Service role key found (length: ${#SERVICE_KEY})"
echo ""

# Step 3: Test edge function with minimal payload
echo "3️⃣ Testing edge function with test payload..."
TEST_PAYLOAD='{
  "emailType": "invitation",
  "id": "'$(uuidgen)'",
  "email": "test-debug-'$(date +%s)'@example.com",
  "token": "test-token-'$(date +%s)'",
  "role": "organization_member",
  "inviter_id": "'$(psql "$DB_URL" -t -c "SELECT id FROM profile LIMIT 1;" 2>/dev/null | tr -d ' ')'",
  "organization_id": "'$(psql "$DB_URL" -t -c "SELECT id FROM organization LIMIT 1;" 2>/dev/null | tr -d ' ')'",
  "expires_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ -d '+7 days')'",
  "metadata": {"org_role": "staff"}
}'

echo "   Payload:"
echo "$TEST_PAYLOAD" | jq . 2>/dev/null || echo "$TEST_PAYLOAD"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "$TEST_PAYLOAD" \
  "$EDGE_FUNCTION_URL" 2>&1)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "   HTTP Status: $HTTP_STATUS"
echo "   Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "   ✅ Edge function responded successfully!"
  echo "   → Check Resend dashboard for test email"
elif [ "$HTTP_STATUS" = "401" ]; then
  echo "   ❌ Authentication failed"
  echo "   → Check if service role key matches SUPABASE_SERVICE_ROLE_KEY env var"
elif [ "$HTTP_STATUS" = "400" ]; then
  echo "   ❌ Validation error"
  echo "   → Check payload structure"
elif [ "$HTTP_STATUS" = "500" ]; then
  echo "   ❌ Server error"
  echo "   → Check edge function logs for details"
  echo "   → Common issues:"
  echo "     - Missing RESEND_API_KEY environment variable"
  echo "     - Missing FROM_EMAIL environment variable"
  echo "     - Invalid Resend API key"
else
  echo "   ⚠️  Unexpected response"
fi
echo ""

# Step 4: Check recent HTTP requests from trigger
echo "4️⃣ Checking recent trigger HTTP requests..."
RECENT_REQUESTS=$(psql "$DB_URL" -c "
  SELECT 
    id,
    status_code,
    LEFT(content::text, 200) as response_preview,
    created
  FROM net._http_response
  WHERE created > NOW() - INTERVAL '10 minutes'
  ORDER BY created DESC
  LIMIT 5;
" 2>/dev/null)

if [ -n "$RECENT_REQUESTS" ] && [ "$(echo "$RECENT_REQUESTS" | wc -l)" -gt 2 ]; then
  echo "   Recent requests found:"
  echo "$RECENT_REQUESTS"
else
  echo "   ⚠️  No recent HTTP responses found"
  echo "   → This might mean requests are still pending or failed"
fi
echo ""

# Step 5: Check recent invitations
echo "5️⃣ Checking recent invitations..."
RECENT_INVITATIONS=$(psql "$DB_URL" -c "
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

if [ -n "$RECENT_INVITATIONS" ] && [ "$(echo "$RECENT_INVITATIONS" | wc -l)" -gt 2 ]; then
  echo "   Recent invitations:"
  echo "$RECENT_INVITATIONS"
else
  echo "   ℹ️  No recent invitations found"
fi
echo ""

# Step 6: Environment check
echo "6️⃣ Environment variables needed for edge function:"
echo "   Required:"
echo "     - RESEND_API_KEY (your Resend API key)"
echo "     - FROM_EMAIL (e.g., noreply@yourdomain.com)"
echo "     - SUPABASE_SERVICE_ROLE_KEY (should match vault secret)"
echo ""
echo "   To run edge function with env vars:"
echo "     RESEND_API_KEY=xxx FROM_EMAIL=xxx supabase functions serve send-email --no-verify-jwt"
echo ""

echo "✅ Debug check complete!"
echo ""
echo "Next steps:"
echo "  1. Ensure edge function is running with required env vars"
echo "  2. Check edge function terminal for error logs"
echo "  3. Check Resend dashboard for sent emails"
echo "  4. If still failing, check edge function logs for detailed errors"
