#!/bin/bash
echo "=== FINAL SYSTEM TEST ==="
echo ""

# 1. Login to get fresh token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tenzing12@gmail.com","password":"mamba24"}')
  
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "✅ Token: ${TOKEN:0:50}..."
echo ""

# 2. View parking spots
echo "2. Viewing parking spots..."
curl -s http://localhost:5001/api/parking/spots | python3 -m json.tool 2>/dev/null | head -50 || curl -s http://localhost:5001/api/parking/spots
echo ""

# 3. Reserve spot #5
echo "3. Reserving spot #5..."
RESERVE_RESPONSE=$(curl -s -X POST http://localhost:5001/api/parking/reserve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"spotNumber": 5, "duration": 45}')
echo "$RESERVE_RESPONSE"
echo ""

# 4. View my reservations
echo "4. Viewing my reservations..."
curl -s -X GET http://localhost:5001/api/parking/my-reservations \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || \
curl -s -X GET http://localhost:5001/api/parking/my-reservations \
  -H "Authorization: Bearer $TOKEN"
echo ""

# 5. Test profile endpoint
echo "5. Testing profile endpoint..."
curl -s -X GET http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || \
curl -s -X GET http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "=== TEST COMPLETE ==="
