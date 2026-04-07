#!/bin/bash

echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}')

# Extract token using grep and sed
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "✅ Login successful"
echo "   Token: ${TOKEN:0:50}..."

echo ""
echo "📝 Creating reservation..."
RESPONSE=$(curl -s -X POST http://localhost:5001/api/reservations/create-pending \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"parkingSpotId":"69bf7a4a161a9bb1ce0fc9cf","duration":60}')

# Extract reservation ID
RESERVATION_ID=$(echo "$RESPONSE" | grep -o '"reservationId":"[^"]*"' | cut -d'"' -f4)
echo "✅ Reservation created: $RESERVATION_ID"

echo ""
echo "💰 Initiating Khalti payment..."
PAYMENT_RESPONSE=$(curl -s -X POST http://localhost:5001/api/payments/khalti/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"reservationId\":\"$RESERVATION_ID\"}")

echo "📤 Payment Response:"
echo "$PAYMENT_RESPONSE"

# Check if payment_url exists
if echo "$PAYMENT_RESPONSE" | grep -q "payment_url"; then
  PAYMENT_URL=$(echo "$PAYMENT_RESPONSE" | grep -o '"payment_url":"[^"]*"' | cut -d'"' -f4)
  echo ""
  echo "✅ Payment URL: $PAYMENT_URL"
  echo ""
  echo "🔑 Test Credentials for Khalti:"
  echo "   Phone: 9800000000"
  echo "   OTP: 987654"
  echo "   PIN: 1111"
else
  echo ""
  echo "❌ Payment initiation failed"
fi
