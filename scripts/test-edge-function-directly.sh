#!/bin/bash

# Test the edge function directly to see if it's working
# This bypasses the trigger and tests the edge function endpoint directly

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

echo "🧪 Testing Edge Function Directly"
echo "=================================="
echo ""

# Get service role key
SERVICE_KEY=$(psql "$DB_URL" -t -c "
  SELECT decrypted_secret 
  FROM vault.decrypted_secrets 
  WHERE name = 'service_role_key' 
  LIMIT 1;
" 2>/dev/null | tr -d ' ')

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ Service role key not found"
  exit 1
fi

echo "✅ Service role key found"
echo ""

# Test payload (matching what the trigger sends)
TEST_PAYLOAD=$(cat <<EOF
{
  "emailType": "invitation",
  "id": "$(uuidgen)",
  "email": "test-$(date +%s)@example.com",
  "phone": null,
  "token": "test-token-$(date +%s)",
  "role": "organization_member",
  "admin_role": null,
  "status": "pending",
  "inviter_id": "$(psql "$DB_URL" -t -c "SELECT id FROM profile LIMIT 1;" 2>/dev/null | tr -d ' ')",
  "invited_user_id": null,
  "organization_id": "$(psql "$DB_URL" -t -c "SELECT id FROM organization LIMIT 1;" 2>/dev/null | tr -d ' ')",
  "source": "manual",
  "expires_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ -d '+7 days')",
  "metadata": {"org_role": "staff"}
}
EOF
)

echo "📤 Sending test request to edge function..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "$TEST_PAYLOAD" \
  http://127.0.0.1:54321/functions/v1/send-email 2>&1)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo "Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Edge function responded successfully!"
  echo "Check Resend dashboard for the test email"
elif [ "$HTTP_STATUS" = "401" ]; then
  echo "❌ Authentication failed - check service role key"
elif [ "$HTTP_STATUS" = "500" ]; then
  echo "❌ Server error - check edge function logs"
  echo "Error details: $BODY"
else
  echo "⚠️  Unexpected response - check edge function logs"
fi
