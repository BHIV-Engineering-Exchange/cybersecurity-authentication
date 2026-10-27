#!/bin/bash

# Test Script for Evidence Upload API
# Tests file upload, storage, hashing, and RBAC

echo "=========================================="
echo "🧪 Testing Evidence Upload API"
echo "=========================================="
echo ""

BASE_URL="http://localhost:5050"
PASSED=0
FAILED=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create test file
echo "Creating test file..."
echo "This is test evidence for fraud case CASE-2024-001" > test_evidence.txt
echo -e "${GREEN}✓${NC} Test file created: test_evidence.txt\n"

# Test 1: Health Check
echo "Test 1: Health Check"
response=$(curl -s "$BASE_URL/health")
if echo "$response" | grep -q "healthy"; then
    echo -e "${GREEN}✓ PASSED${NC} - Server is healthy\n"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Server health check failed\n"
    ((FAILED++))
fi

# Test 2: Upload Evidence as User (should succeed)
echo "Test 2: Upload Evidence as User Role"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/evidence/upload" \
  -H "x-user-role: user" \
  -F "evidenceFile=@test_evidence.txt" \
  -F "caseId=CASE-2024-TEST" \
  -F "wallet=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  -F "reporter=test@fraud.com" \
  -F "description=Test evidence upload" \
  -F "tags=test,demo" \
  -F "riskLevel=medium")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$ d')

if [ "$http_code" == "201" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Evidence uploaded successfully (201)"
    
    # Extract evidence ID for later tests
    EVIDENCE_ID=$(echo "$body" | grep -o '"evidenceId":"[^"]*' | cut -d'"' -f4)
    STORAGE_HASH=$(echo "$body" | grep -o '"storageHash":"[^"]*' | cut -d'"' -f4)
    
    echo "  Evidence ID: $EVIDENCE_ID"
    echo "  Storage Hash: ${STORAGE_HASH:0:32}..."
    
    # Verify hash length (SHA-256 should be 64 chars)
    if [ ${#STORAGE_HASH} -eq 64 ]; then
        echo -e "${GREEN}✓${NC} SHA-256 hash is correct length (64 chars)"
    else
        echo -e "${YELLOW}⚠${NC} SHA-256 hash length is ${#STORAGE_HASH} (expected 64)"
    fi
    
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Expected 201, got $http_code"
    echo "Response: $body"
    ((FAILED++))
fi
echo ""

# Test 3: Upload as Guest (should fail with 403)
echo "Test 3: Upload Evidence as Guest Role (should fail)"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/evidence/upload" \
  -H "x-user-role: guest" \
  -F "evidenceFile=@test_evidence.txt" \
  -F "caseId=CASE-2024-TEST" \
  -F "wallet=0x742d..." \
  -F "reporter=guest@fraud.com")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$ d')

if [ "$http_code" == "403" ]; then
    if echo "$body" | grep -q "Forbidden"; then
        echo -e "${GREEN}✓ PASSED${NC} - Guest correctly denied (403 Forbidden)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} - Got 403 but wrong error message"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗ FAILED${NC} - Expected 403, got $http_code"
    ((FAILED++))
fi
echo ""

# Test 4: Get Evidence by ID
if [ ! -z "$EVIDENCE_ID" ]; then
    echo "Test 4: Get Evidence by ID"
    response=$(curl -s -w "\n%{http_code}" \
      -H "x-user-role: analyst" \
      "$BASE_URL/api/evidence/$EVIDENCE_ID")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$ d')
    
    if [ "$http_code" == "200" ]; then
        if echo "$body" | grep -q "$EVIDENCE_ID"; then
            echo -e "${GREEN}✓ PASSED${NC} - Evidence retrieved successfully"
            ((PASSED++))
        else
            echo -e "${RED}✗ FAILED${NC} - Evidence ID not in response"
            ((FAILED++))
        fi
    else
        echo -e "${RED}✗ FAILED${NC} - Expected 200, got $http_code"
        ((FAILED++))
    fi
    echo ""
fi

# Test 5: Verify Evidence Integrity
if [ ! -z "$EVIDENCE_ID" ]; then
    echo "Test 5: Verify Evidence Integrity"
    response=$(curl -s -w "\n%{http_code}" \
      -H "x-user-role: investigator" \
      "$BASE_URL/api/evidence/$EVIDENCE_ID/verify")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$ d')
    
    if [ "$http_code" == "200" ]; then
        if echo "$body" | grep -q "verified"; then
            echo -e "${GREEN}✓ PASSED${NC} - Evidence integrity verified"
            ((PASSED++))
        else
            echo -e "${RED}✗ FAILED${NC} - Verification response incomplete"
            ((FAILED++))
        fi
    else
        echo -e "${RED}✗ FAILED${NC} - Expected 200, got $http_code"
        ((FAILED++))
    fi
    echo ""
fi

# Test 6: Get Evidence by Case ID
echo "Test 6: Get Evidence by Case ID"
response=$(curl -s -w "\n%{http_code}" \
  -H "x-user-role: user" \
  "$BASE_URL/api/evidence/case/CASE-2024-TEST")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$ d')

if [ "$http_code" == "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Case evidence retrieved"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Expected 200, got $http_code"
    ((FAILED++))
fi
echo ""

# Test 7: Verify File Exists Locally
echo "Test 7: Verify File Stored Locally"
if [ -d "uploads/CASE-2024-TEST" ]; then
    file_count=$(find uploads/CASE-2024-TEST -type f | wc -l)
    if [ $file_count -gt 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC} - File stored in uploads/CASE-2024-TEST/"
        echo "  Files found: $file_count"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} - No files in uploads directory"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗ FAILED${NC} - uploads/CASE-2024-TEST directory not created"
    ((FAILED++))
fi
echo ""

# Test 8: User Cannot Delete (should fail with 403)
if [ ! -z "$EVIDENCE_ID" ]; then
    echo "Test 8: User Cannot Delete Evidence"
    response=$(curl -s -w "\n%{http_code}" -X DELETE \
      -H "x-user-role: user" \
      "$BASE_URL/api/evidence/$EVIDENCE_ID")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" == "403" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - User correctly denied delete permission"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} - Expected 403, got $http_code"
        ((FAILED++))
    fi
    echo ""
fi

# Cleanup
echo "Cleaning up test file..."
rm -f test_evidence.txt
echo -e "${GREEN}✓${NC} Cleanup complete\n"

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
else
    echo -e "Failed: $FAILED"
fi
echo ""

success_rate=$((PASSED * 100 / (PASSED + FAILED)))
echo "Success Rate: $success_rate%"
echo ""

# Final result
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo -e "${GREEN}✅ Evidence Upload API is working correctly${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Import Postman collection for more tests"
    echo "  2. Check uploads/ directory for files"
    echo "  3. Query MongoDB to see evidence records"
    echo "  4. Test with frontend integration"
    exit 0
else
    echo -e "${RED}💥 Some tests failed!${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Is the server running? (npm start)"
    echo "  2. Is MongoDB connected?"
    echo "  3. Check server logs for errors"
    exit 1
fi

