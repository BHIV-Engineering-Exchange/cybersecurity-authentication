#!/bin/bash

# Test script for Fraud Evidence Mock Server
# This script tests all endpoints and verifies responses

echo "=========================================="
echo "🧪 Testing Fraud Evidence Mock Server"
echo "=========================================="
echo ""

BASE_URL="http://localhost:5000"
PASSED=0
FAILED=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_code=$4
    local description=$5
    
    echo -n "Testing: $description... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$ d')
    
    if [ "$http_code" == "$expected_code" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected_code, got $http_code)"
        echo "Response: $body"
        ((FAILED++))
        return 1
    fi
}

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
for i in {1..30}; do
    if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Server is ready!"
        echo ""
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗${NC} Server failed to start after 30 seconds"
        exit 1
    fi
    sleep 1
done

# Start tests
echo "Running endpoint tests..."
echo ""

# Test 1: Health Check
test_endpoint "GET" "/health" "" "200" "Health check endpoint"

# Test 2: API Root
test_endpoint "GET" "/" "" "200" "API root information"

# Test 3: List Cases
test_endpoint "GET" "/api/cases?page=1&limit=20" "" "200" "List cases with pagination"

# Test 4: List Cases with filters
test_endpoint "GET" "/api/cases?status=in_progress&priority=high" "" "200" "List cases with filters"

# Test 5: Create Case
test_endpoint "POST" "/api/cases" '{"title":"Test Case","priority":"high","category":"financial_fraud"}' "201" "Create new case"

# Test 6: Get Case by ID
test_endpoint "GET" "/api/cases/66d4a2b8c9e1234567890abc" "" "200" "Get case by valid ID"

# Test 7: Get Case - Not Found
test_endpoint "GET" "/api/cases/notfound" "" "404" "Get case by invalid ID (should 404)"

# Test 8: Update Case
test_endpoint "PUT" "/api/cases/66d4a2b8c9e1234567890abc" '{"status":"in_progress","priority":"critical"}' "200" "Update existing case"

# Test 9: Delete Case
test_endpoint "DELETE" "/api/cases/66d4a2b8c9e1234567890abc" "" "200" "Delete case"

# Test 10: Evidence Verify
test_endpoint "GET" "/api/evidence/66d4a2b8c9e1234567890abc/verify" "" "200" "Verify evidence integrity"

# Test 11: Evidence Verify - Not Found
test_endpoint "GET" "/api/evidence/notfound/verify" "" "404" "Verify non-existent evidence (should 404)"

# Test 12: RL Predict
test_endpoint "POST" "/api/rl/predict" '{"wallet":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","features":{"transactionCount":150}}' "200" "Get RL fraud prediction"

# Test 13: RL Predict - Missing Wallet
test_endpoint "POST" "/api/rl/predict" '{"features":{"transactionCount":150}}' "400" "RL predict without wallet (should fail)"

# Test 14: RL Feedback
test_endpoint "POST" "/api/rl/feedback" '{"wallet":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","predictedRisk":0.78,"actualOutcome":"fraud_confirmed"}' "200" "Submit RL feedback"

# Test 15: RL Feedback - Missing Required Fields
test_endpoint "POST" "/api/rl/feedback" '{"wallet":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}' "400" "RL feedback without required fields (should fail)"

# Test 16: Escalate Case
test_endpoint "POST" "/api/escalate" '{"entityId":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","riskScore":0.92,"reason":"Critical fraud","urgency":"urgent"}' "200" "Escalate high-risk case"

# Test 17: Escalate - Missing Required Fields
test_endpoint "POST" "/api/escalate" '{"reason":"Critical fraud"}' "400" "Escalate without entityId (should fail)"

# Test 18: Invalid Endpoint
test_endpoint "GET" "/api/invalid" "" "404" "Invalid endpoint (should 404)"

# Summary
echo ""
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}💥 Some tests failed!${NC}"
    echo ""
    exit 1
fi

