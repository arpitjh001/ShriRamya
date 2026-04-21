#!/bin/bash

# Phase 6 Category API Test Script
# Run this script to test all category endpoints

BASE_URL="http://localhost:8080/api/v1"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OWFhYTk4MDAyOTAwNTVkNGE4NmYxMmQiLCJyb2xlIjoiYWRtaW4iLCJkZXZpY2VJZCI6InVua25vd25fZGV2aWNlIiwianRpIjoiZWFkYzFkN2MtZjE3Yy00ZGI0LThjMjQtYzU2YjM0YzI0Yzg1IiwiaWF0IjoxNzcyNzkyMTkyLCJleHAiOjE3NzI3OTkzOTJ9.CeQkF2f53EdLg0z5IiwZmqPoUSsQ80DIkdGs-Rngwkc"

echo "=============================================="
echo "PHASE 6 CATEGORY API COMPREHENSIVE TEST"
echo "=============================================="
echo ""

# Test 1: Create root category "Women"
echo "=== TEST 1: Create Root Category 'Women' ==="
WOMEN_RESPONSE=$(curl -s -X POST "$BASE_URL/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Women","slug":"women-audit","description":"Women clothing collection"}')
echo "$WOMEN_RESPONSE"
WOMEN_ID=$(echo "$WOMEN_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Women ID: $WOMEN_ID"
echo ""

# Test 2: Create subcategory "Sarees" under Women
echo "=== TEST 2: Create Subcategory 'Sarees' (parent = Women) ==="
SAREES_RESPONSE=$(curl -s -X POST "$BASE_URL/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"Sarees\",\"slug\":\"sarees-audit\",\"description\":\"Traditional sarees\",\"parent_id\":$WOMEN_ID}")
echo "$SAREES_RESPONSE"
SAREES_ID=$(echo "$SAREES_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Sarees ID: $SAREES_ID"
echo ""

# Test 3: Create another root category "Home & Lifestyle"
echo "=== TEST 3: Create Root Category 'Home & Lifestyle' ==="
HOME_RESPONSE=$(curl -s -X POST "$BASE_URL/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Home & Lifestyle","slug":"home-lifestyle-audit","description":"Home decor and lifestyle products"}')
echo "$HOME_RESPONSE"
HOME_ID=$(echo "$HOME_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Home & Lifestyle ID: $HOME_ID"
echo ""

# Test 4: Get all categories
echo "=== TEST 4: Get All Categories ==="
curl -s "$BASE_URL/categories" | head -c 500
echo "..."
echo ""

# Test 5: Get category by ID
echo "=== TEST 5: Get Category by ID ($WOMEN_ID) ==="
curl -s "$BASE_URL/categories/$WOMEN_ID"
echo ""

# Test 6: Get category by slug
echo "=== TEST 6: Get Category by Slug (women-audit) ==="
curl -s "$BASE_URL/categories/slug/women-audit"
echo ""

# Test 7: Update category
echo "=== TEST 7: Update Category 'Women' ==="
curl -s -X PUT "$BASE_URL/categories/$WOMEN_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"description":"Updated women clothing collection"}'
echo ""

# Test 8: Get products by category (should be empty initially)
echo "=== TEST 8: Get Products by Category ID ($WOMEN_ID) ==="
curl -s "$BASE_URL/categories/$WOMEN_ID/products"
echo ""

# Test 9: Assign products to categories
echo "=== TEST 9: Assign Products to Category ==="
# First, get a product ID
PRODUCT_RESPONSE=$(curl -s "$BASE_URL/products?per_page=1")
PRODUCT_ID=$(echo "$PRODUCT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Found Product ID: $PRODUCT_ID"

if [ -n "$PRODUCT_ID" ]; then
  ASSIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/products/$PRODUCT_ID/categories" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"categoryIds\":[$WOMEN_ID]}")
  echo "$ASSIGN_RESPONSE"
  
  # Test 10: Get product categories
  echo ""
  echo "=== TEST 10: Get Product Categories ==="
  curl -s "$BASE_URL/products/$PRODUCT_ID/categories"
  echo ""
fi

# Test 11: Get nested categories
echo "=== TEST 11: Get Nested Categories (tree structure) ==="
curl -s "$BASE_URL/categories" | grep -o '"children":\[[^]]*\]' | head -c 300
echo "..."
echo ""

# Test 12: Delete category (Sarees)
echo "=== TEST 12: Delete Category 'Sarees' ($SAREES_ID) ==="
curl -s -X DELETE "$BASE_URL/categories/$SAREES_ID" \
  -H "Authorization: Bearer $TOKEN"
echo ""

# Test 13: Verify deletion
echo "=== TEST 13: Verify Deletion (should be 404) ==="
curl -s -w "\nHTTP Status: %{http_code}\n" "$BASE_URL/categories/$SAREES_ID"
echo ""

# Test 14: Get products by category slug
echo "=== TEST 14: Get Products by Category Slug ==="
curl -s "$BASE_URL/products?category=women-audit" | head -c 500
echo "..."
echo ""

echo "=============================================="
echo "ALL TESTS COMPLETED"
echo "=============================================="
