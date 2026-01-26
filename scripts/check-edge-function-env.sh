#!/bin/bash

# Check if edge function environment variables are set
# These need to be set when running: supabase functions serve send-email

echo "🔍 Checking Edge Function Environment Variables"
echo "=============================================="
echo ""

echo "Required environment variables for send-email function:"
echo "  - RESEND_API_KEY"
echo "  - FROM_EMAIL"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo ""

echo "To set them when running the edge function:"
echo ""
echo "  RESEND_API_KEY=your_key FROM_EMAIL=noreply@yourdomain.com supabase functions serve send-email --no-verify-jwt"
echo ""
echo "Or create a .env file in supabase/functions/send-email/ with:"
echo "  RESEND_API_KEY=your_key"
echo "  FROM_EMAIL=noreply@yourdomain.com"
echo ""

# Check if .env file exists
if [ -f "supabase/functions/send-email/.env" ]; then
  echo "✅ Found .env file in supabase/functions/send-email/"
  echo "Contents (hiding sensitive values):"
  grep -E "^(RESEND_API_KEY|FROM_EMAIL|SUPABASE_SERVICE_ROLE_KEY)=" supabase/functions/send-email/.env | sed 's/=.*/=***HIDDEN***/' || echo "  (file exists but may be empty)"
else
  echo "⚠️  No .env file found in supabase/functions/send-email/"
  echo "   You'll need to set environment variables when running the function"
fi

echo ""
echo "To check if the function is running, test it with:"
echo "  ./scripts/test-edge-function-directly.sh"
